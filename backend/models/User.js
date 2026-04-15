const { getOne, getAll, run } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static create(email, password, username) {
    const passwordHash = bcrypt.hashSync(password, 10);
    const { lastInsertRowid } = run(
      `INSERT INTO users (email, password_hash, username) VALUES (?, ?, ?)`,
      [email, passwordHash, username]
    );
    const user = this.getById(lastInsertRowid);
    console.log('🆔 Новый пользователь:', user?.id);
    return user;
  }

  static getById(id) {
    return getOne(
      `SELECT id, email, username, avatar, status, last_seen, created_at, privacy_profile_visible, privacy_posts_visible, is_verified, is_admin
       FROM users WHERE id = ?`,
      [id]
    );
  }

  static getByEmail(email) {
    return getOne(`SELECT * FROM users WHERE email = ?`, [email]);
  }

  static verifyPassword(user, password) {
    return bcrypt.compareSync(password, user.password_hash);
  }

  static updateProfile(userId, data) {
    const fields = [];
    const values = [];

    if (data.username !== undefined) { fields.push('username = ?'); values.push(data.username); }
    if (data.avatar !== undefined)   { fields.push('avatar = ?');   values.push(data.avatar); }
    if (data.status !== undefined)   { fields.push('status = ?');   values.push(data.status); }
    if (data.privacy_profile_visible !== undefined) { fields.push('privacy_profile_visible = ?'); values.push(data.privacy_profile_visible); }
    if (data.privacy_posts_visible !== undefined)   { fields.push('privacy_posts_visible = ?');   values.push(data.privacy_posts_visible); }

    if (fields.length === 0) return this.getById(userId);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(userId);
  }

  static updateStatus(userId, status) {
    run(
      `UPDATE users SET status = ?, last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, userId]
    );
  }

  /**
   * Поиск с пагинацией.
   * [FIX] Добавлены limit/offset — без них при большой базе
   * возвращались все совпадения без ограничений.
   */
  static search(query, excludeUserId, limit = 20, offset = 0) {
    const pattern = `%${query}%`;
    return getAll(
      `SELECT id, username, avatar, status, last_seen
       FROM users
       WHERE id != ? AND (username LIKE ? OR email LIKE ?)
       ORDER BY username ASC
       LIMIT ? OFFSET ?`,
      [excludeUserId, pattern, pattern, limit, offset]
    );
  }

  /** Количество результатов поиска — для meta.total */
  static countSearch(query, excludeUserId) {
    const pattern = `%${query}%`;
    const r = getOne(
      `SELECT COUNT(*) as n FROM users
       WHERE id != ? AND (username LIKE ? OR email LIKE ?)`,
      [excludeUserId, pattern, pattern]
    );
    return r?.n ?? 0;
  }
}

module.exports = User;
