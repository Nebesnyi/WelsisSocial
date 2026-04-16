const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();
// apiLimiter теперь применяется глобально в server.js
router.use(authMiddleware);

// GET /api/notifications — list
router.get('/', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 30, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0,  0);
    const notifications = await Notification.getForUser(req.user.id, limit, offset);
    const unread = await Notification.getUnreadCount(req.user.id);
    res.json({ notifications, unread });
  } catch (e) {
    console.error('notifications GET', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const unread = await Notification.getUnreadCount(req.user.id);
    res.json({ unread });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', async (req, res) => {
  try {
    await Notification.markAllRead(req.user.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', async (req, res) => {
  try {
    await Notification.markRead(parseInt(req.params.id), req.user.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
