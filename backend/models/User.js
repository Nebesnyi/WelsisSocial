const { getOne, getAll, run } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(email, password, username) {
    const passwordHash = bcrypt.hashSync(password, 10);
    const result = await run(
      `INSERT INTO users (email, password_hash, username) VALUES ($1, $2, $3) RETURNING id`,
      [email, passwordHash, username]
    );
    const user = await this.getById(result.lastInsertRowid);
    console.log('🆔 Новый пользователь:', user?.id);
    return user;
  }

  static async getById(id) {
    return getOne(
      `SELECT id, email, username, avatar, status, last_seen, created_at, role,
              interests, occupation, location, education, social_links, phone,
              first_name, last_name, birth_date, city, about
       FROM users WHERE id = $1`,
      [id]
    );
  }

  static async getByEmail(email) {
    return getOne(`SELECT * FROM users WHERE email = $1`, [email]);
  }

  static verifyPassword(user, password) {
    // Проверка на случай если хеша нет
    if (!user || !user.password_hash) return false;
    return bcrypt.compareSync(password, user.password_hash);
  }

  static async updateProfile(userId, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const addField = (key, value, isJson = false) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(isJson ? JSON.stringify(value) : value);
        paramIndex++;
      }
    };

    addField('username', data.username);
    addField('avatar', data.avatar);
    addField('status', data.status);
    addField('interests', data.interests, true);
    addField('occupation', data.occupation);
    addField('location', data.location);
    addField('education', data.education);
    addField('social_links', data.social_links, true);
    addField('phone', data.phone);
    addField('first_name', data.first_name);
    addField('last_name', data.last_name);
    addField('birth_date', data.birth_date);
    addField('city', data.city);
    addField('about', data.about);

    if (fields.length === 0) return await this.getById(userId);

    fields.push('updated_at = NOW()');
    values.push(userId);

    await run(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    
    return await this.getById(userId);
  }

  static async updateStatus(userId, status) {
    await run(
      `UPDATE users SET status = $1, last_seen = NOW(), updated_at = NOW() WHERE id = $2`,
      [status, userId]
    );
  }

  static async setRole(userId, role) {
    await run(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`,
      [role, userId]
    );
    return await this.getById(userId);
  }

  static async search(query, excludeUserId, limit = 20, offset = 0) {
    const pattern = `%${query}%`;
    return getAll(
      `SELECT id, username, avatar, status, last_seen, first_name, last_name, city, occupation
       FROM users
       WHERE id != $1 AND (username ILIKE $2 OR email ILIKE $3 OR first_name ILIKE $4 OR last_name ILIKE $5)
       ORDER BY username ASC
       LIMIT $6 OFFSET $7`,
      [excludeUserId, pattern, pattern, pattern, pattern, limit, offset]
    );
  }

  static async countSearch(query, excludeUserId) {
    const pattern = `%${query}%`;
    const r = await getOne(
      `SELECT COUNT(*) as n FROM users
       WHERE id != $1 AND (username ILIKE $2 OR email ILIKE $3)`,
      [excludeUserId, pattern, pattern]
    );
    return parseInt(r?.n) || 0;
  }
}

module.exports = User;