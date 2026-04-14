import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, TrendingUp, UserPlus, UserMinus } from 'lucide-react'
import { formatLastSeen } from '../../utils/formatTime'
import api from '../../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function MiniAvatar({ src, name, size = 32, isOnline }) {
  const colors = ['#6d5ef5','#7c3aed','#5b21b6','#4c1d95']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, color: '#fff', overflow: 'hidden',
      position: 'relative',
    }}>
      {src
        ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : name?.[0]?.toUpperCase()
      }
      {isOnline && (
        <span style={{
          position: 'absolute', right: -1, bottom: -1,
          width: 9, height: 9, borderRadius: '50%',
          background: 'var(--status-online)',
          border: '2px solid var(--bg-sidebar)',
        }} />
      )}
    </div>
  )
}

export default function RightSidebar() {
  const navigate = useNavigate()
  const [following, setFollowing]     = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [followingMap, setFollowingMap] = useState({})
  const [loading, setLoading]         = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const followsRes = await api.get('/follows/me')
      const list = followsRes.data.following || []
      setFollowing(list)

      const searchRes = await api.get('/users/search?q=a&limit=10')
      const allUsers = searchRes.data.users || []
      const followingIds = new Set(list.map(u => u.id))
      setSuggestions(allUsers.filter(u => !followingIds.has(u.id)).slice(0, 4))

      const map = {}
      list.forEach(u => { map[u.id] = true })
      setFollowingMap(map)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  async function toggleFollow(userId) {
    const prev = followingMap[userId]
    setFollowingMap(m => ({ ...m, [userId]: !prev }))
    try {
      if (prev) await api.delete(`/follows/${userId}`)
      else await api.post(`/follows/${userId}`)
    } catch {
      setFollowingMap(m => ({ ...m, [userId]: prev }))
    }
  }

  const onlineFollowing = following.filter(u => u.status === 'online')

  return (
    <aside className="right-sidebar">
      {/* Онлайн сейчас */}
      <section>
        <div className="right-sidebar-title">
          <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
            <Users size={12} /> Онлайн сейчас
          </span>
        </div>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--border)', animation:'pulse 1.5s infinite', flexShrink:0 }} />
                <div style={{ height:10, flex:1, background:'var(--border-light)', borderRadius:6, animation:'pulse 1.5s infinite' }} />
              </div>
            ))}
          </div>
        ) : onlineFollowing.length === 0 ? (
          <p style={{ fontSize:13, color:'var(--text-muted)', padding:'6px 8px' }}>Никого нет онлайн</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {onlineFollowing.map(u => (
              <button key={u.id} className="online-user-row" onClick={() => navigate(`/users/${u.id}`)}>
                <MiniAvatar src={u.avatar ? `${API_URL}${u.avatar}` : null} name={u.username} isOnline />
                <div style={{ minWidth:0 }}>
                  <span className="online-user-name">{u.username}</span>
                  <p style={{ fontSize:10, color:'var(--status-online)', marginTop:1 }}>онлайн</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Возможно знакомы */}
      {!loading && suggestions.length > 0 && (
        <section>
          <div className="right-sidebar-title">
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <TrendingUp size={12} /> Возможно знакомы
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {suggestions.map(u => (
              <div key={u.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 8px' }}>
                <button
                  style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', flex:1, minWidth:0 }}
                  onClick={() => navigate(`/users/${u.id}`)}
                >
                  <MiniAvatar src={u.avatar ? `${API_URL}${u.avatar}` : null} name={u.username} size={28} isOnline={u.status === 'online'} />
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {u.username}
                    </p>
                    <p style={{ fontSize:11, color:'var(--text-muted)' }}>
                      {formatLastSeen(u.status, u.last_seen)}
                    </p>
                  </div>
                </button>
                <button
                  className="btn-icon"
                  title={followingMap[u.id] ? 'Отписаться' : 'Подписаться'}
                  onClick={() => toggleFollow(u.id)}
                  style={{ color: followingMap[u.id] ? 'var(--accent)' : 'var(--text-muted)', cursor:'pointer' }}
                >
                  {followingMap[u.id] ? <UserMinus size={14} /> : <UserPlus size={14} />}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{ marginTop:'auto', fontSize:11, color:'var(--text-muted)', padding:'0 8px' }}>
        Vibe Messenger © 2026
      </div>
    </aside>
  )
}
