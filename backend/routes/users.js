const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter, uploadLimiter } = require('../middleware/rateLimiter');
const { makeMimeFilter, validateUploadedFile } = require('../middleware/validateMime');
const { parsePagination, paginationMeta } = require('../middleware/paginate');
const User = require('../models/User');

const router = express.Router();
router.use(apiLimiter);

const ROOT_UPLOADS  = path.join(__dirname, '..', 'uploads');
const AVATAR_MIMES  = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const avatarStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(ROOT_UPLOADS, 'avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const _upload      = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: makeMimeFilter({ allowedMimes: AVATAR_MIMES }) });
const validateAvatar = validateUploadedFile(AVATAR_MIMES);

function handleAvatarUpload(req, res, next) {
  _upload.single('avatar')(req, res, (err) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: `Ошибка загрузки: ${err.message}` });
    if (err) return res.status(400).json({ error: err.message || 'Ошибка загрузки' });
    next();
  });
}

router.get('/search', authMiddleware, (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [], meta: { total: 0 } });
    const { limit, offset } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
    const users = User.search(q, req.user.id, limit, offset);
    const total = User.countSearch(q, req.user.id);
    res.json({ users, meta: paginationMeta({ limit, offset, total }) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const user = User.getById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ user: { 
      id: user.id, 
      username: user.username, 
      avatar: user.avatar, 
      status: user.status, 
      last_seen: user.last_seen,
      first_name: user.first_name,
      last_name: user.last_name,
      birth_date: user.birth_date,
      city: user.city,
      about: user.about,
      occupation: user.occupation,
      education: user.education,
      interests: user.interests ? JSON.parse(user.interests) : [],
      phone: user.phone,
      social_links: user.social_links ? JSON.parse(user.social_links) : {},
      location: user.location
    }});
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.put('/profile', authMiddleware, [
  body('username').optional().trim().isLength({ min: 2, max: 30 }),
  body('status').optional().trim().isLength({ max: 120 }),
  body('first_name').optional().trim().isLength({ max: 50 }),
  body('last_name').optional().trim().isLength({ max: 50 }),
  body('birth_date').optional().trim(),
  body('city').optional().trim().isLength({ max: 100 }),
  body('about').optional().trim().isLength({ max: 500 }),
  body('occupation').optional().trim().isLength({ max: 100 }),
  body('education').optional().trim().isLength({ max: 500 }),
  body('location').optional().trim().isLength({ max: 200 }),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('interests').optional().isArray(),
  body('social_links').optional().isObject()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { 
      username, status, first_name, last_name, birth_date, city, about,
      occupation, education, location, phone, interests, social_links 
    } = req.body;
    const updatedUser = User.updateProfile(req.user.id, { 
      username, status, first_name, last_name, birth_date, city, about,
      occupation, education, location, phone, interests, social_links 
    });
    res.json({ message: 'Профиль обновлён', user: updatedUser });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.post('/avatar', authMiddleware, uploadLimiter, handleAvatarUpload, validateAvatar, (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    const avatarUrl   = `/uploads/avatars/${req.file.filename}`;
    const updatedUser = User.updateProfile(req.user.id, { avatar: avatarUrl });
    res.json({ message: 'Аватар загружен', avatar: avatarUrl, user: updatedUser });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message || 'Ошибка сервера' }); }
});

module.exports = router;
