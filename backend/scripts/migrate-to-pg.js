const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Конфигурация подключения к PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'welsis_social',
});

async function migrate() {
  let client;

  try {
    console.log('🔄 Начало миграции на PostgreSQL...');
    
    // 1. Проверка подключения
    client = await pool.connect();
    console.log('✅ Подключение к PostgreSQL успешно');

    // 2. Создание таблиц
    console.log('🏗️ Создание структуры базы данных...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        avatar VARCHAR(255),
        bio TEXT,
        birth_date DATE,
        city VARCHAR(100),
        status VARCHAR(255),
        interests TEXT[],
        occupation VARCHAR(100),
        location VARCHAR(100),
        education TEXT,
        social_links JSONB,
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'user',
        badge_type VARCHAR(20) DEFAULT 'none',
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_blocked BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        image VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS post_likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        UNIQUE(user_id, post_id)
      );

      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(follower_id, following_id)
      );

      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        is_group BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_members (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(chat_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        data JSONB,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Таблицы созданы/проверены');

    // 3. Создание владельца (Minter)
    // Пытаемся найти существующего пользователя
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', ['Code0Eyes@yandex.ru']);

    if (existingUser.rows.length > 0) {
      console.log('👤 Пользователь Minter уже существует. Обновляю права...');
      await client.query(`
        UPDATE users 
        SET role = 'admin', badge_type = 'owner' 
        WHERE email = 'Code0Eyes@yandex.ru'
      `);
      console.log('✅ Права владельца обновлены!');
    } else {
      console.log('🆕 Создаю нового пользователя Minter с правами владельца...');
      const hash = await bcrypt.hash('admin123', 10); // Пароль по умолчанию
      
      await client.query(`
        INSERT INTO users (
          username, email, password_hash, role, badge_type, 
          first_name, last_name, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, ['Minter', 'Code0Eyes@yandex.ru', hash, 'admin', 'owner', 'Minter', 'Admin']);
      
      console.log('✅ Пользователь создан! Логин: Code0Eyes@yandex.ru, Пароль: admin123');
    }

    console.log('🎉 МИГРАЦИЯ УСПЕШНО ЗАВЕРШЕНА!');
    console.log('🚀 Теперь можете запускать сервер: npm run dev');

  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

migrate();
