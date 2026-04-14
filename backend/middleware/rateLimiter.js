/**
 * Rate limiting middleware
 *
 * Реализован без сторонних зависимостей — простой скользящий счётчик
 * поверх Map. Подходит для одного инстанса.
 *
 * Переход на Redis (для нескольких инстансов):
 *   Заменить Store на Redis-реализацию с INCR + EXPIRE.
 *   Интерфейс createLimiter не меняется.
 */

const DEBUG_MODE = process.env.NODE_ENV === 'development'

class InMemoryStore {
  constructor() {
    // key -> { count, resetAt }
    this._data = new Map();
  }

  /**
   * Увеличить счётчик на 1 и вернуть { count, resetAt }.
   * windowMs — длина окна в миллисекундах.
   */
  increment(key, windowMs) {
    const now = Date.now();
    const entry = this._data.get(key);

    if (!entry || now >= entry.resetAt) {
      const next = { count: 1, resetAt: now + windowMs };
      this._data.set(key, next);
      return next;
    }

    entry.count += 1;
    return entry;
  }

  // Чистим просроченные записи каждые 5 минут, чтобы Map не рос бесконечно
  startCleanup(intervalMs = 5 * 60 * 1000) {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this._data) {
        if (now >= entry.resetAt) this._data.delete(key);
      }
    }, intervalMs).unref(); // .unref() — не держит процесс живым
  }
}

const store = new InMemoryStore();
store.startCleanup();

/**
 * Создать rate limiter middleware для Express.
 *
 * @param {object} opts
 * @param {number} opts.windowMs   - Окно в мс (например 60_000 = 1 минута)
 * @param {number} opts.max        - Максимум запросов в окне
 * @param {string} [opts.message]  - Текст ошибки
 * @param {function} [opts.keyFn]  - Функция получения ключа из req (по умолчанию IP)
 */
function createLimiter({ windowMs, max, message, keyFn }) {
  const errorMessage = message || 'Слишком много запросов, попробуйте позже';
  const getKey = keyFn || ((req) => req.ip);
  
  return function rateLimitMiddleware(req, res, next) {
    const key = getKey(req);
    const { count, resetAt } = store.increment(key, windowMs);
    
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

    if (count > max) {
      res.setHeader('Retry-After', Math.ceil((resetAt - Date.now()) / 1000));
      return res.status(429).json({ error: errorMessage });
    }

    next();
  };
}

/**
 * Rate limiter для Socket.io событий.
 *
 * Использование в server.js:
 *   const { socketLimiter } = require('./middleware/rateLimiter');
 *   const msgLimiter = socketLimiter({ windowMs: 10_000, max: 20 });
 *
 *   socket.on('message:send', (data) => {
 *     if (!msgLimiter(socket.user.id)) {
 *       socket.emit('error', { message: 'Слишком много сообщений' });
 *       return;
 *     }
 *     // ... основная логика
 *   });
 */
function socketLimiter({ windowMs, max }) {
  return function check(userId) {
    const key = `socket:${userId}`;
    const { count } = store.increment(key, windowMs);
    return count <= max; // true = разрешено, false = заблокировано
  };
}

// ─── Готовые лимитеры для подключения в server.js / routes ───────────────────

/** Регистрация: 5 попыток за 15 минут с одного IP */
const registerLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: DEBUG_MODE ? 50 : 5,
  message: 'Слишком много попыток регистрации, подождите 15 минут'
});

const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: DEBUG_MODE ? 100 : 10,
  message: 'Слишком много попыток входа, подождите 15 минут'
});

/** Общий API: 200 запросов в минуту с одного IP */
const apiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 200,
  message: 'Слишком много запросов'
});

/** Загрузка файлов: 20 файлов в минуту с одного IP */
const uploadLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Слишком много загрузок файлов'
});

/**
 * WS отправка сообщений: 30 сообщений за 10 секунд на пользователя.
 * Возвращает функцию-проверку, а не middleware.
 */
const wsMessageLimiter = socketLimiter({ windowMs: 10_000, max: 30 });

/**
 * WS typing: 20 событий за 5 секунд — печатать быстрее невозможно.
 */
const wsTypingLimiter = socketLimiter({ windowMs: 5_000, max: 20 });

module.exports = {
  createLimiter,
  socketLimiter,
  registerLimiter,
  loginLimiter,
  apiLimiter,
  uploadLimiter,
  wsMessageLimiter,
  wsTypingLimiter
};
