const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Post = require('../models/Post');

const router = express.Router();

/**
 * Проверка на администратора
 */
function adminOnly(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Доступ запрещён. Требуется роль администратора.' });
  }
  next();
}

/**
 * GET /admin/stats — статистика для админ-панели
 */
router.get('/stats', authMiddleware, adminOnly, (req, res) => {
  try {
    const db = require('../config/database').getDb();
    
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalPosts = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
    const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
    const totalChats = db.prepare('SELECT COUNT(*) as count FROM chats').get().count;
    const onlineUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'online'").get().count;
    const verifiedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_verified = 1').get().count;
    
    // Последние пользователи
    const recentUsers = db.prepare(`
      SELECT id, username, email, created_at, is_verified 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `).all();
    
    // Последние посты
    const recentPosts = db.prepare(`
      SELECT p.id, p.content, p.created_at, u.username, u.id as user_id
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `).all();
    
    res.json({
      stats: {
        totalUsers,
        totalPosts,
        totalMessages,
        totalChats,
        onlineUsers,
        verifiedUsers
      },
      recentUsers,
      recentPosts
    });
  } catch (error) {
    console.error('❌ Admin stats error:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

/**
 * PUT /admin/verify/:userId — верифицировать пользователя
 */
router.put('/verify/:userId', authMiddleware, adminOnly, (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { is_verified } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Невалидный ID пользователя' });
    }
    
    const user = User.getById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const db = require('../config/database').getDb();
    db.prepare('UPDATE users SET is_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(is_verified ? 1 : 0, userId);
    
    const updatedUser = User.getById(userId);
    
    // Создаём уведомление о верификации
    if (is_verified) {
      const Notification = require('../models/Notification');
      Notification.create(userId, req.user.id, 'verification', null, null);
    }
    
    res.json({
      message: is_verified ? 'Пользователь верифицирован' : 'Верификация снята',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Admin verify error:', error);
    res.status(500).json({ error: 'Ошибка верификации' });
  }
});

/**
 * GET /admin/users — список всех пользователей (с пагинацией)
 */
router.get('/users', authMiddleware, adminOnly, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const db = require('../config/database').getDb();
    
    const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    
    const users = db.prepare(`
      SELECT id, username, email, avatar, status, is_verified, created_at, last_seen
      FROM users
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Admin users error:', error);
    res.status(500).json({ error: 'Ошибка получения списка пользователей' });
  }
});

/**
 * DELETE /admin/user/:userId — удалить пользователя (только админ)
 */
router.delete('/user/:userId', authMiddleware, adminOnly, (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Невалидный ID пользователя' });
    }
    
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }
    
    const user = User.getById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const db = require('../config/database').getDb();
    
    // Удаляем посты пользователя
    db.prepare('DELETE FROM post_likes WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)').run(userId);
    db.prepare('DELETE FROM post_comments WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)').run(userId);
    db.prepare('DELETE FROM posts WHERE user_id = ?').run(userId);
    
    // Удаляем уведомления
    db.prepare('DELETE FROM notifications WHERE user_id = ? OR actor_id = ?').run(userId, userId);
    
    // Удаляем подписки
    db.prepare('DELETE FROM follows WHERE follower_id = ? OR following_id = ?').run(userId, userId);
    
    // Удаляем сообщения
    db.prepare('DELETE FROM messages WHERE user_id = ?').run(userId);
    
    // Удаляем из чатов
    db.prepare('DELETE FROM chat_members WHERE user_id = ?').run(userId);
    
    // Удаляем сессии
    db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);
    
    // Удаляем пользователя
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    
    res.json({ message: 'Пользователь удалён', deletedUser: user });
  } catch (error) {
    console.error('❌ Admin delete user error:', error);
    res.status(500).json({ error: 'Ошибка удаления пользователя' });
  }
});

/**
 * PUT /admin/toggle-admin/:userId — назначить/снять роль администратора
 */
router.put('/toggle-admin/:userId', authMiddleware, adminOnly, (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Невалидный ID пользователя' });
    }
    
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Нельзя изменить роль самого себя' });
    }
    
    const user = User.getById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const db = require('../config/database').getDb();
    const newAdminStatus = user.is_admin ? 0 : 1;
    
    db.prepare('UPDATE users SET is_admin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newAdminStatus, userId);
    
    const updatedUser = User.getById(userId);
    
    res.json({
      message: newAdminStatus ? 'Пользователь назначен администратором' : 'Администратор понижен',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Admin toggle error:', error);
    res.status(500).json({ error: 'Ошибка изменения роли' });
  }
});

module.exports = router;
