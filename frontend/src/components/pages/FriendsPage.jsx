import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus, UserMinus, MessageCircle, Users, Wifi, Clock } from 'lucide-react'
import api from '../../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const STATUS_COLORS = { online: 'var(--status-online)', away: 'var(--status-away)', busy: 'var(--status-busy)', offline: 'var(--status-offline)' }
const STATUS_LABELS = { online: 'Онлайн', away: 'Отошёл', busy: 'Занят', offline: 'Оффлайн' }

function UserCard({ user, isFollowing, followLoading, onToggleFollow, onMessage, onProfile }) {
  const colors = ['#6d5ef5','#7c3aed','#5b21b6']
  const bg = colors[(user.username?.charCodeAt(0) || 0) % colors.length]

  return (
    <div className="card animate-fade-in" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div onClick={() => onProfile(user.id)} style={{
        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
        background: bg, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, fontWeight: 600, color: '#fff', cursor: 'pointer', position: 'relative',
      }}>
        {user.avatar
          ? <img src={`${API_URL}${user.avatar}`} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : user.username?.[0]?.toUpperCase()
        }
        <span style={{
          position: 'absolute', right: 1, bottom: 1,
          width: 11, height: 11, borderRadius: '50%',
          background: STATUS_COLORS[user.status] || STATUS_COLORS.offline,
          border: '2px solid var(--bg-surface)',
        }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <button onClick={() => onProfile(user.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{user.username}</p>
        </button>
        <p style={{ fontSize: 12, color: STATUS_COLORS[user.status] || 'var(--text-muted)', marginTop: 2 }}>
          {STATUS_LABELS[user.status] || 'Оффлайн'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-icon" onClick={() => onMessage(user.id)} title="Написать">
          <MessageCircle size={16} />
        </button>
        <button
          className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'}
          onClick={() => onToggleFollow(user.id)}
          disabled={followLoading}
          style={{ padding: '6px 12px', fontSize: 12, gap: 5 }}
        >
          {isFollowing ? <><UserMinus size={13} /> Отписаться</> : <><UserPlus size={13} /> Подписаться</>}
        </button>
      </div>
    </div>
  )
}

export default function FriendsPage() {
  const navigate = useNavigate()
  const [tab, setTab]             = useState('following')
  const [query, setQuery]         = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [following, setFollowing] = useState([])   // actual following list
  const [followingMap, setFollowingMap]   = useState({})
  const [loadingMap, setLoadingMap]       = useState({})
  const [loading, setLoading]     = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError]         = useState('')

  // Load own following list on mount (FIX: tabs now have real data)
  useEffect(() => {
    loadFollowing()
  }, [])

  async function loadFollowing() {
    setInitialLoad(true)
    try {
      const r = await api.get('/follows/me')
      const list = r.data.following || []
      setFollowing(list)
      const map = {}
      list.forEach(u => { map[u.id] = true })
      setFollowingMap(map)
    } catch { /* silent */ }
    finally { setInitialLoad(false) }
  }

  // Search with debounce — FIX: N+1 eliminated, follow status from /follows/me map
  useEffect(() => {
    if (tab !== 'search') return
    if (query.length < 2) { setSearchResults([]); return }
    const t = setTimeout(() => search(query), 350)
    return () => clearTimeout(t)
  }, [query, tab])

  async function search(q) {
    setLoading(true)
    try {
      const r = await api.get(`/users/search?q=${encodeURIComponent(q)}`)
      const users = r.data.users || []
      setSearchResults(users)
      // FIX: follow status from already-loaded followingMap, no extra requests
    } catch { setError('Ошибка поиска') }
    finally { setLoading(false) }
  }

  async function toggleFollow(userId) {
    if (loadingMap[userId]) return
    const prev = followingMap[userId]
    setFollowingMap(m => ({ ...m, [userId]: !prev }))
    setLoadingMap(m => ({ ...m, [userId]: true }))
    try {
      if (prev) {
        await api.delete(`/follows/${userId}`)
        setFollowing(list => list.filter(u => u.id !== userId))
      } else {
        await api.post(`/follows/${userId}`)
        // Reload following list to get fresh data
        await loadFollowing()
      }
    } catch {
      setFollowingMap(m => ({ ...m, [userId]: prev })) // revert
    } finally {
      setLoadingMap(m => ({ ...m, [userId]: false }))
    }
  }

  async function startChat(userId) {
    try {
      const r = await api.post('/chats/private', { userId })
      navigate(r.data?.chat?.id ? `/chat/${r.data.chat.id}` : '/messages')
    } catch { navigate('/messages') }
  }

  const tabs = [
    { key: 'following', label: 'Подписки', icon: Users },
    { key: 'online',    label: 'Онлайн',   icon: Wifi },
    { key: 'search',    label: 'Поиск',    icon: Search },
  ]

  // Compute displayed list per tab (FIX: all tabs have distinct real data)
  const displayList = tab === 'search'
    ? searchResults
    : tab === 'online'
      ? following.filter(u => u.status === 'online')
      : following

  return (
    <div style={{ minHeight: '100dvh', position: 'relative', zIndex: 1 }}>
      <header className="page-header">
        <h1 className="page-title">Друзья</h1>
      </header>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px' }}>
        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          {tabs.map(t => {
            const Icon = t.icon
            const badge = t.key === 'online' ? following.filter(u => u.status === 'online').length : null
            return (
              <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={14} />
                {t.label}
                {badge != null && badge > 0 && (
                  <span style={{
                    background: 'var(--status-online)', color: '#fff',
                    fontSize: 10, fontWeight: 600, borderRadius: 10,
                    minWidth: 16, height: 16, padding: '0 4px',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>{badge}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search bar — only in search tab */}
        {tab === 'search' && (
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={query} onChange={e => setQuery(e.target.value)}
              className="ui-input" placeholder="Найти пользователя..."
              style={{ paddingLeft: 38 }} autoFocus />
          </div>
        )}

        {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        {/* Spinner */}
        {(loading || (tab !== 'search' && initialLoad)) && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        )}

        {/* Empty states */}
        {!loading && !initialLoad && tab === 'search' && query.length >= 2 && displayList.length === 0 && (
          <div className="empty-state"><Users size={36} /><p>Никого не найдено</p></div>
        )}
        {!loading && !initialLoad && tab === 'search' && query.length < 2 && (
          <div className="empty-state">
            <Search size={36} />
            <p style={{ fontSize: 15, fontWeight: 500 }}>Поиск пользователей</p>
            <p style={{ fontSize: 13 }}>Введите имя или email</p>
          </div>
        )}
        {!loading && !initialLoad && tab === 'following' && displayList.length === 0 && (
          <div className="empty-state">
            <Users size={36} />
            <p style={{ fontSize: 15, fontWeight: 500 }}>Нет подписок</p>
            <p style={{ fontSize: 13 }}>Найдите людей во вкладке «Поиск»</p>
            <button className="btn btn-primary" onClick={() => setTab('search')}>Найти людей</button>
          </div>
        )}
        {!loading && !initialLoad && tab === 'online' && displayList.length === 0 && (
          <div className="empty-state">
            <Wifi size={36} />
            <p style={{ fontSize: 15, fontWeight: 500 }}>Никого нет онлайн</p>
            <p style={{ fontSize: 13 }}>Из ваших подписок никого нет в сети</p>
          </div>
        )}

        {/* Results */}
        {!loading && !initialLoad && displayList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayList.map(u => (
              <UserCard
                key={u.id}
                user={u}
                isFollowing={!!followingMap[u.id]}
                followLoading={!!loadingMap[u.id]}
                onToggleFollow={toggleFollow}
                onMessage={startChat}
                onProfile={id => navigate(`/users/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
