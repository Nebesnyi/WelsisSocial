const { Pool } = require('pg');
require('dotenv').config();

// Подключение из .env (убедитесь, что там есть эти переменные)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Универсальная функция для получения одной строки
async function getOne(query, values = []) {
  try {
    const res = await pool.query(query, values);
    return res.rows[0] || null;
  } catch (err) {
    console.error('DB Error (getOne):', err.message);
    throw err;
  }
}

// Универсальная функция для получения массива строк
async function getAll(query, values = []) {
  try {
    const res = await pool.query(query, values);
    return res.rows;
  } catch (err) {
    console.error('DB Error (getAll):', err.message);
    throw err;
  }
}

/**
 * Выполнить INSERT/UPDATE/DELETE
 */
async function run(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return {
      lastInsertRowid: result.rows[0]?.id || null,
      changes: result.rowCount
    };
  } catch (error) {
    console.error('❌ run ошибка:', error.message, sql);
    throw error;
  }
}

module.exports = { getOne, getAll, run, pool };