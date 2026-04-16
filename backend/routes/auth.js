const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { registerLimiter, loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * POST /api/auth/register
 */
// POST /register
router.post('/register', registerLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Некорректный email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов'),
  body('username').trim().isLength({ min: 2, max: 30 }).withMessage('Имя от 2 до 30 символов')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, username } = req.body;

    const existingUser = await User.getByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const user = await User.create(email, password, username);
    if (!user?.id) {
      return res.status(500).json({ error: 'Ошибка создания пользователя' });
    }

    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Регистрация успешна',
      user: { id: user.id, email: user.email, username: user.username, avatar: user.avatar },
      token
    });
  } catch (error) {
    console.error('💥 register:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /login
router.post('/login', loginLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Некорректный email'),
  body('password').notEmpty().withMessage('Введите пароль')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.getByEmail(email);
    if (!user || !User.verifyPassword(user, password)) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = generateToken(user.id);
    await User.updateStatus(user.id, 'online');

    res.json({
      message: 'Вход успешен',
      user: { id: user.id, email: user.email, username: user.username, avatar: user.avatar, status: 'online' },
      token
    });
  } catch (error) {
    console.error('❌ login:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
/**
 * GET /api/auth/me
 */
router.get('/me', require('../middleware/auth').authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      avatar: req.user.avatar,
      status: req.user.status
    }
  });
});

module.exports = router;