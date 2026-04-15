const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

/**
 * GET /api/admin/users
 * Получить список всех пользователей (доступно всем)
 */
router.get('/users', (req, res) => {
  try {
    const users = require('../config/database').getAll(
      `SELECT id, email, username, avatar, status, role, badge_type, last_seen, created_at 
       FROM users ORDER BY created_at DESC`
    );
    res.json({ users });
  } catch (error) {
    console.error('❌ admin getUsers:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * PUT /api/admin/users/:id/badge
 * Изменить тип бейджа пользователя (только админ)
 */
router.put('/users/:id/badge', [
  body('badge_type').optional().isIn(['owner', 'admin', 'moderator', 'verified', 'premium', 'bot', null]).withMessage('Недопустимый тип бейджа')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = parseInt(req.params.id);
    const { badge_type } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }

    const user = User.getById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const db = require('../config/database');
    db.run(`UPDATE users SET badge_type = ? WHERE id = ?`, [badge_type, userId]);
    
    res.json({
      message: `Бейдж пользователя ${user.username} изменен на ${badge_type || 'отсутствует'}`,
      badge_type
    });
  } catch (error) {
    console.error('❌ admin setBadge:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Изменить роль пользователя (только админ)
 */
router.put('/users/:id/role', [
  body('role').isIn(['user', 'admin']).withMessage('Роль должна быть user или admin')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }

    // Защита от блокировки самого себя
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Нельзя изменить роль самого себя' });
    }

    const user = User.getById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const updatedUser = User.setRole(userId, role);
    
    res.json({
      message: `Роль пользователя ${user.username} изменена на ${role}`,
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ admin setRole:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Удалить пользователя (только админ)
 */
router.delete('/users/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }

    // Защита от удаления самого себя
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }

    const user = User.getById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const db = require('../config/database');
    db.run(`DELETE FROM users WHERE id = ?`, [userId]);

    res.json({ message: `Пользователь ${user.username} удалён` });
  } catch (error) {
    console.error('❌ admin deleteUser:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * GET /api/admin/stats
 * Получить статистику платформы (доступно всем)
 */
router.get('/stats', (req, res) => {
  try {
    const db = require('../config/database');
    
    const totalUsers = db.getOne('SELECT COUNT(*) as count FROM users')?.count || 0;
    const totalPosts = db.getOne('SELECT COUNT(*) as count FROM posts')?.count || 0;
    const totalMessages = db.getOne('SELECT COUNT(*) as count FROM messages')?.count || 0;
    const onlineUsers = db.getOne("SELECT COUNT(*) as count FROM users WHERE status = 'online'")?.count || 0;

    res.json({
      stats: {
        totalUsers,
        totalPosts,
        totalMessages,
        onlineUsers
      }
    });
  } catch (error) {
    console.error('❌ admin getStats:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
