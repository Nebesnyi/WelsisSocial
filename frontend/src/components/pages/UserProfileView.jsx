import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const ProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError('');

        // 1. Загрузка информации о пользователе
        // Предполагаем эндпоинт /users/:id или /users/profile/:id
        // Если у вас другой путь, замените его здесь
        let userData;
        try {
          const userRes = await api.get(`/users/${id}`);
          userData = userRes.data.user || userRes.data;
        } catch (e) {
          // Попытка альтернативного пути, если первый не сработал
          try {
             const altRes = await api.get(`/users/profile/${id}`);
             userData = altRes.data.user || altRes.data;
          } catch (e2) {
             throw new Error('Профиль не найден');
          }
        }
        
        setProfileUser(userData);

        // 2. Загрузка статистики (опционально, если есть отдельный эндпоинт)
        // Или вычисляем из других данных
        
        // 3. Проверка подписки
        if (currentUser && currentUser.id !== parseInt(id)) {
          try {
            const followRes = await api.get('/follows/following');
            const list = Array.isArray(followRes.data) 
              ? followRes.data 
              : (followRes.data.users || followRes.data.following || []);
            
            setIsFollowing(list.some(u => u.id === parseInt(id)));
          } catch (e) {
            setIsFollowing(false);
          }
        }

        // 4. Загрузка постов
        const postsRes = await api.get(`/posts/user/${id}?limit=10&offset=0`);
        
        let postList = [];
        if (Array.isArray(postsRes.data)) {
          postList = postsRes.data;
        } else if (postsRes.data && Array.isArray(postsRes.data.posts)) {
          postList = postsRes.data.posts;
        } else if (postsRes.data && postsRes.data.data && Array.isArray(postsRes.data.data)) {
          postList = postsRes.data.data;
        }
        
        setPosts(postList);
        setStats(prev => ({ ...prev, posts: postList.length })); // Примерное кол-во

      } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
        setError(err.response?.data?.error || 'Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [id, currentUser]);

  const handleToggleFollow = async () => {
    if (!currentUser) return;
    try {
      if (isFollowing) {
        await api.delete(`/follows/${id}`);
        setIsFollowing(false);
      } else {
        await api.post(`/follows/${id}`);
        setIsFollowing(true);
      }
    } catch (err) {
      alert('Ошибка операции');
    }
  };

  if (loading) return <div className="p-8 text-center">Загрузка профиля...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!profileUser) return <div className="p-8 text-center">Пользователь не найден</div>;

  const isMe = currentUser && currentUser.id === profileUser.id;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Шапка профиля */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 flex flex-col md:flex-row items-center md:items-start gap-6">
        <img 
          src={profileUser.avatar || '/default-avatar.png'} 
          alt={profileUser.username} 
          className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
        />
        
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold">{profileUser.username}</h1>
          {(profileUser.first_name || profileUser.last_name) && (
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {profileUser.first_name} {profileUser.last_name}
            </p>
          )}
          {profileUser.status && (
            <p className="text-gray-500 italic mt-1">{profileUser.status}</p>
          )}
          
          <div className="flex justify-center md:justify-start gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
            <span><strong>{stats.posts}</strong> публикаций</span>
            <span><strong>{stats.followers}</strong> подписчиков</span>
            <span><strong>{stats.following}</strong> подписок</span>
          </div>

          <div className="mt-6 flex justify-center md:justify-start gap-3">
            {!isMe ? (
              <button
                onClick={handleToggleFollow}
                className={`px-6 py-2 rounded-full font-medium transition ${
                  isFollowing 
                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isFollowing ? 'Отписаться' : 'Подписаться'}
              </button>
            ) : (
              <Link 
                to="/settings" 
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-full font-medium hover:bg-gray-300 transition"
              >
                Редактировать профиль
              </Link>
            )}
            <button className="px-6 py-2 border border-gray-300 rounded-full font-medium hover:bg-gray-50 transition">
              Сообщение
            </button>
          </div>
        </div>
      </div>

      {/* Секция постов */}
      <div>
        <h2 className="text-xl font-bold mb-4 border-t pt-4">Публикации</h2>
        {posts.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-white dark:bg-gray-800 rounded-lg">
            Пока нет публикаций
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center mb-3">
                  <img src={post.avatar || '/default-avatar.png'} className="w-10 h-10 rounded-full mr-3" alt="" />
                  <div>
                    <span className="font-bold block">{post.username}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className="mb-3 whitespace-pre-wrap">{post.content}</p>
                {post.image_url && (
                  <img src={post.image_url} alt="Post attachment" className="rounded-lg max-h-96 w-full object-cover mb-3" />
                )}
                <div className="flex gap-4 text-gray-500 text-sm">
                  <button className="hover:text-red-500 flex items-center gap-1">
                    ❤️ {post.likes_count || 0}
                  </button>
                  <button className="hover:text-blue-500 flex items-center gap-1">
                    💬 {post.comments_count || 0}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileView;