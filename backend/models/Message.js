const { getOne, getAll, run } = require('../config/database');

class Message {
  static create(chatId, userId, content, fileData = null) {
    const { lastInsertRowid: messageId } = run(
      `INSERT INTO messages (chat_id, user_id, content, file_url, file_type, file_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [chatId, userId, content, fileData?.url || null, fileData?.type || null, fileData?.name || null]
    );
    if (!messageId) { console.error('❌ Не удалось создать сообщение'); return null; }
    run(`UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [chatId]);
    return this.getById(messageId);
  }

  static getById(id) {
    return getOne(
      `SELECT m.*, u.username, u.avatar, m.is_read FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = $1`,
      [id]
    )
  }

  static getByChatId(chatId, limit = 50, offset = 0) {
    const messages = getAll(
      `SELECT m.*, u.username, u.avatar, m.is_read FROM messages m JOIN users u ON m.user_id = u.id WHERE m.chat_id = $1 ORDER BY m.created_at DESC LIMIT $2 OFFSET $3`,
      [chatId, limit, offset]
    );
    return messages.reverse();
  }

  static countByChatId(chatId) {
    const r = getOne(`SELECT COUNT(*) as n FROM messages WHERE chat_id = $1`, [chatId]);
    return r?.n ?? 0;
  }

  static markAsRead(chatId, userId) {
    return run(
      `UPDATE messages SET is_read = TRUE WHERE chat_id = $1 AND user_id != $2 AND is_read = FALSE`,
      [chatId, userId]
    );
  }

  static getUnreadCount(chatId, userId) {
    const result = getOne(
      `SELECT COUNT(*) as count FROM messages WHERE chat_id = $1 AND user_id != $2 AND is_read = FALSE`,
      [chatId, userId]
    );
    return result?.count || 0;
  }

  static delete(messageId) {
    return run(`DELETE FROM messages WHERE id = $1`, [messageId]);
  }
}

module.exports = Message;