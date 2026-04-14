import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageCircle, UserPlus, UserMinus, ArrowLeft, Heart } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { formatLastSeen } from '../../utils/formatTime'
import api from '../../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function Skeleton() {
  return (
    <div style={{ minHeight:'100dvh', position:'relative', zIndex:1 }}>
      <div style={{ height:200, background:'linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #2563eb 100%)' }} />
      <div style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border)', paddingBottom:16 }}>
        <div style={{ maxWidth:680, margin:'0 auto', padding:'0 20px' }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:16, marginTop:-52 }}>
            <div style={{ width:100, height:100, borderRadius:'50%', background:'var(--border)', border:'4px solid var(--bg-surface)', animation:'pulse 1.5s infinite', flexShrink:0 }} />
            <div style={{ flex:1, paddingBottom:4, paddingTop:8 }}>
              <div style={{ height:18, width:'40%', background:'var(--border)', borderRadius:6, marginBottom:8, animation:'pulse 1.5s infinite' }} />
              <div style={{ height:12, width:'20%', background:'var(--border-light)', borderRadius:6, animation:'pulse 1.5s infinite' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PostCard({ post, onLike }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = post.content?.length > 280
  return (
    <article className="card" style={{ padding:0, overflow:'hidden' }}>
      {post.image_url && (
        <img src={`${API_URL}${post.image_url}`} alt="" style={{ width:'100%', maxHeight:360, objectFit:'cover', display:'block' }} />
      )}
      {post.content && (
        <div style={{ padding:'12px 16px 8px' }}>
          <p style={{
            fontSize:14, lineHeight:1.6, color:'var(--text-primary)', whiteSpace:'pre-wrap',
            overflow:'hidden', display:'-webkit-box', WebkitBoxOrient:'vertical',
            WebkitLineClamp: expanded || !isLong ? 'unset' : 4,
          }}>
            {post.content}
          </p>
          {isLong && !expanded && (
            <button onClick={() => setExpanded(true)} style={{ fontSize:13, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', padding:'4px 0' }}>
              Читать далее
            </button>
          )}
        </div>
      )}
      <div style={{ height:1, background:'var(--border-light)' }} />
      <div style={{ display:'flex', gap:4, padding:'6px 12px', alignItems:'center' }}>
        <button
          onClick={() => onLike(post.id)}
          style={{
            display:'flex', alignItems:'center', gap:6, fontSize:13, padding:'6px 12px',
            color: post.liked_by_viewer ? 'var(--accent)' : 'var(--text-muted)',
            cursor:'pointer', border:'none', background:'transparent', borderRadius:'var(--radius-sm)',
          }}
        >
          <Heart size={15} fill={post.liked_by_viewer ? 'currentColor' : 'none'} />
          {post.likes_count > 0 && <span>{post.likes_count}</span>}
        </button>
        <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-muted)' }}>
          {new Date(post.created_at).toLocaleDateString('ru-RU', { day:'numeric', month:'short' })}
        </span>
      </div>
    </article>
  )
}

export default function UserProfileView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [profileUser, setProfileUser] = useState(null)
  const [posts, setPosts]             = useState([])
  const [following, setFollowing]     = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [stats, setStats]             = useState({ followersCount:0, followingCount:0 })

  useEffect(() => {
    if (currentUser && String(currentUser.id) === String(id)) {
      navigate('/profile', { replace:true })
    }
  }, [id, currentUser])

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true); setPostsLoading(true)
    try {
      const [userRes, followRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get(`/follows/${id}/status`).catch(() => ({ data:{ following:false, followersCount:0, followingCount:0 } })),
      ])
      setProfileUser(userRes.data.user)
      setFollowing(followRes.data.following)
      setStats({ followersCount: followRes.data.followersCount ?? 0, followingCount: followRes.data.followingCount ?? 0 })
    } catch {
      setError('Пользователь не найден')
      setLoading(false)
      return
    } finally { setLoading(false) }

    try {
      const postsRes = await api.get(`/posts/user/${id}`)
      setPosts(postsRes.data.posts || [])
    } catch { setPosts([]) }
    finally { setPostsLoading(false) }
  }

  async function toggleFollow() {
    if (followLoading) return
    setFollowLoading(true)
    const prev = following
    setFollowing(!prev)
    try {
      if (prev) await api.delete(`/follows/${id}`)
      else await api.post(`/follows/${id}`)
      // Обновляем счётчики
      setStats(s => ({
        ...s,
        followersCount: prev ? s.followersCount - 1 : s.followersCount + 1
      }))
    } catch { setFollowing(prev) }
    finally { setFollowLoading(false) }
  }

  async function toggleLike(postId) {
    try {
      const r = await api.post(`/posts/${postId}/like`)
      setPosts(prev => prev.map(p => p.id === postId ? r.data.post : p))
    } catch { /* silent */ }
  }

  async function startChat() {
    try {
      const r = await api.post('/chats/private', { userId: Number(id) })
      navigate(r.data?.chat?.id ? `/chat/${r.data.chat.id}` : '/messages')
    } catch { navigate('/messages') }
  }

  if (loading) return <Skeleton />

  if (error) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1, position:'relative' }}>
      <div className="empty-state">
        <p style={{ fontSize:16, fontWeight:500 }}>{error}</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ gap:6 }}>
          <ArrowLeft size={14} /> Назад
        </button>
      </div>
    </div>
  )

  const lastSeenText = formatLastSeen(profileUser?.status, profileUser?.last_seen)

  return (
    <div style={{ minHeight:'100dvh', position:'relative', zIndex:1 }}>
      {/* Кнопка назад */}
      <div style={{ position:'absolute', top:16, left:16, zIndex:10 }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ gap:6, fontSize:13 }}>
          <ArrowLeft size={14} /> Назад
        </button>
      </div>

      {/* Шапка */}
      <div style={{ position:'relative' }}>
        <div style={{ height:200, background:'linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #2563eb 100%)' }} />
        <div style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border)', paddingBottom:16 }}>
          <div style={{ maxWidth:680, margin:'0 auto', padding:'0 20px' }}>
            <div style={{ display:'flex', alignItems:'flex-end', gap:16, marginTop:-52, flexWrap:'wrap' }}>
              {/* Аватар */}
              <div style={{
                width:100, height:100, borderRadius:'50%',
                border:'4px solid var(--bg-surface)', background:'var(--accent)',
                overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:36, fontWeight:700, color:'#fff', boxShadow:'0 4px 20px rgba(0,0,0,0.2)', flexShrink:0,
              }}>
                {profileUser?.avatar
                  ? <img src={`${API_URL}${profileUser.avatar}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : profileUser?.username?.[0]?.toUpperCase()
                }
              </div>

              <div style={{ flex:1, minWidth:0, paddingBottom:4, paddingTop:8 }}>
                <h1 style={{ fontSize:22, fontWeight:700, color:'var(--text-primary)', lineHeight:1.2 }}>
                  {profileUser?.username}
                </h1>
                <p style={{ fontSize:13, marginTop:4,
                  color: profileUser?.status === 'online' ? 'var(--status-online)' : 'var(--text-muted)',
                  display:'flex', alignItems:'center', gap:5,
                }}>
                  {profileUser?.status === 'online' && (
                    <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--status-online)', display:'inline-block' }} />
                  )}
                  {lastSeenText}
                </p>
              </div>

              <div style={{ display:'flex', gap:8, paddingBottom:4 }}>
                <button className="btn btn-primary" onClick={startChat} style={{ gap:6, fontSize:13 }}>
                  <MessageCircle size={14} /> Написать
                </button>
                <button
                  className={following ? 'btn btn-secondary' : 'btn btn-primary'}
                  onClick={toggleFollow}
                  disabled={followLoading}
                  style={{ gap:6, fontSize:13 }}
                >
                  {following ? <><UserMinus size={14} /> Отписаться</> : <><UserPlus size={14} /> Подписаться</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'16px 20px' }}>
        {/* Статистика */}
        <div className="card" style={{ padding:'14px 20px', marginBottom:16, display:'flex', gap:32 }}>
          <StatItem label="Публикаций" value={posts.length} />
          <StatItem label="Подписчики" value={stats.followersCount} />
          <StatItem label="Подписки"   value={stats.followingCount} />
        </div>

        {/* Посты */}
        <h2 style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)', marginBottom:12 }}>Публикации</h2>
        {postsLoading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[1,2].map(i => (
              <div key={i} className="card" style={{ padding:16, height:100 }}>
                <div style={{ height:10, width:'80%', background:'var(--border)', borderRadius:6, marginBottom:8, animation:'pulse 1.5s infinite' }} />
                <div style={{ height:10, width:'60%', background:'var(--border-light)', borderRadius:6, animation:'pulse 1.5s infinite' }} />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state" style={{ padding:'32px 24px' }}>
            <p style={{ fontSize:14 }}>Нет публикаций</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {posts.map(post => <PostCard key={post.id} post={post} onLike={toggleLike} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function StatItem({ label, value }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
      <span style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)' }}>{value ?? 0}</span>
      <span style={{ fontSize:12, color:'var(--text-muted)' }}>{label}</span>
    </div>
  )
}
