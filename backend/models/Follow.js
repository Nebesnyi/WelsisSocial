const { getOne, getAll, run } = require('../config/database');

class Follow {
  static follow(followerId, followingId) {
    run(
      `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT (follower_id, following_id) DO NOTHING`,
      [followerId, followingId]
    );
  }

  static unfollow(followerId, followingId) {
    run(
      `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
  }

  static isFollowing(followerId, followingId) {
    return !!getOne(
      `SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
  }

  static getFollowers(userId) {
    return getAll(
      `SELECT u.id, u.username, u.avatar, u.status FROM follows f JOIN users u ON u.id = f.follower_id WHERE f.following_id = $1 ORDER BY f.created_at DESC`,
      [userId]
    );
  }

  static getFollowing(userId) {
    return getAll(
      `SELECT u.id, u.username, u.avatar, u.status FROM follows f JOIN users u ON u.id = f.following_id WHERE f.follower_id = $1 ORDER BY f.created_at DESC`,
      [userId]
    );
  }

  // ✅ ЭТИ МЕТОДЫ ДОЛЖНЫ БЫТЬ ВНУТРИ КЛАССА
  static getFollowersCount(userId) {
    const r = getOne(
      `SELECT COUNT(*) as n FROM follows WHERE following_id = $1`,
      [userId]
    );
    return r?.n ?? 0;
  }

  static getFollowingCount(userId) {
    const r = getOne(
      `SELECT COUNT(*) as n FROM follows WHERE follower_id = $1`,
      [userId]
    );
    return r?.n ?? 0;
  }
}

module.exports = Follow;