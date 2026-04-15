import { memo, useState, useCallback } from 'react'
import { Heart, MessageCircle, Share2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function formatDate(str) {
  if (!str) return ''
  const d = new Date(str)
  const now = new Date()
  const diff = now - d

  if (diff < 60000) return 'только что'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`
  if (diff < 86400000) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

const Avatar = memo(function Avatar({ src, name, size = 38, onClick }) {
  const colors = ['#6d5ef5', '#7c3aed', '#5b21b6', '#4c1d95']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]

  return (
    <div
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: color,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 600,
        color: '#fff',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        name?.[0]?.toUpperCase()
      )}
    </div>
  )
})

export const PostCard = memo(function PostCard({ post, onLike, onNavigate, CommentsComponent }) {
  const [expanded, setExpanded] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)

  const isLong = post.content?.length > 280

  const handleLike = useCallback(async () => {
    if (likeLoading) return
    setLikeLoading(true)
    try {
      await onLike(post.id)
    } finally {
      setLikeLoading(false)
    }
  }, [likeLoading, onLike, post.id])

  const avatarSrc = post.avatar ? `${API_URL}${post.avatar}` : null

  return (
    <article className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 10px' }}>
        <Avatar src={avatarSrc} name={post.username} onClick={() => onNavigate(post.user_id)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <button
            onClick={() => onNavigate(post.user_id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{post.username}</span>
          </button>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{formatDate(post.created_at)}</div>
        </div>
      </div>

      {post.content && (
        <div style={{ padding: '0 16px 12px' }}>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              overflow: 'hidden',
              fontFamily: '"Segoe UI", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
            }}
          >
            {expanded || !isLong ? post.content : post.content.slice(0, 280) + (isLong ? '...' : '')}
          </p>
          {isLong && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
            >
              Читать далее
            </button>
          )}
        </div>
      )}

      {post.image_url && (
        <div style={{ overflow: 'hidden', borderTop: post.content ? '1px solid var(--border-light)' : 'none' }}>
          <img
            src={`${API_URL}${post.image_url}`}
            alt=""
            style={{ width: '100%', maxHeight: 480, objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
        </div>
      )}

      <div style={{ height: 1, background: 'var(--border-light)' }} />

      <div style={{ display: 'flex', gap: 4, padding: '6px 12px' }}>
        <button
          onClick={handleLike}
          disabled={likeLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            padding: '7px 12px',
            color: post.liked_by_viewer ? 'var(--accent)' : 'var(--text-muted)',
            background: 'transparent',
            border: 'none',
            cursor: likeLoading ? 'not-allowed' : 'pointer',
            borderRadius: 'var(--radius-sm)',
            transition: 'color var(--transition)',
            opacity: likeLoading ? 0.6 : 1,
          }}
        >
          <Heart size={16} fill={post.liked_by_viewer ? 'currentColor' : 'none'} />
          {post.likes_count > 0 && <span>{post.likes_count}</span>}
          <span>Нравится</span>
        </button>

        {CommentsComponent && <CommentsComponent postId={post.id} commentsCount={post.comments_count} />}

        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            padding: '7px 12px',
            color: 'var(--text-muted)',
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <Share2 size={16} />
        </button>
      </div>
    </article>
  )
})

export default PostCard
