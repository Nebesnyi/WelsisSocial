/**
 * Хранилище онлайн-пользователей
 *
 * Сейчас: in-process Map (подходит для одного инстанса)
 * Следующий шаг: заменить тело каждого метода на Redis-команды
 * без изменений в server.js — интерфейс останется тем же.
 *
 * Переход на Redis:
 *   npm install ioredis
 *   Раскомментировать RedisAdapter ниже и убрать MapAdapter
 */

// ─── Map-адаптер (текущий) ───────────────────────────────────────────────────

class MapAdapter {
  constructor() {
    // userId (number) -> socketId (string)
    this._map = new Map();
  }

  /** Зарегистрировать пользователя при подключении */
  set(userId, socketId) {
    this._map.set(userId, socketId);
  }

  /** Удалить пользователя при отключении */
  delete(userId) {
    this._map.delete(userId);
  }

  /** Получить socketId по userId. Возвращает string | undefined */
  get(userId) {
    return this._map.get(userId);
  }

  /** Проверить, онлайн ли пользователь */
  has(userId) {
    return this._map.has(userId);
  }

  /** Список всех онлайн userId (для broadcast) */
  onlineUserIds() {
    return Array.from(this._map.keys());
  }
}

// ─── Redis-адаптер (раскомментировать когда будет Redis) ─────────────────────
//
// const Redis = require('ioredis');
// const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
// const ONLINE_TTL = 60 * 60; // 1 час — на случай если disconnect не сработал
//
// class RedisAdapter {
//   async set(userId, socketId) {
//     await redis.set(`online:${userId}`, socketId, 'EX', ONLINE_TTL);
//   }
//   async delete(userId) {
//     await redis.del(`online:${userId}`);
//   }
//   async get(userId) {
//     return redis.get(`online:${userId}`);
//   }
//   async has(userId) {
//     return (await redis.exists(`online:${userId}`)) === 1;
//   }
//   async onlineUserIds() {
//     const keys = await redis.keys('online:*');
//     return keys.map(k => parseInt(k.split(':')[1]));
//   }
// }

module.exports = new MapAdapter();
