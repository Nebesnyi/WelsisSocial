const { getOne, getAll, run } = require('../config/database');

class Follow {
  static follow(followerId, followingId) {
    run(
      `INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)`,
      [followerId, followingId]
    );
  }

  static unfollow(followerId, followingId) {
    run(
      `DELETE FROM follows WHERE follower_id = ? AND following_id = ?`,
      [followerId, followingId]
    );
  }

  static isFollowing(followerId, followingId) {
    return !!getOne(
      `SELECT id FROM follows WHERE follower_id = ? AND following_id = ?`,
      [followerId, followingId]
    );
  }

  static getFollowers(userId) {
    return getAll(
      `SELECT u.id, u.username, u.avatar, u.status FROM follows f JOIN users u ON u.id = f.follower_id WHERE f.following_id = ? ORDER BY f.created_at DESC`,
      [userId]
    );
  }

  static getFollowing(userId) {
    return getAll(
      `SELECT u.id, u.username, u.avatar, u.status FROM follows f JOIN users u ON u.id = f.following_id WHERE f.follower_id = ? ORDER BY f.created_at DESC`,
      [userId]
    );
  }

  // ✅ ЭТИ МЕТОДЫ ДОЛЖНЫ БЫТЬ ВНУТРИ КЛАССА
  static getFollowersCount(userId) {
    const r = getOne(
      `SELECT COUNT(*) as n FROM follows WHERE following_id = ?`,
      [userId]
    );
    return r?.n ?? 0;
  }

  static getFollowingCount(userId) {
    const r = getOne(
      `SELECT COUNT(*) as n FROM follows WHERE follower_id = ?`,
      [userId]
    );
    return r?.n ?? 0;
  }
} // ← ✅ Закрывающая скобка класса ЗДЕСЬ

module.exports = Follow;