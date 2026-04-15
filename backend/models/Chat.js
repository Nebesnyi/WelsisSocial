const { getOne, getAll, run } = require('../config/database');

class Chat {
  static createPrivate(user1Id, user2Id) {
    const existing = getOne(
      `SELECT c.id FROM chats c
       JOIN chat_members cm1 ON c.id = cm1.chat_id
       JOIN chat_members cm2 ON c.id = cm2.chat_id
       WHERE c.type = 'private' AND cm1.user_id = ? AND cm2.user_id = ?`,
      [user1Id, user2Id]
    );
    if (existing) return this.getById(existing.id);

    const { lastInsertRowid: chatId } = run(`INSERT INTO chats (type) VALUES ('private')`);
    if (!chatId) { console.error('❌ Не удалось создать чат'); return null; }

    run(`INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)`, [chatId, user1Id]);
    run(`INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)`, [chatId, user2Id]);

    return this.getById(chatId);
  }

  static createGroup(name, ownerUserId, memberUserIds) {
    const { lastInsertRowid: chatId } = run(
      `INSERT INTO chats (name, type) VALUES (?, 'group')`,
      [name]
    );
    if (!chatId) { console.error('❌ Не удалось создать группу'); return null; }

    run(`INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, 'owner')`, [chatId, ownerUserId]);

    for (const userId of memberUserIds) {
      if (userId !== ownerUserId) {
        run(`INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, 'member')`, [chatId, userId]);
      }
    }

    return this.getById(chatId);
  }

  static getById(id) {
    return getOne(
      `SELECT c.*,
        (SELECT COUNT(*) FROM messages WHERE chat_id = c.id) as message_count
       FROM chats c WHERE c.id = ?`,
      [id]
    );
  }

  /**
   * Чаты пользователя с пагинацией.
   * [FIX] Добавлены limit/offset — без них при сотнях чатов
   * вся таблица уходила в память одним запросом.
   */
  static getByUserId(userId, limit = 30, offset = 0) {
    return getAll(
      `WITH user_chats AS (
         SELECT c.id, c.name, c.type, c.created_at, c.updated_at
         FROM chats c
         JOIN chat_members cm ON c.id = cm.chat_id
         WHERE cm.user_id = ?
       ),
       last_message AS (
         SELECT m.chat_id, m.content, m.created_at, m.file_type
         FROM messages m
         JOIN (
           SELECT chat_id, MAX(id) AS max_id
           FROM messages
           GROUP BY chat_id
         ) lm ON lm.max_id = m.id
       ),
       message_stats AS (
         SELECT
           m.chat_id,
           COUNT(*) AS message_count,
           SUM(CASE WHEN m.user_id != ? AND m.is_read = 0 THEN 1 ELSE 0 END) AS unread_count
         FROM messages m
         GROUP BY m.chat_id
       )
       SELECT
         c.id, c.name, c.type, c.created_at, c.updated_at,
         COALESCE(ms.message_count, 0) AS message_count,
         COALESCE(ms.unread_count, 0) AS unread_count,
         lm.content AS last_message,
         lm.created_at AS last_message_at,
         lm.file_type AS last_file_type,
         (SELECT u.id FROM chat_members cm2 JOIN users u ON cm2.user_id = u.id
          WHERE cm2.chat_id = c.id AND cm2.user_id != ? LIMIT 1) AS other_user_id,
         (SELECT u.status FROM chat_members cm2 JOIN users u ON cm2.user_id = u.id
          WHERE cm2.chat_id = c.id AND cm2.user_id != ? LIMIT 1) AS other_status,
         (SELECT u.last_seen FROM chat_members cm2 JOIN users u ON cm2.user_id = u.id
          WHERE cm2.chat_id = c.id AND cm2.user_id != ? LIMIT 1) AS other_last_seen,
         (SELECT GROUP_CONCAT(u.username, ', ')
          FROM chat_members cm2 JOIN users u ON cm2.user_id = u.id
          WHERE cm2.chat_id = c.id AND cm2.user_id != ?) AS other_members,
         (SELECT u.avatar FROM chat_members cm2 JOIN users u ON cm2.user_id = u.id
          WHERE cm2.chat_id = c.id AND cm2.user_id != ? LIMIT 1) AS other_avatar
       FROM user_chats c
       LEFT JOIN message_stats ms ON ms.chat_id = c.id
       LEFT JOIN last_message lm ON lm.chat_id = c.id
       ORDER BY lm.created_at DESC, c.updated_at DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, userId, userId, userId, userId, userId, limit, offset]
    );
  }

  /** Общее количество чатов пользователя — для meta.total */
  static countByUserId(userId) {
    const r = getOne(
      `SELECT COUNT(*) as n FROM chats c
       JOIN chat_members cm ON c.id = cm.chat_id
       WHERE cm.user_id = ?`,
      [userId]
    );
    return r?.n ?? 0;
  }

  static addMember(chatId, userId, role = 'member') {
    return run(
      `INSERT OR IGNORE INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)`,
      [chatId, userId, role]
    );
  }

  static removeMember(chatId, userId) {
    return run(`DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?`, [chatId, userId]);
  }

  static getMembers(chatId) {
    return getAll(
      `SELECT u.id, u.username, u.avatar, u.status, cm.role
       FROM chat_members cm JOIN users u ON cm.user_id = u.id
       WHERE cm.chat_id = ?`,
      [chatId]
    );
  }

  static updateName(chatId, name) {
    run(`UPDATE chats SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [name, chatId]);
    return this.getById(chatId);
  }

  static delete(chatId) {
    return run(`DELETE FROM chats WHERE id = ?`, [chatId]);
  }
}

module.exports = Chat;
