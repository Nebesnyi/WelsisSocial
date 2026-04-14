import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check, X, LogOut, Edit2, Mail, User, Heart, MessageCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const TABS = ['Посты', 'Информация']

export default function Profile() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername]   = useState(user?.username || '')
  const [loading, setLoading]     = useState(false)
  const [msg, setMsg]             = useState('')
  const [editing, setEditing]     = useState(false)
  const [activeTab, setActiveTab] = useState('Посты')
  const [posts, setPosts]         = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [followStats, setFollowStats]   = useState({ followersCount: 0, followingCount: 0 })

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 3000)
    return () => clearTimeout(t)
  }, [msg])

  useEffect(() => { if (user) loadData() }, [user?.id])

  async function loadData() {
    setPostsLoading(true)
    try {
      const [postsRes, followRes] = await Promise.all([
        api.get(`/posts/user/${user.id}`),
        api.get('/follows/me'),
      ])
      setPosts(postsRes.data.posts || [])
      setFollowStats({
        followersCount: followRes.data.followersCount ?? 0,
        followingCount: followRes.data.followingCount ?? 0,
      })
    } catch { setPosts([]) }
    finally { setPostsLoading(false) }
  }

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true); setMsg('')
    try {
      const r = await api.put('/users/profile', { username })
      updateUser(r.data.user)
      setMsg('ok')
      setEditing(false)
    } catch { setMsg('err') }
    finally { setLoading(false) }
  }

  async function handleAvatar(e) {
    const file = e.target.files[0]; if (!file) return
    const fd = new FormData(); fd.append('avatar', file)
    try {
      setLoading(true)
      const r = await api.post('/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      updateUser(r.data.user); setMsg('avatar_ok')
    } catch { setMsg('err') }
    finally { setLoading(false); e.target.value = '' }
  }

  async function toggleLike(postId) {
    try {
      const r = await api.post(`/posts/${postId}/like`)
      setPosts(prev => prev.map(p => p.id === postId ? r.data.post : p))
    } catch { /* silent */ }
  }

  return (
    <div style={{ minHeight:'100dvh', position:'relative', zIndex:1 }}>

      {/* ── Шапка профиля ── */}
      <div style={{ position:'relative' }}>
        {/* Градиент-баннер */}
        <div style={{
          height: 200,
          background: 'linear-gradient(135deg, #6d5ef5 0%, #a78bfa 50%, #60a5fa 100%)',
        }} />

        {/* Белая/тёмная подложка с аватаром */}
        <div style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          paddingBottom: 16,
        }}>
          <div style={{ maxWidth:680, margin:'0 auto', padding:'0 20px' }}>
            <div style={{ display:'flex', alignItems:'flex-end', gap:16, marginTop:-52, flexWrap:'wrap' }}>

              {/* Аватар */}
              <div style={{ position:'relative', flexShrink:0 }}>
                <div style={{
                  width:100, height:100, borderRadius:'50%',
                  border:'4px solid var(--bg-surface)',
                  background:'var(--accent)', overflow:'hidden',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:36, fontWeight:700, color:'#fff',
                  boxShadow:'0 4px 20px rgba(0,0,0,0.2)',
                }}>
                  {user?.avatar
                    ? <img src={`${API_URL}${user.avatar}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : user?.username?.[0]?.toUpperCase()
                  }
                </div>
                <label style={{
                  position:'absolute', bottom:2, right:2,
                  width:30, height:30, borderRadius:'50%',
                  background:'var(--accent)', border:'3px solid var(--bg-surface)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', boxShadow:'var(--shadow-sm)',
                }}>
                  <Camera size={13} color="#fff" />
                  <input type="file" accept="image/*" onChange={handleAvatar} style={{ display:'none' }} />
                </label>
              </div>

              {/* Имя + кнопки */}
              <div style={{ flex:1, minWidth:0, paddingBottom:4, paddingTop:8 }}>
                <h1 style={{ fontSize:22, fontWeight:700, color:'var(--text-primary)', lineHeight:1.2 }}>
                  {user?.username}
                </h1>
                <p style={{ fontSize:13, color:'var(--status-online)', marginTop:3, display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--status-online)', display:'inline-block' }} />
                  в сети
                </p>
              </div>

              <div style={{ display:'flex', gap:8, paddingBottom:4 }}>
                <button className="btn btn-secondary" onClick={() => setEditing(v => !v)} style={{ gap:6, fontSize:13 }}>
                  <Edit2 size={14} /> {editing ? 'Отмена' : 'Редактировать'}
                </button>
                <button className="btn btn-danger" onClick={logout} style={{ gap:6, fontSize:13 }}>
                  <LogOut size={14} /> Выйти
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'16px 20px' }}>

        {/* Статистика */}
        <div className="card" style={{ padding:'14px 20px', marginBottom:16, display:'flex', gap:32 }}>
          <StatItem label="Публикаций"  value={posts.length} />
          <StatItem label="Подписчики"  value={followStats.followersCount} />
          <StatItem label="Подписки"    value={followStats.followingCount} />
        </div>

        {/* Уведомление */}
        {msg && (
          <div className="animate-fade-in" style={{
            marginBottom:14, padding:'10px 14px', borderRadius:'var(--radius-sm)',
            background: msg === 'err' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
            border: `1px solid ${msg === 'err' ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
            color: msg === 'err' ? '#ef4444' : '#16a34a', fontSize:13,
            display:'flex', alignItems:'center', gap:8,
          }}>
            {msg === 'err' ? <X size={14} /> : <Check size={14} />}
            {msg === 'ok' ? 'Профиль обновлён' : msg === 'avatar_ok' ? 'Аватар загружен' : 'Произошла ошибка'}
          </div>
        )}

        {/* Форма редактирования */}
        {editing && (
          <div className="card animate-fade-in" style={{ padding:20, marginBottom:20 }}>
            <h2 style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)', marginBottom:16 }}>Редактировать профиль</h2>
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={labelStyle}><Mail size={13} /> Email</label>
                <input className="ui-input" type="email" value={user?.email || ''} disabled style={{ opacity:0.5 }} />
              </div>
              <div>
                <label style={labelStyle}><User size={13} /> Имя пользователя</label>
                <input className="ui-input" type="text" value={username} onChange={e => setUsername(e.target.value)} minLength={2} maxLength={30} />
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Сохраняем...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Вкладки */}
        <div className="tabs" style={{ marginBottom:16 }}>
          {TABS.map(t => (
            <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
          ))}
        </div>

        {/* Посты */}
        {activeTab === 'Посты' && (
          postsLoading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[1,2,3].map(i => (
                <div key={i} className="card" style={{ padding:16, height:100 }}>
                  <div style={{ height:10, width:'80%', background:'var(--border)', borderRadius:6, marginBottom:8, animation:'pulse 1.5s infinite' }} />
                  <div style={{ height:10, width:'55%', background:'var(--border-light)', borderRadius:6, animation:'pulse 1.5s infinite' }} />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state" style={{ padding:'32px 0' }}>
              <p style={{ fontSize:14 }}>Вы ещё ничего не публиковали</p>
              <button className="btn btn-primary" style={{ marginTop:8 }} onClick={() => navigate('/feed')}>
                Перейти в ленту
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {posts.map(post => (
                <article key={post.id} className="card" style={{ padding:0, overflow:'hidden' }}>
                  {post.image_url && (
                    <img
                      src={`${API_URL}${post.image_url}`}
                      alt=""
                      style={{ width:'100%', maxHeight:360, objectFit:'cover', display:'block' }}
                    />
                  )}
                  {post.content && (
                    <div style={{ padding:'12px 16px 8px' }}>
                      <p style={{ fontSize:14, lineHeight:1.6, color:'var(--text-primary)', whiteSpace:'pre-wrap' }}>{post.content}</p>
                    </div>
                  )}
                  <div style={{ height:1, background:'var(--border-light)' }} />
                  <div style={{ display:'flex', gap:4, padding:'6px 12px', alignItems:'center' }}>
                    <button
                      className="btn-ghost"
                      onClick={() => toggleLike(post.id)}
                      style={{
                        display:'flex', alignItems:'center', gap:6, fontSize:13, padding:'6px 12px',
                        color: post.liked_by_viewer ? 'var(--accent)' : 'var(--text-muted)',
                        cursor:'pointer', border:'none', background:'transparent',
                      }}
                    >
                      <Heart size={15} fill={post.liked_by_viewer ? 'currentColor' : 'none'} />
                      {post.likes_count > 0 && <span>{post.likes_count}</span>}
                    </button>
                    <button
                      className="btn-ghost"
                      style={{
                        display:'flex', alignItems:'center', gap:6, fontSize:13, padding:'6px 12px',
                        color:'var(--text-muted)', cursor:'pointer', border:'none', background:'transparent',
                      }}
                    >
                      <MessageCircle size={15} />
                      {post.comments_count > 0 && <span>{post.comments_count}</span>}
                    </button>
                    <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-muted)' }}>
                      {new Date(post.created_at).toLocaleDateString('ru-RU', { day:'numeric', month:'short' })}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )
        )}

        {/* Информация */}
        {activeTab === 'Информация' && (
          <div className="card" style={{ padding:20 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <InfoRow icon={<Mail size={15} />}  label="Email"  value={user?.email} />
              <InfoRow icon={<User size={15} />}  label="Имя"    value={user?.username} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatItem({ label, value }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
      <span style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)' }}>{value ?? '—'}</span>
      <span style={{ fontSize:12, color:'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ color:'var(--accent)', flexShrink:0 }}>{icon}</div>
      <span style={{ fontSize:13, color:'var(--text-muted)', width:80, flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:14, color:'var(--text-primary)', fontWeight:500 }}>{value || '—'}</span>
    </div>
  )
}

const labelStyle = {
  display:'flex', alignItems:'center', gap:6,
  fontSize:12, fontWeight:600, color:'var(--text-muted)',
  marginBottom:6, textTransform:'uppercase', letterSpacing:'0.4px',
}
