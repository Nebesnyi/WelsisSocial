/**
 * Messenger Backend Server
 * Node.js + Express + Socket.io + better-sqlite3
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');

const { initializeDatabase } = require('./config/database');
const onlineUsers = require('./config/onlineUsers');
const { wsMessageLimiter, wsTypingLimiter } = require('./middleware/rateLimiter');
const { authMiddleware } = require('./middleware/auth');
const Message = require('./models/Message');
const Chat = require('./models/Chat');
const User = require('./models/User');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');
const postRoutes = require('./routes/posts');
const followRoutes = require('./routes/follows');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const Notification = require('./models/Notification');

const app = express();
const server = http.createServer(app);

const jwtSecret = process.env.JWT_SECRET || '';
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 chars');
}

function buildAllowedOrigins() {
  const raw = process.env.CORS_ORIGIN || '';
  const list = raw.split(',').map(v => v.trim()).filter(Boolean);
  if (process.env.NODE_ENV === 'production' && (list.length === 0 || list.includes('*'))) {
    throw new Error('CORS_ORIGIN must be explicit in production');
  }
  if (list.length === 0) return ['http://localhost:5173', 'http://localhost:3000'];
  return list;
}

const allowedOrigins = buildAllowedOrigins();
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  dotfiles: 'deny',
  index: false,
  maxAge: '1d'
}));

// ─── Upload dirs ──────────────────────────────────────────────────────────────

function createUploadDirectories() {
  for (const dir of ['uploads', 'uploads/avatars', 'uploads/messages', 'uploads/posts']) {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Создана папка: ${dir}`);
    }
  }
}

// ─── REST routes ──────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/notifications', notificationRoutes);


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Socket.io auth middleware ────────────────────────────────────────────────

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Требуется авторизация'));

  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = User.getById(decoded.userId);
    if (!user) return next(new Error('Пользователь не найден'));
    socket.user = user;
    next();
  } catch (error) {
    console.error('❌ Ошибка авторизации WebSocket:', error.message);
    next(new Error('Невалидный токен'));
  }
});

// ─── Socket.io events ─────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  const uid = socket.user.id;
  console.log(`🔌 Подключён: ${socket.user.username} (${uid})`);

  onlineUsers.set(uid, socket.id);
  User.updateStatus(uid, 'online');
  io.emit('user:online', { userId: uid });

  const userChats = Chat.getByUserId(uid);
  for (const chat of userChats) {
    socket.join(`chat:${chat.id}`);
  }
  console.log(`📋 ${socket.user.username} подключён к ${userChats.length} чатам`);

  // ─── message:send ──────────────────────────────────────────────────────────

  socket.on('message:send', async (data) => {
    if (!wsMessageLimiter(uid)) {
      socket.emit('error', { message: 'Слишком много сообщений, подождите немного' });
      return;
    }
    try {
      const { chatId, content } = data;

      // Валидация: пустое сообщение через сокет недопустимо
      const trimmedContent = typeof content === 'string' ? content.trim() : '';
      if (!trimmedContent) {
        socket.emit('error', { message: 'Сообщение не может быть пустым' });
        return;
      }

      const chat = Chat.getById(chatId);
      if (!chat) {
        socket.emit('error', { message: 'Чат не найден' });
        return;
      }

      const members = Chat.getMembers(chatId);
      if (!members.some(m => m.id === uid)) {
        socket.emit('error', { message: 'Доступ запрещён' });
        return;
      }

      const message = Message.create(chatId, uid, trimmedContent, null);
      if (!message) {
        socket.emit('error', { message: 'Ошибка создания сообщения' });
        return;
      }

      message.username = socket.user.username;
      message.avatar = socket.user.avatar;

      io.to(`chat:${chatId}`).emit('message:new', { message });

      const otherMembers = members.filter(m => m.id !== uid);
      for (const member of otherMembers) {
        const memberSocketId = onlineUsers.get(member.id);
        if (memberSocketId) {
          io.to(memberSocketId).emit('notification:new', {
            type: 'message',
            from: socket.user.username,
            chatId,
            content: trimmedContent.substring(0, 100)
          });
        }
      }
    } catch (error) {
      console.error('💥 message:send:', error);
      socket.emit('error', { message: 'Ошибка отправки сообщения' });
    }
  });

  // ─── message:delete ────────────────────────────────────────────────────────

  socket.on('message:delete', async (data) => {
    try {
      const { messageId, chatId } = data;

      const message = Message.getById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Сообщение не найдено' });
        return;
      }

      if (message.user_id !== uid) {
        socket.emit('error', { message: 'Можно удалить только свои сообщения' });
        return;
      }

      Message.delete(messageId);

      if (message.file_url) {
        const safeFilename = path.basename(message.file_url);
        const filePath = path.join(__dirname, 'uploads', 'messages', safeFilename);
        if (fs.existsSync(filePath)) {
          fsPromises.unlink(filePath).catch(() => {});
        }
      }

      io.to(`chat:${chatId}`).emit('message:deleted', {
        messageId,
        chatId,
        deletedBy: uid
      });

      socket.emit('message:deleted:confirm', { messageId, chatId });
    } catch (error) {
      console.error('💥 message:delete:', error);
      socket.emit('error', { message: 'Ошибка удаления сообщения' });
    }
  });

  // ─── chat:join ─────────────────────────────────────────────────────────────

  socket.on('chat:join', (data) => {
    try {
      const { chatId } = data;

      if (!chatId) {
        socket.emit('error', { message: 'chatId обязателен' });
        return;
      }

      const members = Chat.getMembers(chatId);
      const isMember = members.some(m => m.id === uid);

      if (!isMember) {
        console.warn(`🚫 chat:join отклонён: user ${uid} не участник чата ${chatId}`);
        socket.emit('error', { message: 'Доступ к чату запрещён' });
        return;
      }

      socket.join(`chat:${chatId}`);
      console.log(`📍 ${socket.user.username} вошёл в чат ${chatId}`);
    } catch (error) {
      console.error('💥 chat:join:', error);
      socket.emit('error', { message: 'Ошибка входа в чат' });
    }
  });

  // ─── typing ────────────────────────────────────────────────────────────────

  socket.on('typing:start', (data) => {
    if (!wsTypingLimiter(uid)) return;
    socket.to(`chat:${data.chatId}`).emit('typing:start', {
      userId: uid,
      username: socket.user.username
    });
  });

  socket.on('typing:stop', (data) => {
    socket.to(`chat:${data.chatId}`).emit('typing:stop', { userId: uid });
  });

  // ─── message:read ──────────────────────────────────────────────────────────

  socket.on('message:read', (data) => {
    const { chatId } = data;
    Message.markAsRead(chatId, uid);
    socket.to(`chat:${chatId}`).emit('message:read', { chatId, userId: uid });
  });

  // ─── room:check (отладка) ──────────────────────────────────────────────────

  socket.on('room:check', async (data) => {
    const { chatId } = data;
    const roomSockets = await io.in(`chat:${chatId}`).allSockets();
    socket.emit('room:info', {
      chatId,
      socketCount: roomSockets.size,
      sockets: Array.from(roomSockets)
    });
  });

  // ─── disconnect ────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    console.log(`🔌 Отключён: ${socket.user.username} (${uid})`);
    onlineUsers.delete(uid);
    User.updateStatus(uid, 'offline');
    io.emit('user:offline', { userId: uid });
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

function startServer() {
  initializeDatabase();
  createUploadDirectories();

  server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  🚀 MESSENGER BACKEND ЗАПУЩЕН');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  📍 Порт: ${PORT}`);
    console.log(`  🌐 URL: http://localhost:${PORT}`);
    console.log(`  🗄️  DB:  better-sqlite3 (WAL mode)`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');
  });
}

startServer();

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
});
