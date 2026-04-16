const express = require('express');
const { param, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const Follow = require('../models/Follow');
const User = require('../models/User');
const Notification = require('../models/Notification');

const router = express.Router();
// apiLimiter теперь применяется глобально в server.js
router.use(authMiddleware);

router.get('/me', async (req, res) => {
  const followers = await Follow.getFollowers(req.user.id);
  const following = await Follow.getFollowing(req.user.id);
  const followersCount = await Follow.getFollowersCount(req.user.id);
  const followingCount = await Follow.getFollowingCount(req.user.id);
  res.json({ followers, following, followersCount, followingCount });
});

router.post(
  '/:userId',
  [param('userId').isInt().withMessage('Некорректный userId')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const followingId = parseInt(req.params.userId, 10);
    if (followingId === req.user.id) {
      return res.status(400).json({ error: 'Нельзя подписаться на себя' });
    }
    const user = await User.getById(followingId);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    await Follow.follow(req.user.id, followingId);
    await Notification.create(followingId, req.user.id, 'follow', req.user.id, 'user');
    res.status(201).json({ message: 'Подписка оформлена' });
  }
);

router.delete(
  '/:userId',
  [param('userId').isInt().withMessage('Некорректный userId')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const followingId = parseInt(req.params.userId, 10);
    await Follow.unfollow(req.user.id, followingId);
    res.json({ message: 'Подписка удалена' });
  }
);

router.get('/:userId/status', [param('userId').isInt()], async (req, res) => {
  const target = parseInt(req.params.userId, 10);
  const following = await Follow.isFollowing(req.user.id, target);
  const followersCount = await Follow.getFollowersCount(target);
  const followingCount = await Follow.getFollowingCount(target);
  res.json({ following, followersCount, followingCount });
});

module.exports = router;
