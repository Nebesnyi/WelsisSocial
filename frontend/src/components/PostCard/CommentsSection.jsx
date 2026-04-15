import { memo, useState, useCallback, useRef } from 'react'
import { Send, Smile } from 'lucide-react'
import { EmojiPicker } from '../EmojiPicker/EmojiPicker'
import { useEmojiInsert } from '../../hooks/usePost'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const Avatar = memo(function Avatar({ src, name, size = 28 }) {
  const colors = ['#6d5ef5', '#7c3aed', '#5b21b6', '#4c1d95']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]

  return (
    <div
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

export const CommentsSection = memo(function CommentsSection({ postId, commentsCount, api, user }) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [count, setCount] = useState(commentsCount ?? 0)
  const [error, setError] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef = useRef(null)

  const insertEmoji = useEmojiInsert(textareaRef, text, setText)

  const loadComments = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      const r = await api.get(`/posts/${postId}/comments`)
      setComments(r.data.comments || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [api, postId, loading])

  const toggle = useCallback(async () => {
    if (!open) await loadComments()
    setOpen((v) => !v)
  }, [open, loadComments])

  const submit = useCallback(
    async (e) => {
      e.preventDefault()
      const trimmed = text.trim()
      if (!trimmed || sending) return

      setSending(true)
      setError('')
      try {
        const r = await api.post(`/posts/${postId}/comments`, { content: trimmed })
        if (r.data.comment) {
          setComments((prev) => [r.data.comment, ...prev])
          setCount((c) => c + 1)
          setText('')
        }
      } catch (err) {
        setError(err?.response?.data?.error || 'Ошибка отправки')
      } finally {
        setSending(false)
      }
    },
    [text, sending, api, postId]
  )

  const avatarSrc = user?.avatar ? `${API_URL}${user.avatar}` : null

  return (
    <div>
      <button
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          padding: '6px 12px',
          color: open ? 'var(--accent)' : 'var(--text-muted)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {count > 0 && <span>{count}</span>}
        <span>Комментарий</span>
      </button>

      {open && (
        <div
          style={{
            borderTop: '1px solid var(--border-light)',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <Avatar src={avatarSrc} name={user?.username} />
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                ref={textareaRef}
                className="ui-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Написать комментарий..."
                style={{
                  width: '100%',
                  padding: '7px 36px 7px 12px',
                  fontSize: 13,
                  boxSizing: 'border-box',
                  fontFamily: '"Segoe UI", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
                }}
                maxLength={500}
              />
              <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowEmoji((v) => !v)
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 16,
                    lineHeight: 1,
                    padding: 0,
                    color: showEmoji ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  😊
                </button>
              </div>
              {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} position="top-right" />}
            </div>
            <button
              type="submit"
              disabled={!text.trim() || sending}
              style={{
                background: text.trim() ? 'var(--accent)' : 'var(--bg-surface-2)',
                color: text.trim() ? '#fff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: text.trim() ? 'pointer' : 'default',
                flexShrink: 0,
                transition: 'all var(--transition)',
              }}
            >
              <Send size={15} />
            </button>
          </form>
          {error && <p style={{ fontSize: 12, color: '#ef4444' }}>{error}</p>}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  border: '2px solid var(--border)',
                  borderTopColor: 'var(--accent)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto',
                }}
              />
            </div>
          ) : comments.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
              Нет комментариев
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
              {comments.map((c) => {
                const cAvatarSrc = c.avatar ? `${API_URL}${c.avatar}` : null
                return (
                  <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Avatar src={cAvatarSrc} name={c.username} />
                    <div
                      style={{
                        flex: 1,
                        background: 'var(--bg-surface-2)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 12px',
                      }}
                    >
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {c.username}
                      </p>
                      <p
                        style={{
                          fontSize: 13,
                          color: 'var(--text-primary)',
                          lineHeight: 1.5,
                          fontFamily: '"Segoe UI", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
                        }}
                      >
                        {c.content}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{formatDate(c.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

export default CommentsSection
