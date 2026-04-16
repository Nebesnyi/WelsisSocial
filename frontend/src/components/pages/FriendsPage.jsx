import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api'; // Исправленный импорт (без фигурных скобок)
import { useAuth } from '../../contexts/AuthContext';

const FriendsPage = () => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Состояния для списков
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);

  // Загрузка данных
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Загрузка подписок
      try {
        const followRes = await api.get('/follows/following');
        let fList = [];
        if (Array.isArray(followRes.data)) {
          fList = followRes.data;
        } else if (followRes.data && Array.isArray(followRes.data.users)) {
          fList = followRes.data.users;
        } else if (followRes.data && Array.isArray(followRes.data.following)) {
          fList = followRes.data.following;
        } else if (followRes.data && followRes.data.data && Array.isArray(followRes.data.data)) {
           fList = followRes.data.data;
        }
        setFollowing(fList);
      } catch (e) {
        console.warn('Не удалось загрузить подписки', e);
        setFollowing([]);
      }

      // Загрузка подписчиков
      try {
        const followersRes = await api.get('/follows/followers');
        let flList = [];
        if (Array.isArray(followersRes.data)) {
          flList = followersRes.data;
        } else if (followersRes.data && Array.isArray(followersRes.data.users)) {
          flList = followersRes.data.users;
        } else if (followersRes.data && Array.isArray(followersRes.data.followers)) {
          flList = followersRes.data.followers;
        } else if (followersRes.data && followersRes.data.data && Array.isArray(followersRes.data.data)) {
           flList = followersRes.data.data;
        }
        setFollowers(flList);
      } catch (e) {
        console.warn('Не удалось загрузить подписчиков', e);
        setFollowers([]);
      }

    } catch (err) {
      console.error('Критическая ошибка загрузки друзей:', err);
      setError('Не удалось загрузить данные о друзьях');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUnfollow = async (userId) => {
    if (!window.confirm('Отписаться от этого пользователя?')) return;
    try {
      await api.delete(`/follows/${userId}`);
      setFollowing(prev => prev.filter(u => u.id !== userId));
      setFollowers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert('Ошибка при отписке');
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Загрузка списка друзей...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  const safeFollowing = Array.isArray(following) ? following : [];
  const safeFollowers = Array.isArray(followers) ? followers : [];

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Друзья и Подписки</h1>

      {/* Вкладка: Подписки */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">
          Вы подписаны ({safeFollowing.length})
        </h2>
        {safeFollowing.length === 0 ? (
          <p className="text-gray-500 italic">Вы пока ни на кого не подписаны.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {safeFollowing.map((user) => (
              <div key={user.id} className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <Link to={`/profile/${user.id}`} className="flex-shrink-0">
                  <img 
                    src={user.avatar || '/default-avatar.png'} 
                    alt={user.username} 
                    className="w-12 h-12 rounded-full object-cover mr-3"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${user.id}`} className="font-medium hover:underline truncate block">
                    {user.username}
                  </Link>
                  {user.first_name || user.last_name ? (
                    <span className="text-xs text-gray-500 truncate block">
                      {user.first_name} {user.last_name}
                    </span>
                  ) : null}
                </div>
                <button
                  onClick={() => handleUnfollow(user.id)}
                  className="ml-2 px-3 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
                >
                  Отписаться
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Вкладка: Подписчики */}
      <div>
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">
          Ваши подписчики ({safeFollowers.length})
        </h2>
        {safeFollowers.length === 0 ? (
          <p className="text-gray-500 italic">У вас пока нет подписчиков.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {safeFollowers.map((user) => {
              const isFollowingBack = safeFollowing.some(f => f.id === user.id);
              return (
                <div key={user.id} className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                  <Link to={`/profile/${user.id}`} className="flex-shrink-0">
                    <img 
                      src={user.avatar || '/default-avatar.png'} 
                      alt={user.username} 
                      className="w-12 h-12 rounded-full object-cover mr-3"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${user.id}`} className="font-medium hover:underline truncate block">
                      {user.username}
                    </Link>
                    {user.first_name || user.last_name ? (
                      <span className="text-xs text-gray-500 truncate block">
                        {user.first_name} {user.last_name}
                      </span>
                    ) : null}
                  </div>
                  {!isFollowingBack && user.id !== currentUser?.id && (
                     <Link 
                       to={`/profile/${user.id}`}
                       className="ml-2 px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition"
                     >
                       Подписаться
                     </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;