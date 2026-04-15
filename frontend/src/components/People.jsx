import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus, UserMinus } from 'lucide-react'
import api from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function People() {
  const navigate = useNavigate()
  const [query, setQuery]           = useState('')
  const [people, setPeople]         = useState([])
  const [followingMap, setFollowingMap] = useState({})
  const [error, setError]           = useState('')

  useEffect(() => {
    if (query.length < 2) { setPeople([]); return }
    const t = setTimeout(() => searchPeople(query), 350)
    return () => clearTimeout(t)
  }, [query])

  async function searchPeople(value) {
    try {
      const r = await api.get(`/users/search?q=${encodeURIComponent(value)}`)
      const users = r.data.users || []
      setPeople(users)
      const statuses = {}
      await Promise.all(users.map(async u => {
        try {
          const s = await api.get(`/follows/${u.id}/status`)
          statuses[u.id] = s.data.following
        } catch { statuses[u.id] = false }
      }))
      setFollowingMap(statuses)
    } catch { setError('Ошибка поиска пользователей') }
  }

  async function toggleFollow(userId) {
    try {
      if (followingMap[userId]) await api.delete(`/follows/${userId}`)
      else await api.post(`/follows/${userId}`)
      setFollowingMap(prev => ({ ...prev, [userId]: !prev[userId] }))
    } catch { /* silent */ }
  }

  const colors = ['#6d5ef5','#7c3aed','#5b21b6']

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="ui-input"
          placeholder="Найти пользователя..."
          style={{ paddingLeft: 36 }}
        />
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {people.map(p => {
          const bg = colors[(p.username?.charCodeAt(0) || 0) % colors.length]
          return (
            <div key={p.id} className="card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => navigate(`/users/${p.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', background: bg, overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, color: '#fff',
                }}>
                  {p.avatar
                    ? <img src={`${API_URL}${p.avatar}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : p.username?.[0]?.toUpperCase()
                  }
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{p.username}</span>
              </button>
              <button
                className={followingMap[p.id] ? 'btn btn-secondary' : 'btn btn-primary'}
                style={{ padding: '7px 12px', fontSize: 12, gap: 5 }}
                onClick={() => toggleFollow(p.id)}
              >
                {followingMap[p.id] ? <><UserMinus size={13} /> Отписаться</> : <><UserPlus size={13} /> Подписаться</>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
