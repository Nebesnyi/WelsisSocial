/**
 * MIME-валидация по magic bytes
 *
 * Проблема: multer получает MIME-тип из заголовка Content-Type запроса,
 * который клиент может поставить произвольным. Расширение файла тоже
 * переименовывается легко. Единственный надёжный способ — читать первые
 * байты самого файла и сверять с известными сигнатурами (magic bytes).
 *
 * Этот модуль делает именно это, без сторонних зависимостей.
 */

const fs = require('fs');

/**
 * Таблица сигнатур.
 * offset — с какого байта начинается сигнатура (обычно 0).
 * bytes  — ожидаемые байты в виде массива чисел (null = любой байт).
 * mime   — MIME-тип, которому соответствует сигнатура.
 */
const SIGNATURES = [
  // Изображения
  { mime: 'image/jpeg',    offset: 0, bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',     offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { mime: 'image/gif',     offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { mime: 'image/webp',    offset: 0, bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50] },
  // Документы
  { mime: 'application/pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  // ZIP (docx, xlsx, zip — все начинаются с PK)
  { mime: 'application/zip', offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] },
  // Текст — нет magic bytes, принимаем по расширению (см. ниже)
];

// Максимальное количество байт, которое нужно прочитать для всех сигнатур
const MAX_BYTES = Math.max(...SIGNATURES.map(s => s.offset + s.bytes.length));

/**
 * Определить MIME по magic bytes файла на диске.
 * Возвращает строку MIME или null если не распознан.
 */
function detectMimeFromFile(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(MAX_BYTES);
    const bytesRead = fs.readSync(fd, buf, 0, MAX_BYTES, 0);

    for (const sig of SIGNATURES) {
      if (bytesRead < sig.offset + sig.bytes.length) continue;

      const match = sig.bytes.every((b, i) =>
        b === null || buf[sig.offset + i] === b
      );
      if (match) return sig.mime;
    }
    return null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

/**
 * Расширения, которым разрешено быть "текстом" без magic bytes.
 * Для них мы проверяем, что файл не является бинарным (нет нулевых байт).
 */
const TEXT_EXTENSIONS = new Set(['.txt', '.csv', '.md', '.json', '.log']);

/**
 * Проверить, является ли файл безопасным текстовым (нет нулевых байт
 * в первых 512 байтах — грубая эвристика).
 */
function isLikelyText(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(512);
    const bytesRead = fs.readSync(fd, buf, 0, 512, 0);
    fs.closeSync(fd);
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0x00) return false; // нулевой байт = скорее всего бинарный
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Создать multer fileFilter с проверкой по magic bytes.
 *
 * @param {object} opts
 * @param {string[]} opts.allowedMimes  - Список разрешённых MIME-типов
 * @param {string[]} [opts.allowedExts] - Список разрешённых расширений (для текстовых файлов)
 *
 * Пример:
 *   fileFilter: makeMimeFilter({
 *     allowedMimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
 *     allowedExts: []
 *   })
 */
function makeMimeFilter({ allowedMimes, allowedExts = [] }) {
  const mimeSet = new Set(allowedMimes);
  const extSet = new Set(allowedExts.map(e => e.toLowerCase()));

  return function mimeFilter(req, file, cb) {
    // multer вызывает fileFilter ДО записи на диск, поэтому файла ещё нет.
    // Мы переопределяем destination так, чтобы файл сначала записался во
    // временную папку, а проверка шла уже после — через validateUploadedFile.
    // fileFilter здесь делает только базовую проверку расширения.
    const ext = require('path').extname(file.originalname).toLowerCase();

    // Разрешаем текстовые расширения отдельно — у них нет magic bytes
    if (extSet.has(ext) && TEXT_EXTENSIONS.has(ext)) {
      return cb(null, true);
    }

    // Все остальные — пускаем через magic bytes валидацию после записи
    // Grubaya проверка MIME из заголовка: если явно неправильный — сразу отклоняем
    const claimedMime = file.mimetype.split(';')[0].trim();
    if (!mimeSet.has(claimedMime) && !extSet.has(ext)) {
      return cb(new Error(`Неподдерживаемый тип файла: ${claimedMime}`));
    }

    cb(null, true);
  };
}

/**
 * Express middleware для проверки уже загруженного файла по magic bytes.
 * Вставляется ПОСЛЕ multer middleware в цепочке.
 *
 * Если файл не прошёл проверку — удаляет его с диска и возвращает 400.
 *
 * @param {string[]} allowedMimes - Список разрешённых MIME-типов
 * @param {string[]} [allowedExts] - Расширения текстовых файлов (без magic bytes)
 */
function validateUploadedFile(allowedMimes, allowedExts = []) {
  const mimeSet = new Set(allowedMimes);
  const extSet = new Set(allowedExts.map(e => e.toLowerCase()));
  const path = require('path');

  return function validateMimeMiddleware(req, res, next) {
    if (!req.file) return next(); // файла нет — ничего не проверяем

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    // Текстовые файлы: нет magic bytes, проверяем эвристикой
    if (extSet.has(ext) && TEXT_EXTENSIONS.has(ext)) {
      if (isLikelyText(filePath)) return next();
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Файл повреждён или не является текстовым' });
    }

    // Всё остальное: magic bytes
    const detectedMime = detectMimeFromFile(filePath);

    // DOCX/XLSX — это ZIP, но мы принимаем оба MIME
    const effectiveMime = detectedMime === 'application/zip'
      ? (mimeSet.has('application/zip') || mimeSet.has('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
          ? detectedMime
          : null)
      : detectedMime;

    if (!effectiveMime || !mimeSet.has(effectiveMime) && effectiveMime !== 'application/zip') {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        error: `Недопустимый тип файла. Определён: ${detectedMime || 'неизвестен'}`
      });
    }

    // Перезаписываем mimetype реально определённым значением
    req.file.detectedMime = detectedMime;
    next();
  };
}

module.exports = { makeMimeFilter, validateUploadedFile, detectMimeFromFile };
