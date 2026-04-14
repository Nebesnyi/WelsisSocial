import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Heart, MessageCircle, UserPlus, X, CheckCheck } from 'lucide-react'
import { getSocket } from '../../services/socket'
import api from '../../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const TYPE_META = {
  like:    { icon: Heart,         color: '#ef4444', label: 'понравился ваш пост' },
  comment: { icon: MessageCircle, color: 'var(--accent)', label: 'прокомментировал пост' },
  follow:  { icon: UserPlus,      color: 'var(--status-online)', label: 'подписался на вас' },
  message: { icon: MessageCircle, color: 'var(--accent)', label: 'написал вам сообщение' },
}

function timeAgo(str) {
  const d = new Date(str), diff = Date.now() - d
  if (diff < 60000)    return 'только что'
  if (diff < 3600000)  return `${Math.floor(diff / 60000)} мин`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function NotificationBell() {
  const navigate    = useNavigate()
  const [open, setOpen]           = useState(false)
  const [notifications, setNots]  = useState([])
  const [unread, setUnread]        = useState(0)
  const [loading, setLoading]      = useState(false)
  const panelRef = useRef(null)

  // Poll unread count every 30s
  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Socket: real-time badge increment for new notifications
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const handler = ({ type }) => {
      if (type !== 'message') {  // message notifications handled by chat
        setUnread(n => n + 1)
        if (open) fetchList()    // refresh list if panel open
      }
    }
    socket.on('notification:new', handler)
    return () => socket.off('notification:new', handler)
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function fetchCount() {
    try {
      const r = await api.get('/notifications/unread-count')
      setUnread(r.data.unread || 0)
    } catch { /* silent */ }
  }

  async function fetchList() {
    setLoading(true)
    try {
      const r = await api.get('/notifications?limit=30')
      setNots(r.data.notifications || [])
      setUnread(r.data.unread || 0)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  async function handleOpen() {
    const next = !open
    setOpen(next)
    if (next) fetchList()
  }

  async function markAllRead() {
    try {
      await api.post('/notifications/read-all')
      setNots(prev => prev.map(n => ({ ...n, is_read: 1 })))
      setUnread(0)
    } catch { /* silent */ }
  }

  function handleClick(n) {
    if (!n.is_read) {
      api.post(`/notifications/${n.id}/read`).catch(() => {})
      setNots(prev => prev.map(x => x.id === n.id ? { ...x, is_read: 1 } : x))
      setUnread(u => Math.max(0, u - 1))
    }
    setOpen(false)
    if (n.type === 'follow')  navigate(`/users/${n.actor_id}`)
    if (n.type === 'like' || n.type === 'comment') navigate('/feed')
    if (n.type === 'message') navigate('/messages')
  }

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      {/* Bell button */}
      <button
        className="btn-icon"
        onClick={handleOpen}
        title="Уведомления"
        style={{
          position: 'relative',
          width: 36, height: 36,
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: open ? 'var(--accent)' : 'var(--text-muted)',
        }}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#ef4444', color: '#fff',
            fontSize: 10, fontWeight: 700,
            borderRadius: 10, minWidth: 17, height: 17,
            padding: '0 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-surface)',
            animation: unread > 0 ? 'pulse 2s infinite' : 'none',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 340,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px 12px',
            borderBottom: '1px solid var(--border-light)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Уведомления {unread > 0 && <span style={{ color: 'var(--accent)' }}>({unread})</span>}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {unread > 0 && (
                <button className="btn-icon" onClick={markAllRead} title="Прочитать все" style={{ padding: 5 }}>
                  <CheckCheck size={15} />
                </button>
              )}
              <button className="btn-icon" onClick={() => setOpen(false)} style={{ padding: 5 }}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <Bell size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                Уведомлений пока нет
              </div>
            ) : (
              notifications.map(n => {
                const meta = TYPE_META[n.type] || TYPE_META.message
                const Icon = meta.icon
                const isUnread = !n.is_read
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '12px 16px',
                      background: isUnread ? 'var(--accent-soft)' : 'transparent',
                      border: 'none', borderBottom: '1px solid var(--border-light)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'background var(--transition)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = isUnread ? 'var(--accent-soft)' : 'transparent'}
                  >
                    {/* Actor avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'var(--accent)', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 600, color: '#fff',
                      }}>
                        {n.actor_avatar
                          ? <img src={`${API_URL}${n.actor_avatar}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : n.actor_username?.[0]?.toUpperCase()
                        }
                      </div>
                      {/* Type icon badge */}
                      <div style={{
                        position: 'absolute', right: -3, bottom: -3,
                        width: 16, height: 16, borderRadius: '50%',
                        background: meta.color,
                        border: '2px solid var(--bg-surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={8} color="#fff" />
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        <strong>{n.actor_username}</strong>{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>{meta.label}</span>
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                        {timeAgo(n.created_at)}
                      </p>
                    </div>

                    {isUnread && (
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 6 }} />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
