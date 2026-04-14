const { getOne, getAll, run } = require('../config/database');

class Notification {
  static create(userId, actorId, type, entityId = null, entityType = null) {
    // Don't notify yourself
    if (userId === actorId) return null;
    // Deduplicate: no duplicate like/follow notifications
    if (type === 'like' || type === 'follow') {
      const exists = getOne(
        `SELECT id FROM notifications WHERE user_id=? AND actor_id=? AND type=? AND entity_id=?`,
        [userId, actorId, type, entityId]
      );
      if (exists) return exists;
    }
    const { lastInsertRowid } = run(
      `INSERT INTO notifications (user_id, actor_id, type, entity_id, entity_type)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, actorId, type, entityId, entityType]
    );
    return this.getById(lastInsertRowid);
  }

  static getById(id) {
    return getOne(
      `SELECT n.*, u.username as actor_username, u.avatar as actor_avatar
       FROM notifications n
       JOIN users u ON u.id = n.actor_id
       WHERE n.id = ?`,
      [id]
    );
  }

  static getForUser(userId, limit = 30, offset = 0) {
    return getAll(
      `SELECT n.*, u.username as actor_username, u.avatar as actor_avatar
       FROM notifications n
       JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
  }

  static getUnreadCount(userId) {
    const r = getOne(
      `SELECT COUNT(*) as n FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId]
    );
    return r?.n ?? 0;
  }

  static markAllRead(userId) {
    run(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`, [userId]);
  }

  static markRead(id, userId) {
    run(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [id, userId]);
  }
}

module.exports = Notification;
