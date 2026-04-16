const { getOne, getAll, run } = require('../config/database');

class Chat {
  static async createPrivate(user1Id, user2Id) {
    const existing = await getOne(
      `SELECT c.id FROM chats c
       JOIN chat_members cm1 ON c.id = cm1.chat_id
       JOIN chat_members cm2 ON c.id = cm2.chat_id
       WHERE c.type = 'private' AND cm1.user_id = $1 AND cm2.user_id = $2`,
      [user1Id, user2Id]
    );
    if (existing) return await this.getById(existing.id);

    const result = await run(`INSERT INTO chats (type) VALUES ('private') RETURNING id`);
    const chatId = result.lastInsertRowid;
    if (!chatId) { console.error('❌ Не удалось создать чат'); return null; }

    await run(`INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2)`, [chatId, user1Id]);
    await run(`INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2)`, [chatId, user2Id]);

    return await this.getById(chatId);
  }

  static async createGroup(name, ownerUserId, memberUserIds) {
    const result = await run(
      `INSERT INTO chats (name, type) VALUES ($1, 'group') RETURNING id`,
      [name]
    );
    const chatId = result.lastInsertRowid;
    if (!chatId) { console.error('❌ Не удалось создать группу'); return null; }

    await run(`INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, 'owner')`, [chatId, ownerUserId]);

    for (const userId of memberUserIds) {
      if (userId !== ownerUserId) {
        await run(`INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, 'member')`, [chatId, userId]);
      }
    }

    return await this.getById(chatId);
  }

  static async getById(id) {
    return getOne(
      `SELECT c.*,
        (SELECT COUNT(*) FROM messages WHERE chat_id = c.id) as message_count
       FROM chats c WHERE c.id = $1`,
      [id]
    );
  }

  static async getByUserId(userId, limit = 30, offset = 0) {
    return getAll(
      `WITH user_chats AS (
         SELECT c.id, c.name, c.type, c.created_at, c.updated_at
         FROM chats c
         JOIN chat_members cm ON c.id = cm.chat_id
         WHERE cm.user_id = $1
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
           SUM(CASE WHEN m.user_id != $1 AND m.is_read = FALSE THEN 1 ELSE 0 END) AS unread_count
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
          WHERE cm2.chat_id = c.id AND cm2.user_id != $1 LIMIT 1) AS other_user_id,
         (SELECT u.status FROM chat_members cm2 JOIN users u ON cm2.user_id = u.id
          WHERE cm2.chat_id = c.id AND cm2.user_id != $1 LIMIT 1) AS other_status,
         (SELECT STRING_AGG(u.username, ', ')
          FROM chat_members cm2 JOIN users u ON cm2.user_id = u.id
          WHERE cm2.chat_id = c.id AND cm2.user_id != $1) AS other_members,
         (SELECT u.avatar FROM chat_members cm2 JOIN users u ON cm2.user_id = u.id
          WHERE cm2.chat_id = c.id AND cm2.user_id != $1 LIMIT 1) AS other_avatar
       FROM user_chats c
       LEFT JOIN message_stats ms ON ms.chat_id = c.id
       LEFT JOIN last_message lm ON lm.chat_id = c.id
       ORDER BY lm.created_at DESC, c.updated_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }

  static async countByUserId(userId) {
    const r = await getOne(
      `SELECT COUNT(*) as n FROM chats c
       JOIN chat_members cm ON c.id = cm.chat_id
       WHERE cm.user_id = $1`,
      [userId]
    );
    return r?.n ?? 0;
  }

  static async addMember(chatId, userId, role = 'member') {
    return await run(
      `INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (chat_id, user_id) DO NOTHING`,
      [chatId, userId, role]
    );
  }

  static async removeMember(chatId, userId) {
    return await run(`DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2`, [chatId, userId]);
  }

  static async getMembers(chatId) {
    return getAll(
      `SELECT u.id, u.username, u.avatar, u.status, cm.role
       FROM chat_members cm JOIN users u ON cm.user_id = u.id
       WHERE cm.chat_id = $1`,
      [chatId]
    );
  }

  static async updateName(chatId, name) {
    await run(`UPDATE chats SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [name, chatId]);
    return await this.getById(chatId);
  }

  static async delete(chatId) {
    return await run(`DELETE FROM chats WHERE id = $1`, [chatId]);
  }
}

module.exports = Chat;