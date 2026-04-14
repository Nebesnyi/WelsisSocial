const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { body, param, validationResult } = require('express-validator');
const { authMiddleware }  = require('../middleware/auth');
const { apiLimiter, uploadLimiter } = require('../middleware/rateLimiter');
const { makeMimeFilter, validateUploadedFile } = require('../middleware/validateMime');
const { parsePagination, paginationMeta } = require('../middleware/paginate');
const Post         = require('../models/Post');
const Notification = require('../models/Notification');

const ROOT_UPLOADS = path.join(__dirname, '..', 'uploads');
const POST_MEDIA_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const mediaStorage = multer.diskStorage({
  destination(req, file, cb) {
    // Гарантируем существование папки прямо здесь,
    // чтобы не зависеть от порядка вызовов при старте сервера.
    const dir = path.join(ROOT_UPLOADS, 'posts');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const _upload = multer({
  storage: mediaStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: makeMimeFilter({ allowedMimes: POST_MEDIA_MIMES })
});

const validatePostMedia = validateUploadedFile(POST_MEDIA_MIMES);

function handleUpload(req, res, next) {
  _upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError)
      return res.status(400).json({ error: `Ошибка загрузки: ${err.message}` });
    if (err)
      return res.status(400).json({ error: err.message || 'Ошибка загрузки файла' });
    next();
  });
}

const router = express.Router();
router.use(apiLimiter);
router.use(authMiddleware);

/* ── GET /feed ── */
router.get('/feed', (req, res) => {
  try {
    const { limit, offset } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
    const posts = Post.getFeed(req.user.id, limit, offset);
    const total = Post.countFeed(req.user.id);
    res.json({ posts, meta: paginationMeta({ limit, offset, total }) });
  } catch (err) {
    console.error('feed:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/* ── GET /user/:userId ── */
router.get('/user/:userId', [param('userId').isInt()], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const authorId = parseInt(req.params.userId, 10);
    const { limit, offset } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
    const posts = Post.getByAuthor(authorId, req.user.id, limit, offset);
    const total = Post.countByAuthor(authorId);
    res.json({ posts, meta: paginationMeta({ limit, offset, total }) });
  } catch (err) {
    console.error('user posts:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/* ── POST / — создать пост ── */
router.post(
  '/',
  uploadLimiter,
  handleUpload,
  validatePostMedia,
  [body('content').optional({ values: 'falsy' }).trim().isLength({ max: 2000 })],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const content  = (req.body.content || '').trim();
      const imageUrl = req.file ? `/uploads/posts/${req.file.filename}` : null;

      if (!content && !imageUrl)
        return res.status(400).json({ error: 'Нужен текст или изображение' });

      const post = Post.create(req.user.id, content, imageUrl);
      res.status(201).json({ post });
    } catch (err) {
      console.error('create post:', err);
      res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
    }
  }
);

/* ── POST /:postId/like ── */
router.post('/:postId/like', [param('postId').isInt()], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const postId = parseInt(req.params.postId, 10);
    const liked  = Post.toggleLike(postId, req.user.id);
    const post   = Post.getById(postId, req.user.id);
    if (!post) return res.status(404).json({ error: 'Пост не найден' });
    if (liked && post.user_id !== req.user.id)
      Notification.create(post.user_id, req.user.id, 'like', postId, 'post');
    res.json({ liked, post });
  } catch (err) {
    console.error('like:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/* ── GET /:postId/comments ── */
router.get('/:postId/comments', [param('postId').isInt()], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { limit, offset } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const comments = Post.getComments(parseInt(req.params.postId, 10), limit, offset);
    res.json({ comments });
  } catch (err) {
    console.error('comments:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/* ── POST /:postId/comments ── */
router.post(
  '/:postId/comments',
  [
    param('postId').isInt(),
    body('content').trim().isLength({ min: 1, max: 500 })
      .withMessage('Комментарий от 1 до 500 символов')
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const postId = parseInt(req.params.postId, 10);
      const post   = Post.getById(postId, req.user.id);
      if (!post) return res.status(404).json({ error: 'Пост не найден' });
      const comment = Post.addComment(postId, req.user.id, req.body.content);
      if (post.user_id !== req.user.id)
        Notification.create(post.user_id, req.user.id, 'comment', postId, 'post');
      res.status(201).json({ comment });
    } catch (err) {
      console.error('add comment:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

module.exports = router;
