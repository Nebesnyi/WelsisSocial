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
      `SELECT id, email, username, avatar, status, last_seen, created_at, role,
              interests, occupation, location, education, social_links, phone,
              first_name, last_name, birth_date, city, about
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
    if (data.interests !== undefined) { fields.push('interests = ?'); values.push(JSON.stringify(data.interests)); }
    if (data.occupation !== undefined) { fields.push('occupation = ?'); values.push(data.occupation); }
    if (data.location !== undefined) { fields.push('location = ?'); values.push(data.location); }
    if (data.education !== undefined) { fields.push('education = ?'); values.push(data.education); }
    if (data.social_links !== undefined) { fields.push('social_links = ?'); values.push(JSON.stringify(data.social_links)); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
    if (data.first_name !== undefined) { fields.push('first_name = ?'); values.push(data.first_name); }
    if (data.last_name !== undefined) { fields.push('last_name = ?'); values.push(data.last_name); }
    if (data.birth_date !== undefined) { fields.push('birth_date = ?'); values.push(data.birth_date); }
    if (data.city !== undefined) { fields.push('city = ?'); values.push(data.city); }
    if (data.about !== undefined) { fields.push('about = ?'); values.push(data.about); }

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
   * Назначить роль пользователя
   */
  static setRole(userId, role) {
    run(
      `UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [role, userId]
    );
    return this.getById(userId);
  }

  /**
   * Поиск с пагинацией.
   * [FIX] Добавлены limit/offset — без них при большой базе
   * возвращались все совпадения без ограничений.
   */
  static search(query, excludeUserId, limit = 20, offset = 0) {
    const pattern = `%${query}%`;
    return getAll(
      `SELECT id, username, avatar, status, last_seen, first_name, last_name, city, occupation
       FROM users
       WHERE id != ? AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)
       ORDER BY username ASC
       LIMIT ? OFFSET ?`,
      [excludeUserId, pattern, pattern, pattern, pattern, limit, offset]
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
