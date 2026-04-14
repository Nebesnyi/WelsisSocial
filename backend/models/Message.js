const { getOne, getAll, run } = require('../config/database');

class Message {
  static create(chatId, userId, content, fileData = null) {
    const { lastInsertRowid: messageId } = run(
      `INSERT INTO messages (chat_id, user_id, content, file_url, file_type, file_name) VALUES (?, ?, ?, ?, ?, ?)`,
      [chatId, userId, content, fileData?.url || null, fileData?.type || null, fileData?.name || null]
    );
    if (!messageId) { console.error('❌ Не удалось создать сообщение'); return null; }
    run(`UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [chatId]);
    return this.getById(messageId);
  }

  static getById(id) {
    return getOne(
      `SELECT m.*, u.username, u.avatar, m.is_read FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?`,
      [id]
    )
  }

  static getByChatId(chatId, limit = 50, offset = 0) {
    const messages = getAll(
      `SELECT m.*, u.username, u.avatar, m.is_read FROM messages m JOIN users u ON m.user_id = u.id WHERE m.chat_id = ? ORDER BY m.created_at DESC LIMIT ? OFFSET ?`,
      [chatId, limit, offset]
    );
    return messages.reverse();
  }

  static countByChatId(chatId) {
    const r = getOne(`SELECT COUNT(*) as n FROM messages WHERE chat_id = ?`, [chatId]);
    return r?.n ?? 0;
  }

  static markAsRead(chatId, userId) {
    return run(
      `UPDATE messages SET is_read = 1 WHERE chat_id = ? AND user_id != ? AND is_read = 0`,
      [chatId, userId]
    );
  }

  static getUnreadCount(chatId, userId) {
    const result = getOne(
      `SELECT COUNT(*) as count FROM messages WHERE chat_id = ? AND user_id != ? AND is_read = 0`,
      [chatId, userId]
    );
    return result?.count || 0;
  }

  static delete(messageId) {
    return run(`DELETE FROM messages WHERE id = ?`, [messageId]);
  }
}

module.exports = Message;