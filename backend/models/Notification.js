const { getOne, getAll, run } = require('../config/database');

class Notification {
  static async create(userId, actorId, type, entityId = null, entityType = null) {
    if (userId === actorId) return null;
    if (type === 'like' || type === 'follow') {
      const exists = getOne(
        `SELECT id FROM notifications WHERE user_id=$1 AND actor_id=$2 AND type=$3 AND entity_id=$4`,
        [userId, actorId, type, entityId]
      );
      if (exists) return exists;
    }
    const result = await run(
      `INSERT INTO notifications (user_id, actor_id, type, entity_id, entity_type)
      VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, actorId, type, entityId, entityType]
    );
    return this.getById(result.lastInsertRowid);
  }

  static getById(id) {
    return getOne(
      `SELECT n.*, u.username as actor_username, u.avatar as actor_avatar
       FROM notifications n
       JOIN users u ON u.id = n.actor_id
       WHERE n.id = $1`,
      [id]
    );
  }

  static getForUser(userId, limit = 30, offset = 0) {
    return getAll(
      `SELECT n.*, u.username as actor_username, u.avatar as actor_avatar
       FROM notifications n
       JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }

  static getUnreadCount(userId) {
    const r = getOne(
      `SELECT COUNT(*) as n FROM notifications WHERE user_id = $1 AND is_read = $2`,
      [userId, false]
    );
    return r?.n ?? 0;
  }

  static markAllRead(userId) {
    run(`UPDATE notifications SET is_read = $1 WHERE user_id = $2 AND is_read = $3`, [true, userId, false]);
  }

  static markRead(id, userId) {
    run(`UPDATE notifications SET is_read = $1 WHERE id = $2 AND user_id = $3`, [true, id, userId]);
  }
}

module.exports = Notification;
