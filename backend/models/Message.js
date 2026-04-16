const { getOne, getAll, run } = require('../config/database');

class Message {
  static async create(chatId, userId, content, fileData = null) {
    const result = await run(
      `INSERT INTO messages (chat_id, user_id, content, file_url, file_type, file_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [chatId, userId, content, fileData?.url || null, fileData?.type || null, fileData?.name || null]
    );
    const messageId = result.lastInsertRowid;
    if (!messageId) { console.error('❌ Не удалось создать сообщение'); return null; }
    await run(`UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [chatId]);
    return this.getById(messageId);
  }

  static async getById(id) {
    return getOne(
      `SELECT m.*, u.username, u.avatar, m.is_read FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = $1`,
      [id]
    )
  }

  static async getByChatId(chatId, limit = 50, offset = 0) {
    const messages = await getAll(
      `SELECT m.*, u.username, u.avatar, m.is_read FROM messages m JOIN users u ON m.user_id = u.id WHERE m.chat_id = $1 ORDER BY m.created_at DESC LIMIT $2 OFFSET $3`,
      [chatId, limit, offset]
    );
    return messages.reverse();
  }

  static async countByChatId(chatId) {
    const r = await getOne(`SELECT COUNT(*) as n FROM messages WHERE chat_id = $1`, [chatId]);
    return r?.n ?? 0;
  }

  static async markAsRead(chatId, userId) {
    return await run(
      `UPDATE messages SET is_read = TRUE WHERE chat_id = $1 AND user_id != $2 AND is_read = FALSE`,
      [chatId, userId]
    );
  }

  static async getUnreadCount(chatId, userId) {
    const result = await getOne(
      `SELECT COUNT(*) as count FROM messages WHERE chat_id = $1 AND user_id != $2 AND is_read = FALSE`,
      [chatId, userId]
    );
    return result?.count || 0;
  }

  static async delete(messageId) {
    return await run(`DELETE FROM messages WHERE id = $1`, [messageId]);
  }
}

module.exports = Message;