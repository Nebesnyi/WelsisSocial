const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { parsePagination, paginationMeta } = require('../middleware/paginate');
const Chat = require('../models/Chat');
const User = require('../models/User');
const ChatService = require('../services/chatService');

const router = express.Router();
// apiLimiter теперь применяется глобально в server.js

router.get('/', authMiddleware, (req, res) => {
  try {
    const { limit, offset } = parsePagination(req.query, { defaultLimit: 30, maxLimit: 50 });
    const { chats, total } = ChatService.listUserChats(req.user.id, limit, offset);
    res.json({ chats, meta: paginationMeta({ limit, offset, total }) });
  } catch (error) {
    console.error('Ошибка получения чатов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/private', authMiddleware, [
  body('userId').isInt().withMessage('Некорректный ID пользователя')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { userId } = req.body;
    if (userId === req.user.id) return res.status(400).json({ error: 'Нельзя создать чат с самим собой' });

    const otherUser = User.getById(userId);
    if (!otherUser) return res.status(404).json({ error: 'Пользователь не найден' });

    const chat = Chat.createPrivate(req.user.id, userId);
    if (!chat) return res.status(500).json({ error: 'Ошибка создания чата' });

    const members = Chat.getMembers(chat.id);
    res.status(201).json({ message: 'Чат создан', chat: { ...chat, members } });
  } catch (error) {
    console.error('Ошибка создания чата:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/group', authMiddleware, [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Название от 1 до 50 символов'),
  body('memberIds').isArray({ min: 1 }).withMessage('Добавьте хотя бы одного участника')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, memberIds } = req.body;

    for (const userId of memberIds) {
      if (!User.getById(userId)) {
        return res.status(404).json({ error: `Пользователь ${userId} не найден` });
      }
    }

    const chat = Chat.createGroup(name, req.user.id, memberIds);
    if (!chat) return res.status(500).json({ error: 'Ошибка создания группы' });

    const members = Chat.getMembers(chat.id);
    res.status(201).json({ message: 'Группа создана', chat: { ...chat, members } });
  } catch (error) {
    console.error('Ошибка создания группы:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const chat = ChatService.getChatForUser(req.params.id, req.user.id);
    if (!chat) return res.status(404).json({ error: 'Чат не найден или доступ запрещён' });
    res.json({ chat });
  } catch (error) {
    console.error('Ошибка получения чата:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/:id/members', authMiddleware, [
  body('userId').isInt().withMessage('Некорректный ID пользователя')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const chat = Chat.getById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Чат не найден' });

    const members = Chat.getMembers(chat.id);
    const currentUser = members.find(m => m.id === req.user.id);
    if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    Chat.addMember(chat.id, parseInt(req.body.userId, 10));
    res.json({ message: 'Участник добавлен' });
  } catch (error) {
    console.error('Ошибка добавления участника:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/:id/members/:userId', authMiddleware, (req, res) => {
  try {
    const chat = Chat.getById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Чат не найден' });

    const members = Chat.getMembers(chat.id);
    const currentUser = members.find(m => m.id === req.user.id);
    if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    // parseInt: req.params.userId — строка, Chat.removeMember ждёт число
    Chat.removeMember(chat.id, parseInt(req.params.userId, 10));
    res.json({ message: 'Участник удалён' });
  } catch (error) {
    console.error('Ошибка удаления участника:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
