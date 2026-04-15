import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check, X, LogOut, Edit2, Mail, User, Heart, MessageCircle, Briefcase, GraduationCap, MapPin, Phone, Globe, Calendar, Link as LinkIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const TABS = ['Посты', 'Информация']

export default function Profile() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    username: user?.username || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    birth_date: user?.birth_date || '',
    city: user?.city || '',
    about: user?.about || '',
    occupation: user?.occupation || '',
    education: user?.education || '',
    location: user?.location || '',
    phone: user?.phone || '',
    social_links: user?.social_links || {},
    interests: user?.interests || []
  })
  const [loading, setLoading]     = useState(false)
  const [msg, setMsg]             = useState('')
  const [editing, setEditing]     = useState(false)
  const [activeTab, setActiveTab] = useState('Посты')
  const [posts, setPosts]         = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [followStats, setFollowStats]   = useState({ followersCount: 0, followingCount: 0 })
  const [interestInput, setInterestInput] = useState('')
  const [newSocialLink, setNewSocialLink] = useState({ platform: '', url: '' })

  useEffect(() => { if (user) loadData() }, [user?.id])
  
  // Load full profile data when editing starts
  useEffect(() => {
    if (editing && user?.id) {
      loadFullProfile()
    }
  }, [editing])

  async function loadFullProfile() {
    try {
      const r = await api.get(`/users/${user.id}`)
      const u = r.data.user
      setFormData({
        username: u.username || '',
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        birth_date: u.birth_date || '',
        city: u.city || '',
        about: u.about || '',
        occupation: u.occupation || '',
        education: u.education || '',
        location: u.location || '',
        phone: u.phone || '',
        social_links: u.social_links || {},
        interests: u.interests || []
      })
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 3000)
    return () => clearTimeout(t)
  }, [msg])

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
      const r = await api.put('/users/profile', formData)
      updateUser(r.data.user)
      setMsg('ok')
      setEditing(false)
    } catch { setMsg('err') }
    finally { setLoading(false) }
  }

  function addInterest() {
    if (interestInput.trim() && !formData.interests.includes(interestInput.trim())) {
      setFormData(prev => ({ ...prev, interests: [...prev.interests, interestInput.trim()] }))
      setInterestInput('')
    }
  }

  function removeInterest(idx) {
    setFormData(prev => ({ ...prev, interests: prev.interests.filter((_, i) => i !== idx) }))
  }

  function addSocialLink() {
    if (newSocialLink.platform && newSocialLink.url) {
      setFormData(prev => ({ 
        ...prev, 
        social_links: { ...prev.social_links, [newSocialLink.platform]: newSocialLink.url } 
      }))
      setNewSocialLink({ platform: '', url: '' })
    }
  }

  function removeSocialLink(platform) {
    setFormData(prev => {
      const updated = { ...prev.social_links }
      delete updated[platform]
      return { ...prev, social_links: updated }
    })
  }

  function updateFormData(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
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
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              
              {/* Основная информация */}
              <section>
                <h3 style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  <User size={14} /> Основная информация
                </h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={labelStyle}>Имя</label>
                    <input className="ui-input" type="text" value={formData.first_name} onChange={e => updateFormData('first_name', e.target.value)} maxLength={50} />
                  </div>
                  <div>
                    <label style={labelStyle}>Фамилия</label>
                    <input className="ui-input" type="text" value={formData.last_name} onChange={e => updateFormData('last_name', e.target.value)} maxLength={50} />
                  </div>
                  <div>
                    <label style={labelStyle}><User size={13} /> Имя пользователя</label>
                    <input className="ui-input" type="text" value={formData.username} onChange={e => updateFormData('username', e.target.value)} minLength={2} maxLength={30} />
                  </div>
                  <div>
                    <label style={labelStyle}><Calendar size={13} /> Дата рождения</label>
                    <input className="ui-input" type="date" value={formData.birth_date} onChange={e => updateFormData('birth_date', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}><MapPin size={13} /> Город</label>
                    <input className="ui-input" type="text" value={formData.city} onChange={e => updateFormData('city', e.target.value)} maxLength={100} />
                  </div>
                </div>
                <div style={{ marginTop:12 }}>
                  <label style={labelStyle}>О себе</label>
                  <textarea className="ui-input" value={formData.about} onChange={e => updateFormData('about', e.target.value)} maxLength={500} rows={3} placeholder="Расскажите о себе..." />
                </div>
              </section>

              {/* Работа и образование */}
              <section>
                <h3 style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  <Briefcase size={14} /> Работа и образование
                </h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }}>
                  <div>
                    <label style={labelStyle}><Briefcase size={13} /> Место работы / Должность</label>
                    <input className="ui-input" type="text" value={formData.occupation} onChange={e => updateFormData('occupation', e.target.value)} maxLength={100} />
                  </div>
                  <div>
                    <label style={labelStyle}><GraduationCap size={13} /> Образование</label>
                    <input className="ui-input" type="text" value={formData.education} onChange={e => updateFormData('education', e.target.value)} maxLength={500} />
                  </div>
                  <div>
                    <label style={labelStyle}><MapPin size={13} /> Местоположение</label>
                    <input className="ui-input" type="text" value={formData.location} onChange={e => updateFormData('location', e.target.value)} maxLength={200} />
                  </div>
                </div>
              </section>

              {/* Контакты */}
              <section>
                <h3 style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  <Phone size={14} /> Контакты
                </h3>
                <div>
                  <label style={labelStyle}><Mail size={13} /> Email</label>
                  <input className="ui-input" type="email" value={user?.email || ''} disabled style={{ opacity:0.5 }} />
                </div>
                <div style={{ marginTop:12 }}>
                  <label style={labelStyle}><Phone size={13} /> Телефон</label>
                  <input className="ui-input" type="tel" value={formData.phone} onChange={e => updateFormData('phone', e.target.value)} maxLength={20} placeholder="+7 (999) 000-00-00" />
                </div>
                
                {/* Соцсети */}
                <div style={{ marginTop:12 }}>
                  <label style={labelStyle}><Globe size={13} /> Социальные сети</label>
                  <div style={{ display:'flex', gap:8, marginTop:6 }}>
                    <select 
                      className="ui-input" 
                      value={newSocialLink.platform} 
                      onChange={e => setNewSocialLink(prev => ({ ...prev, platform: e.target.value }))}
                      style={{ maxWidth:150 }}
                    >
                      <option value="">Выбрать...</option>
                      <option value="telegram">Telegram</option>
                      <option value="vk">VK</option>
                      <option value="instagram">Instagram</option>
                      <option value="twitter">Twitter</option>
                      <option value="facebook">Facebook</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="github">GitHub</option>
                      <option value="other">Другое</option>
                    </select>
                    <input 
                      className="ui-input" 
                      type="url" 
                      placeholder="https://..." 
                      value={newSocialLink.url} 
                      onChange={e => setNewSocialLink(prev => ({ ...prev, url: e.target.value }))}
                    />
                    <button type="button" className="btn btn-primary" onClick={addSocialLink} style={{ padding:'8px 12px' }}>Добавить</button>
                  </div>
                  {Object.keys(formData.social_links).length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
                      {Object.entries(formData.social_links).map(([platform, url]) => (
                        <span key={platform} style={{ 
                          display:'inline-flex', alignItems:'center', gap:6, 
                          padding:'4px 10px', borderRadius:'var(--radius-sm)', 
                          background:'rgba(109, 94, 245, 0.1)', color:'var(--accent)', fontSize:12 
                        }}>
                          <LinkIcon size={12} />
                          {platform}: {url.substring(0, 30)}{url.length > 30 ? '...' : ''}
                          <button type="button" onClick={() => removeSocialLink(platform)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent)', padding:0 }}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Интересы */}
              <section>
                <h3 style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:12 }}>Интересы</h3>
                <div style={{ display:'flex', gap:8 }}>
                  <input 
                    className="ui-input" 
                    type="text" 
                    value={interestInput} 
                    onChange={e => setInterestInput(e.target.value)} 
                    placeholder="Добавить интерес"
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                  />
                  <button type="button" className="btn btn-primary" onClick={addInterest} style={{ padding:'8px 16px' }}>Добавить</button>
                </div>
                {formData.interests.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
                    {formData.interests.map((interest, idx) => (
                      <span key={idx} style={{ 
                        display:'inline-flex', alignItems:'center', gap:6, 
                        padding:'4px 10px', borderRadius:'var(--radius-pill)', 
                        background:'rgba(109, 94, 245, 0.1)', color:'var(--accent)', fontSize:12 
                      }}>
                        {interest}
                        <button type="button" onClick={() => removeInterest(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent)', padding:0 }}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', paddingTop:8, borderTop:'1px solid var(--border)' }}>
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
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* Основная информация */}
              <section>
                <h3 style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  <User size={14} /> Основная информация
                </h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <InfoRow icon={<User size={15} />} label="Имя" value={user?.first_name || '—'} />
                  <InfoRow icon={<User size={15} />} label="Фамилия" value={user?.last_name || '—'} />
                  <InfoRow icon={<User size={15} />} label="Имя пользователя" value={user?.username} />
                  <InfoRow icon={<Calendar size={15} />} label="Дата рождения" value={user?.birth_date || '—'} />
                  <InfoRow icon={<MapPin size={15} />} label="Город" value={user?.city || '—'} />
                </div>
                <div style={{ marginTop:12 }}>
                  <InfoRow icon={<Mail size={15} />} label="Email" value={user?.email} />
                </div>
                {user?.about && (
                  <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
                    <span style={{ fontSize:13, color:'var(--text-muted)', display:'block', marginBottom:6 }}>О себе</span>
                    <p style={{ fontSize:14, color:'var(--text-primary)', lineHeight:1.6 }}>{user.about}</p>
                  </div>
                )}
              </section>

              {/* Работа и образование */}
              {(user?.occupation || user?.education || user?.location) && (
                <section style={{ paddingTop:12, borderTop:'1px solid var(--border)' }}>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                    <Briefcase size={14} /> Работа и образование
                  </h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {user?.occupation && <InfoRow icon={<Briefcase size={15} />} label="Работа" value={user.occupation} />}
                    {user?.education && <InfoRow icon={<GraduationCap size={15} />} label="Образование" value={user.education} />}
                    {user?.location && <InfoRow icon={<MapPin size={15} />} label="Местоположение" value={user.location} />}
                  </div>
                </section>
              )}

              {/* Контакты */}
              {(user?.phone || (user?.social_links && Object.keys(user.social_links).length > 0)) && (
                <section style={{ paddingTop:12, borderTop:'1px solid var(--border)' }}>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                    <Phone size={14} /> Контакты
                  </h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {user?.phone && <InfoRow icon={<Phone size={15} />} label="Телефон" value={user.phone} />}
                    {user?.social_links && Object.keys(user.social_links).length > 0 && (
                      <div>
                        <span style={{ fontSize:13, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Соцсети</span>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                          {Object.entries(user.social_links).map(([platform, url]) => (
                            <a key={platform} href={url} target="_blank" rel="noopener noreferrer" 
                               style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:13, color:'var(--accent)', textDecoration:'none' }}>
                              <LinkIcon size={14} />
                              {platform}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Интересы */}
              {user?.interests && user.interests.length > 0 && (
                <section style={{ paddingTop:12, borderTop:'1px solid var(--border)' }}>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:12 }}>Интересы</h3>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {user.interests.map((interest, idx) => (
                      <span key={idx} style={{ 
                        display:'inline-flex', alignItems:'center', gap:6, 
                        padding:'4px 10px', borderRadius:'var(--radius-pill)', 
                        background:'rgba(109, 94, 245, 0.1)', color:'var(--accent)', fontSize:12 
                      }}>
                        {interest}
                      </span>
                    ))}
                  </div>
                </section>
              )}
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
