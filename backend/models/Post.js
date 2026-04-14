const { getOne, getAll, run } = require('../config/database');

class Post {
  static create(userId, content, imageUrl = null) {
    const { lastInsertRowid } = run(
      `INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)`,
      [userId, content, imageUrl]
    );
    return this.getById(lastInsertRowid);
  }

  static getById(id, viewerId = null) {
    return getOne(
      `SELECT p.*, p.image_url,
          u.username,
          u.avatar,
          (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
          (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) AS comments_count,
          ${viewerId ? '(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) AS liked_by_viewer' : '0 AS liked_by_viewer'}
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      viewerId ? [viewerId, id] : [id]
    );
  }

  static getFeed(userId, limit = 20, offset = 0) {
    return getAll(
      `SELECT p.*,
          u.username,
          u.avatar,
          (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
          (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) AS comments_count,
          EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) AS liked_by_viewer
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ?
          OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, userId, limit, offset]
    );
  }

  static countFeed(userId) {
    const r = getOne(
      `SELECT COUNT(*) as n FROM posts p
       WHERE p.user_id = ?
          OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)`,
      [userId, userId]
    );
    return r?.n ?? 0;
  }

  static getByAuthor(authorId, viewerId, limit = 20, offset = 0) {
    return getAll(
      `SELECT p.*,
          u.username,
          u.avatar,
          (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
          (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) AS comments_count,
          EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) AS liked_by_viewer
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [viewerId, authorId, limit, offset]
    );
  }

  static countByAuthor(authorId) {
    const r = getOne(
      `SELECT COUNT(*) as n FROM posts WHERE user_id = ?`,
      [authorId]
    );
    return r?.n ?? 0;
  }

  static toggleLike(postId, userId) {
    const liked = getOne(
      `SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?`,
      [postId, userId]
    );
    if (liked) {
      run(`DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`, [postId, userId]);
      return false;
    }
    run(`INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)`, [postId, userId]);
    return true;
  }

  static addComment(postId, userId, content) {
    const { lastInsertRowid } = run(
      `INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)`,
      [postId, userId, content]
    );
    return getOne(
      `SELECT c.*, u.username, u.avatar
       FROM post_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`,
      [lastInsertRowid]
    );
  }

  static getComments(postId, limit = 20, offset = 0) {
    return getAll(
      `SELECT c.*, u.username, u.avatar
       FROM post_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ?
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [postId, limit, offset]
    );
  }
}

module.exports = Post;
