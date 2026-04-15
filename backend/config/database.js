/**
 * Конфигурация SQLite базы данных
 * better-sqlite3: нативный, синхронный, WAL mode, без RAM-буфера
 *
 * ЗАМЕНА sql.js -> better-sqlite3:
 *   npm uninstall sql.js
 *   npm install better-sqlite3
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');

// Открываем БД один раз — соединение живёт весь процесс
const db = new Database(dbPath);

// WAL mode: читатели не блокируют писателей, запись не блокирует event loop
db.pragma('journal_mode = WAL');
// При WAL достаточно NORMAL — данные не теряются при сбое ОС
db.pragma('synchronous = NORMAL');
// Внешние ключи в SQLite выключены по умолчанию
db.pragma('foreign_keys = ON');

/**
 * Инициализация схемы базы данных
 */
function initializeDatabase() {
  console.log('📦 Инициализация базы данных...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username TEXT NOT NULL,
      avatar TEXT DEFAULT NULL,
      status TEXT DEFAULT 'online',
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT NULL,
      type TEXT NOT NULL CHECK(type IN ('private', 'group')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(chat_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT,
      file_url TEXT DEFAULT NULL,
      file_type TEXT DEFAULT NULL,
      file_name TEXT DEFAULT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      socket_id TEXT NOT NULL,
      connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(follower_id, following_id),
      CHECK(follower_id != following_id)
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT DEFAULT '',
      image_url TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS post_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      actor_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('like', 'comment', 'follow', 'message')),
      entity_id INTEGER,
      entity_type TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

    CREATE TABLE IF NOT EXISTS post_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'image',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS post_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
    CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_chat_created_at ON messages(chat_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_chat_user_read ON messages(chat_id, user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_chat_members_chat_id ON chat_members(chat_id);
    CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_members_user_chat ON chat_members(user_id, chat_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_posts_user_created_at ON posts(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
    CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
    CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
  `);

  // ─── Миграции ──────────────────────────────────────────────────────────────
  // ALTER TABLE ADD COLUMN безопасен: SQLite игнорирует ошибку "duplicate column".
  // Список: [ tableName, columnName, columnDefinition ]
  const migrations = [
    // posts: image_url могла отсутствовать в старых БД
    ['posts', 'image_url',   'TEXT DEFAULT NULL'],
    ['posts', 'updated_at',  'DATETIME DEFAULT CURRENT_TIMESTAMP'],
    // messages: поля для файлов
    ['messages', 'file_url',  'TEXT DEFAULT NULL'],
    ['messages', 'file_type', 'TEXT DEFAULT NULL'],
    ['messages', 'file_name', 'TEXT DEFAULT NULL'],
    // users: last_seen / updated_at / role
    ['users', 'last_seen',   'DATETIME DEFAULT CURRENT_TIMESTAMP'],
    ['users', 'updated_at',  'DATETIME DEFAULT CURRENT_TIMESTAMP'],
    ['users', 'role',        "TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin'))"],
    // users: is_blocked для блокировки пользователей
    ['users', 'is_blocked',  'INTEGER DEFAULT 0'],
  ];

  for (const [table, column, definition] of migrations) {
    // Получаем текущие колонки таблицы через PRAGMA
    const cols = db.pragma(`table_info(${table})`).map(c => c.name);
    if (!cols.includes(column)) {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`🔧 Миграция: ${table}.${column} добавлена`);
      } catch (err) {
        // Колонка уже есть — это нормально, молча пропускаем
        if (!err.message.includes('duplicate column')) {
          console.error(`❌ Миграция ${table}.${column}:`, err.message);
        }
      }
    }
  }

  console.log('✅ База данных готова!');
}

/**
 * Получить одну запись.
 * better-sqlite3: stmt.get() возвращает объект или undefined — не null.
 */
function getOne(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.get(params) ?? null;
  } catch (error) {
    console.error('❌ getOne ошибка:', error.message, sql);
    return null;
  }
}

/**
 * Получить все записи.
 */
function getAll(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.all(params);
  } catch (error) {
    console.error('❌ getAll ошибка:', error.message, sql);
    return [];
  }
}

/**
 * Выполнить INSERT/UPDATE/DELETE.
 * Возвращает { lastInsertRowid, changes } — тот же интерфейс, что был раньше.
 *
 * Главное отличие от sql.js:
 *   - НЕТ saveDatabase() — WAL сбрасывает на диск автоматически
 *   - lastInsertRowid точный, больше не нужен SELECT MAX(id) как костыль
 */
function run(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const info = stmt.run(params);
    return {
      lastInsertRowid: info.lastInsertRowid,
      changes: info.changes
    };
  } catch (error) {
    console.error('❌ run ошибка:', error.message, sql);
    throw error;
  }
}

// Корректное закрытие при остановке процесса
process.on('exit', () => db.close());
process.on('SIGINT', () => { db.close(); process.exit(); });
process.on('SIGTERM', () => { db.close(); process.exit(); });

module.exports = {
  getDb: () => db,
  initializeDatabase,
  getOne,
  getAll,
  run
};
