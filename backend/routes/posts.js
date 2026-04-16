const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка хранилища для загружаемых файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/posts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * GET /api/posts/feed - Лента новостей
 */
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const posts = await Post.getFeed(userId, limit, offset);
    const total = await Post.countFeed(userId);

    res.json({
      posts: posts || [],
      meta: { total, limit, offset }
    });
  } catch (error) {
    console.error('❌ Ошибка ленты:', error);
    res.status(500).json({ error: 'Ошибка сервера при загрузке ленты' });
  }
});

/**
 * POST /api/posts - Создание поста
 */
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Текст поста не может быть пустым' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/posts/${req.file.filename}`;
    }

    const post = await Post.create(req.user.id, content.trim(), imageUrl);
    if (!post) {
      return res.status(500).json({ error: 'Ошибка создания поста' });
    }

    res.status(201).json({ post });
  } catch (error) {
    console.error('❌ Ошибка создания поста:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * GET /api/posts/:id - Получение одного поста
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.getById(req.params.id, req.user.id);
    if (!post) {
      return res.status(404).json({ error: 'Пост не найден' });
    }
    res.json({ post });
  } catch (error) {
    console.error('❌ Ошибка получения поста:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * GET /api/posts/user/:id - Посты конкретного пользователя
 */
router.get('/user/:id', authMiddleware, async (req, res) => {
  try {
    const authorId = parseInt(req.params.id, 10);
    const viewerId = req.user.id;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;

    if (isNaN(authorId)) {
      return res.status(400).json({ error: 'Неверный ID пользователя' });
    }

    const posts = await Post.getByAuthor(authorId, viewerId, limit, offset);
    const total = await Post.countByAuthor(authorId);

    // Гарантируем, что posts - это массив
    const safePosts = Array.isArray(posts) ? posts : [];

    res.json({
      posts: safePosts,
      meta: { total, limit, offset }
    });
  } catch (error) {
    console.error('❌ Ошибка получения постов пользователя:', error);
    res.status(500).json({ 
      error: 'Ошибка сервера', 
      details: error.message 
    });
  }
});

/**
 * POST /api/posts/:id/like - Лайк/Дизлайк
 */
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const liked = await Post.toggleLike(req.params.id, req.user.id);
    const post = await Post.getById(req.params.id, req.user.id);
    res.json({ liked, post });
  } catch (error) {
    console.error('❌ Ошибка лайка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/posts/:id/comment - Добавление комментария
 */
router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Комментарий не может быть пустым' });
    }

    const comment = await Post.addComment(req.params.id, req.user.id, content.trim());
    res.status(201).json({ comment });
  } catch (error) {
    console.error('❌ Ошибка комментария:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * GET /api/posts/:id/comments - Комментарии к посту
 */
router.get('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    
    const comments = await Post.getComments(req.params.id, limit, offset);
    res.json({ comments: comments || [] });
  } catch (error) {
    console.error('❌ Ошибка загрузки комментариев:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;