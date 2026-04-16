/**
 * Конфигурация PostgreSQL базы данных
 * Замена SQLite на PostgreSQL для стабильности и масштабируемости
 */
const { Pool } = require('pg');
require('dotenv').config();

// Создаем пул соединений
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'welsis_social',
  max: 20, // Максимальное количество соединений в пуле
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Инициализация схемы базы данных
 */
async function initializeDatabase() {
  console.log('📦 Инициализация базы данных PostgreSQL...');
  
  const client = await pool.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        username VARCHAR(100) NOT NULL,
        avatar VARCHAR(255) DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'online',
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        role VARCHAR(50) DEFAULT 'user' CHECK(role IN ('user', 'admin', 'owner')),
        interests TEXT DEFAULT NULL,
        occupation TEXT DEFAULT NULL,
        location TEXT DEFAULT NULL,
        education TEXT DEFAULT NULL,
        social_links TEXT DEFAULT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        first_name VARCHAR(100) DEFAULT NULL,
        last_name VARCHAR(100) DEFAULT NULL,
        birth_date DATE DEFAULT NULL,
        city VARCHAR(100) DEFAULT NULL,
        about TEXT DEFAULT NULL,
        badge_type VARCHAR(50) DEFAULT NULL CHECK(badge_type IN ('owner', 'admin', 'moderator', 'verified', 'premium', 'bot'))
      );

      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) DEFAULT NULL,
        type VARCHAR(50) NOT NULL CHECK(type IN ('private', 'group')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_members (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chat_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        file_url VARCHAR(255) DEFAULT NULL,
        file_type VARCHAR(50) DEFAULT NULL,
        file_name VARCHAR(255) DEFAULT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        socket_id VARCHAR(255) NOT NULL,
        connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id),
        CHECK(follower_id != following_id)
      );

      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT DEFAULT '',
        image_url VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS post_likes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK(type IN ('like', 'comment', 'follow', 'message')),
        entity_id INTEGER,
        entity_type VARCHAR(50),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS post_media (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        url VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'image',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS post_comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
      CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_chat_created_at ON messages(chat_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_chat_members_chat_id ON chat_members(chat_id);
      CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_posts_user_created_at ON posts(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
      CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
      CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
    `);

    console.log('✅ База данных PostgreSQL готова!');
    
    // Выдаем роль owner пользователю с email Code0Eyes@yandex.ru
    try {
      await client.query(`
        UPDATE users 
        SET role = 'owner', badge_type = 'owner' 
        WHERE email = 'Code0Eyes@yandex.ru'
      `);
      console.log('👑 Пользователь Minter (Code0Eyes@yandex.ru) получил роль владельца!');
    } catch (err) {
      console.log('ℹ️  Пользователь Minter еще не создан или уже имеет роль владельца');
    }
    
  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Получить одну запись
 */
async function getOne(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ getOne ошибка:', error.message, sql);
    return null;
  }
}

/**
 * Получить все записи
 */
async function getAll(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('❌ getAll ошибка:', error.message, sql);
    return [];
  }
}

/**
 * Выполнить INSERT/UPDATE/DELETE
 */
async function run(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return {
      lastInsertRowid: result.rows[0]?.id || result.lastInsertRowId,
      changes: result.rowCount
    };
  } catch (error) {
    console.error('❌ run ошибка:', error.message, sql);
    throw error;
  }
}

module.exports = {
  getDb: () => pool,
  initializeDatabase,
  getOne,
  getAll,
  run
};
