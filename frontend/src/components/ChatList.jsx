import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Edit, X, Search, MessageCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getSocket } from '../services/socket'
import api from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function Avatar({ src, name, size = 48 }) {
  const colors = ['#6d5ef5','#7c3aed','#5b21b6','#4c1d95']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, color: '#fff',
    }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name?.[0]?.toUpperCase()}
    </div>
  )
}

function formatTime(str) {
  if (!str) return ''
  const d = new Date(str), now = new Date(), diff = now - d
  if (diff < 60000) return 'только что'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин`
  if (diff < 86400000) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function getPreview(chat) {
  if (chat.last_message?.trim()) return chat.last_message
  const t = chat.last_file_type || ''
  if (t.startsWith('image/')) return '🖼️ Изображение'
  if (t.startsWith('audio/')) return '🎤 Голосовое'
  if (t.startsWith('video/')) return '🎬 Видео'
  if (t) return '📎 Файл'
  return chat.message_count > 0 ? 'Сообщение' : null
}

export default function ChatList() {
  const [chats, setChats]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showNewChat, setShowNewChat]   = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError]               = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadChats()
    const socket = getSocket()
    if (socket) {
      // Именованные функции — критично для точного socket.off()
      // socket.off(event) без хэндлера убивает ВСЕ слушатели глобально,
      // включая те, что зарегистрированы в ChatWindow и других компонентах.
      const onUserOnline  = ({ userId }) => updateOnline(userId, true)
      const onUserOffline = ({ userId }) => updateOnline(userId, false)

      socket.on('message:new',  handleNewMessage)
      socket.on('user:online',  onUserOnline)
      socket.on('user:offline', onUserOffline)

      return () => {
        socket.off('message:new',  handleNewMessage)
        socket.off('user:online',  onUserOnline)
        socket.off('user:offline', onUserOffline)
      }
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => handleSearch(searchQuery), 350)
    return () => clearTimeout(t)
  }, [searchQuery])

  async function loadChats() {
    try {
      const r = await api.get('/chats')
      setChats((r.data.chats || []).map(c => ({ ...c, online: c.type === 'private' ? c.other_status === 'online' : false })))
    } catch { setError('Не удалось загрузить чаты') }
    finally { setLoading(false) }
  }

  function handleNewMessage({ message }) {
    setChats(prev => {
      const idx = prev.findIndex(c => c.id === message.chat_id)
      if (idx === -1) return prev
      const updated = [...prev]
      updated[idx] = { ...updated[idx], last_message: message.content || '📎 Файл', last_message_at: message.created_at }
      return [updated[idx], ...updated.filter((_, i) => i !== idx)]
    })
  }

  function updateOnline(userId, online) {
    setChats(prev => prev.map(c => String(c.other_user_id) === String(userId) ? { ...c, online } : c))
  }

  async function handleSearch(q) {
    if (q.length < 2) { setSearchResults([]); return }
    setSearchLoading(true)
    try {
      const r = await api.get(`/users/search?q=${encodeURIComponent(q)}`)
      setSearchResults(r.data.users || [])
    } catch { /* silent */ }
    finally { setSearchLoading(false) }
  }

  async function createPrivateChat(userId) {
    try {
      const r = await api.post('/chats/private', { userId })
      setShowNewChat(false); setSearchQuery(''); setSearchResults([])
      const chatId = r.data?.chat?.id
      if (chatId) navigate(`/chat/${chatId}`)
      else loadChats()
    } catch { setError('Не удалось создать чат') }
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
      <div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      <header className="page-header" style={{ justifyContent: 'space-between' }}>
        <h1 className="page-title">Сообщения</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowNewChat(true)}
          style={{ gap: 6, fontSize: 13, padding: '7px 14px' }}
        >
          <Edit size={14} /> Новый чат
        </button>
      </header>

      {showNewChat && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '80px 16px 16px' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowNewChat(false); setSearchQuery(''); setSearchResults([]) } }}
        >
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 420, padding: 20, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Новый чат</h2>
              <button className="btn-icon" onClick={() => { setShowNewChat(false); setSearchQuery(''); setSearchResults([]) }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="ui-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Найти пользователя..."
                style={{ paddingLeft: 36 }}
                autoFocus
              />
            </div>
            {searchLoading && <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 16 }}>Ищем...</p>}
            {searchResults.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 280, overflowY: 'auto' }}>
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => createPrivateChat(u.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      width: '100%', textAlign: 'left',
                      transition: 'background var(--transition)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Avatar src={u.avatar ? `${API_URL}${u.avatar}` : null} name={u.username} size={40} />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{u.username}</p>
                      <p style={{ fontSize: 12, color: u.status === 'online' ? 'var(--status-online)' : 'var(--text-muted)' }}>
                        {u.status === 'online' ? 'онлайн' : 'офлайн'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 16 }}>Никого не нашли</p>
            )}
          </div>
        </div>
      )}

      <main style={{ flex: 1 }}>
        {error && (
          <div style={{ margin: '8px 16px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13 }}>
            {error}
          </div>
        )}

        {chats.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 60 }}>
            <MessageCircle size={44} />
            <p style={{ fontSize: 16, fontWeight: 500 }}>Нет сообщений</p>
            <p style={{ fontSize: 13 }}>Начните новый чат, нажав кнопку выше</p>
          </div>
        ) : (
          chats.map(chat => {
            const avatarSrc = chat.other_avatar ? `${API_URL}${chat.other_avatar}` : null
            const name = chat.name || chat.other_members || 'Чат'
            const isOnline = chat.type === 'private' && chat.online === true
            const preview = getPreview(chat)
            return (
              <Link
                key={chat.id}
                to={`/chat/${chat.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border-light)',
                  textDecoration: 'none',
                  transition: 'background var(--transition)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar src={avatarSrc} name={name} size={50} />
                  {chat.type === 'private' && (
                    <span style={{
                      position: 'absolute', right: 1, bottom: 1,
                      width: 11, height: 11, borderRadius: '50%',
                      background: isOnline ? 'var(--status-online)' : 'var(--status-offline)',
                      border: '2px solid var(--bg-surface)',
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                      {formatTime(chat.last_message_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {preview || <em style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Нет сообщений</em>}
                  </p>
                </div>
                {chat.unread_count > 0 && (
                  <div style={{
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 11, fontWeight: 600, borderRadius: 10,
                    minWidth: 19, height: 19, padding: '0 5px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {chat.unread_count > 99 ? '99+' : chat.unread_count}
                  </div>
                )}
              </Link>
            )
          })
        )}
      </main>
    </div>
  )
}
