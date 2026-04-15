import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { PostCreator } from '../components/PostCreator/PostCreator'
import { PostList } from '../components/PostList/PostList'
import { CommentsSection } from '../components/PostCard/CommentsSection'
import { SkeletonPost } from '../components/ui/Skeleton/Skeleton'
import { useFeedLoader } from '../hooks/useFeed'

const LIMIT = 20

export default function Feed() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const { posts, loading, hasMore, offset, error, loadFeed, setPosts, setError } = useFeedLoader(api, LIMIT)

  useEffect(() => {
    loadFeed(0, true)
  }, [])

  const handleCreatePost = useCallback(
    async (fd) => {
      const r = await api.post('/posts', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPosts((prev) => [r.data.post, ...prev])
    },
    [setPosts]
  )

  const handleLike = useCallback(
    async (postId) => {
      try {
        const r = await api.post(`/posts/${postId}/like`)
        setPosts((prev) => prev.map((p) => (p.id === postId ? r.data.post : p)))
      } catch (err) {
        setError(err?.response?.data?.error || 'Ошибка')
        setTimeout(() => setError(''), 3000)
      }
    },
    [setPosts, setError]
  )

  const handleLoadMore = useCallback(() => {
    loadFeed(offset)
  }, [loadFeed, offset])

  return (
    <div style={{ minHeight: '100dvh', position: 'relative', zIndex: 1 }}>
      <header className="page-header">
        <h1 className="page-title">Лента</h1>
      </header>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>
        {user && (
          <PostCreator user={user} onCreate={handleCreatePost} onError={setError} />
        )}

        {error && (
          <div
            className="animate-fade-in"
            style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {error}
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#ef4444' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <SkeletonPost key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <MessageCircle size={40} />
            <p style={{ fontSize: 16, fontWeight: 500 }}>Лента пуста</p>
            <p style={{ fontSize: 14 }}>Подпишитесь на пользователей, чтобы видеть их посты</p>
            <button className="btn btn-primary" onClick={() => navigate('/friends')}>
              Найти людей
            </button>
          </div>
        ) : (
          <>
            <PostList
              posts={posts}
              onLike={handleLike}
              onNavigate={(id) => navigate(`/users/${id}`)}
              CommentsComponent={(props) => <CommentsSection {...props} api={api} user={user} />}
            />
            {hasMore && (
              <button
                className="btn btn-secondary"
                onClick={handleLoadMore}
                style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
              >
                Загрузить ещё
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
