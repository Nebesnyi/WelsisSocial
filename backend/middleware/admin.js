/**
 * Middleware для проверки прав администратора
 * Должен использоваться после authMiddleware
 */
function adminMiddleware(req, res, next) {
  // Проверяем, что пользователь авторизован
  if (!req.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  // Проверяем роль администратора
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора' });
  }

  next();
}

module.exports = adminMiddleware;
