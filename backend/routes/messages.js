const express     = require('express');
const multer      = require('multer');
const path        = require('path');
const fs          = require('fs');
const fsPromises  = require('fs/promises');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter, uploadLimiter } = require('../middleware/rateLimiter');
const { makeMimeFilter, validateUploadedFile } = require('../middleware/validateMime');
const { parsePagination, paginationMeta } = require('../middleware/paginate');
const Message = require('../models/Message');
const Chat    = require('../models/Chat');

const router = express.Router();
router.use(apiLimiter);

const ROOT_UPLOADS    = path.join(__dirname, '..', 'uploads');
const ALLOWED_MIMES   = [
  'image/jpeg','image/png','image/gif','image/webp',
  'application/pdf','application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const ALLOWED_TEXT_EXTS = ['.txt','.csv'];

const msgStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(ROOT_UPLOADS, 'messages');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const _upload = multer({
  storage: msgStorage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
  fileFilter: makeMimeFilter({ allowedMimes: ALLOWED_MIMES, allowedExts: ALLOWED_TEXT_EXTS })
});
const validateMessageFile = validateUploadedFile(ALLOWED_MIMES, ALLOWED_TEXT_EXTS);

function handleUpload(req, res, next) {
  _upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: `Ошибка загрузки: ${err.message}` });
    if (err) return res.status(400).json({ error: err.message || 'Ошибка загрузки' });
    next();
  });
}

router.get('/chat/:chatId', authMiddleware, (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit, offset } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
    const chat = Chat.getById(chatId);
    if (!chat) return res.status(404).json({ error: 'Чат не найден' });
    const members = Chat.getMembers(chatId);
    if (!members.some(m => m.id === req.user.id)) return res.status(403).json({ error: 'Доступ запрещён' });
    const messages = Message.getByChatId(chatId, limit, offset);
    const total    = Message.countByChatId(chatId);
    Message.markAsRead(chatId, req.user.id);
    res.json({ messages, meta: paginationMeta({ limit, offset, total }) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.post('/', authMiddleware, uploadLimiter, handleUpload, validateMessageFile,
  [body('content').optional({ values: 'falsy' }).trim().isLength({ max: 5000 })],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { chatId, content } = req.body;
      if (!chatId) return res.status(400).json({ error: 'chatId обязателен' });
      const chat = Chat.getById(chatId);
      if (!chat) return res.status(404).json({ error: 'Чат не найден' });
      const members = Chat.getMembers(chatId);
      if (!members.some(m => m.id === req.user.id)) return res.status(403).json({ error: 'Доступ запрещён' });
      if (!content && !req.file) return res.status(400).json({ error: 'Сообщение не может быть пустым' });
      let fileData = null;
      if (req.file) fileData = { url: `/uploads/messages/${req.file.filename}`, type: req.file.detectedMime || req.file.mimetype, name: req.file.originalname };
      const message = Message.create(chatId, req.user.id, content || null, fileData);
      message.username = req.user.username;
      message.avatar   = req.user.avatar;
      res.status(201).json({ message });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message || 'Ошибка сервера' }); }
  }
);

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const message = Message.getById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Сообщение не найдено' });
    if (message.user_id !== req.user.id) return res.status(403).json({ error: 'Можно удалить только свои сообщения' });
    if (message.file_url) {
      const filePath = path.join(ROOT_UPLOADS, 'messages', path.basename(message.file_url));
      if (fs.existsSync(filePath)) fsPromises.unlink(filePath).catch(() => {});
    }
    Message.delete(req.params.id);
    res.json({ message: 'Сообщение удалено', deletedMessageId: parseInt(req.params.id) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;
