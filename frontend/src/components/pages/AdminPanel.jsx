import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Shield, Trash2, Edit2, Save, X, AlertCircle, ChevronLeft, Search, Crown, BadgeCheck } from 'lucide-react'
import api from '../../services/api'
import UserBadge from '../UserBadge'

export default function AdminPanel() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Для редактирования роли
  const [editingUserId, setEditingUserId] = useState(null)
  const [tempRole, setTempRole] = useState('user')
  // Для редактирования бейджа
  const [editingBadgeId, setEditingBadgeId] = useState(null)
  const [tempBadge, setTempBadge] = useState(null)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (error || successMsg) {
      const timer = setTimeout(() => {
        setError('')
        setSuccessMsg('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMsg])

  async function loadUsers() {
    try {
      setLoading(true)
      setError('')
      const res = await api.get('/admin/users')
      
      // Надежное извлечение массива пользователей
      let userList = []
      if (Array.isArray(res.data)) {
        userList = res.data
      } else if (res.data && Array.isArray(res.data.users)) {
        userList = res.data.users
      } else if (res.data && Array.isArray(res.data.data)) {
        userList = res.data.data
      } else {
        console.warn('Неожиданный формат ответа:', res.data)
        userList = []
      }
      
      setUsers(userList)
      if (userList.length === 0) {
        setSuccessMsg('Пользователи не найдены')
      }
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err)
      const msg = err?.response?.data?.error || err?.message || 'Не удалось загрузить пользователей'
      setError(msg)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      setEditingUserId(null)
      setSuccessMsg('Роль успешно изменена')
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка при изменении роли')
    }
  }

  async function handleBadgeChange(userId, newBadge) {
    try {
      await api.put(`/admin/users/${userId}/badge`, { badge_type: newBadge })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, badge_type: newBadge } : u))
      setEditingBadgeId(null)
      setSuccessMsg('Бейдж успешно изменен')
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка при изменении бейджа')
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя? Это действие необратимо.')) return
    
    try {
      await api.delete(`/admin/users/${userId}`)
      setUsers(prev => prev.filter(u => u.id !== userId))
      setSuccessMsg('Пользователь удален')
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка при удалении пользователя')
    }
  }

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg-app)', padding:'20px 16px' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        
        {/* Заголовок */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button onClick={() => navigate('/')} className="btn-icon" title="На главную">
            <ChevronLeft size={20}/>
          </button>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:24, fontWeight:700, color:'var(--text-primary)' }}>Админ-панель</h1>
            <p style={{ fontSize:14, color:'var(--text-muted)', marginTop:4 }}>Управление пользователями и настройками</p>
          </div>
        </div>

        {/* Вкладки */}
        <div style={{ display:'flex', gap:8, marginBottom:24, borderBottom:'1px solid var(--border)', paddingBottom:1 }}>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              display:'flex', alignItems:'center', gap:8, padding:'10px 16px', fontSize:14, fontWeight:500,
              color: activeTab === 'users' ? 'var(--accent)' : 'var(--text-muted)',
              background: activeTab === 'users' ? 'rgba(109, 94, 245, 0.08)' : 'transparent',
              border:'none', borderRadius:'8px 8px 0 0', cursor:'pointer', transition:'all 0.2s'
            }}
          >
            <Users size={16}/> Пользователи
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              display:'flex', alignItems:'center', gap:8, padding:'10px 16px', fontSize:14, fontWeight:500,
              color: activeTab === 'settings' ? 'var(--accent)' : 'var(--text-muted)',
              background: activeTab === 'settings' ? 'rgba(109, 94, 245, 0.08)' : 'transparent',
              border:'none', borderRadius:'8px 8px 0 0', cursor:'pointer', transition:'all 0.2s'
            }}
          >
            <Shield size={16}/> Настройки
          </button>
        </div>

        {/* Контент */}
        <div style={{ background:'var(--bg-surface)', borderRadius:'var(--radius-md)', border:'1px solid var(--border)', overflow:'hidden' }}>
          
          {activeTab === 'users' && (
            <>
              {/* Поиск */}
              <div style={{ padding:'16px', borderBottom:'1px solid var(--border)', display:'flex', gap:12 }}>
                <div style={{ position:'relative', flex:1, maxWidth:400 }}>
                  <Search size={16} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
                  <input
                    type="text"
                    placeholder="Поиск по имени или email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width:'100%', padding:'8px 12px 8px 36px', fontSize:14,
                      background:'var(--bg-input)', border:'1px solid var(--border)',
                      borderRadius:'var(--radius-sm)', color:'var(--text-primary)', outline:'none'
                    }}
                  />
                </div>
                <button onClick={loadUsers} className="btn btn-secondary" style={{ padding:'8px 16px', fontSize:13 }}>
                  Обновить
                </button>
              </div>

              {/* Сообщения об ошибках/успехе */}
              {error && (
                <div style={{ padding:'12px 16px', background:'rgba(239,68,68,0.08)', borderBottom:'1px solid rgba(239,68,68,0.2)', display:'flex', alignItems:'center', gap:8 }}>
                  <AlertCircle size={16} style={{ color:'#ef4444', flexShrink:0 }}/>
                  <span style={{ fontSize:13, color:'#ef4444' }}>{error}</span>
                  <button onClick={() => setError('')} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#ef4444' }}><X size={14}/></button>
                </div>
              )}
              
              {successMsg && !error && (
                <div style={{ padding:'12px 16px', background:'rgba(34,197,94,0.08)', borderBottom:'1px solid rgba(34,197,94,0.2)', display:'flex', alignItems:'center', gap:8 }}>
                  <Shield size={16} style={{ color:'#22c55e', flexShrink:0 }}/>
                  <span style={{ fontSize:13, color:'#22c55e' }}>{successMsg}</span>
                  <button onClick={() => setSuccessMsg('')} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#22c55e' }}><X size={14}/></button>
                </div>
              )}

              {/* Таблица пользователей */}
              {loading ? (
                <div style={{ padding:40, textAlign:'center' }}>
                  <div style={{ width:32, height:32, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/>
                  <p style={{ fontSize:14, color:'var(--text-muted)', marginTop:12 }}>Загрузка пользователей...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
                  <Users size={48} style={{ opacity:0.3, marginBottom:12 }}/>
                  <p style={{ fontSize:15, fontWeight:500 }}>Нет пользователей</p>
                  <p style={{ fontSize:13, marginTop:4 }}>
                    {searchQuery ? 'По вашему запросу ничего не найдено' : 'Список пользователей пуст'}
                  </p>
                </div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ background:'var(--bg-surface-2)', borderBottom:'1px solid var(--border)' }}>
                        <th style={{ padding:'12px 16px', textAlign:'left', fontSize:12, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Пользователь</th>
                        <th style={{ padding:'12px 16px', textAlign:'left', fontSize:12, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Email</th>
                        <th style={{ padding:'12px 16px', textAlign:'left', fontSize:12, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Бейдж</th>
                        <th style={{ padding:'12px 16px', textAlign:'left', fontSize:12, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Роль</th>
                        <th style={{ padding:'12px 16px', textAlign:'left', fontSize:12, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Статус</th>
                        <th style={{ padding:'12px 16px', textAlign:'right', fontSize:12, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user, index) => (
                        <tr key={user.id} style={{ borderBottom: index < filteredUsers.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                          <td style={{ padding:'12px 16px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600, color:'#fff' }}>
                                {user.username?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <span style={{ fontSize:14, fontWeight:500, color:'var(--text-primary)' }}>{user.username}</span>
                              {user.badge_type && <UserBadge type={user.badge_type} size="small" />}
                            </div>
                          </td>
                          <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-muted)' }}>{user.email}</td>
                          <td style={{ padding:'12px 16px' }}>
                            {editingBadgeId === user.id ? (
                              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <select
                                  value={tempBadge || ''}
                                  onChange={(e) => setTempBadge(e.target.value || null)}
                                  style={{
                                    padding:'4px 8px', fontSize:12, borderRadius:4,
                                    background:'var(--bg-input)', border:'1px solid var(--border)',
                                    color:'var(--text-primary)', outline:'none'
                                  }}
                                >
                                  <option value="">Нет бейджа</option>
                                  <option value="verified">Проверенный</option>
                                  <option value="premium">Premium</option>
                                  <option value="moderator">Модератор</option>
                                  <option value="admin">Администратор</option>
                                  <option value="owner">Владелец</option>
                                  <option value="bot">Бот</option>
                                </select>
                                <button onClick={() => handleBadgeChange(user.id, tempBadge || null)} className="btn-icon" style={{ width:28, height:28 }}><Save size={14}/></button>
                                <button onClick={() => setEditingBadgeId(null)} className="btn-icon" style={{ width:28, height:28 }}><X size={14}/></button>
                              </div>
                            ) : (
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                {user.badge_type ? (
                                  <span style={{
                                    fontSize:12, padding:'4px 8px', borderRadius:12, fontWeight:500,
                                    background: 'rgba(109, 94, 245, 0.12)',
                                    color: 'var(--accent)'
                                  }}>
                                    {user.badge_type === 'verified' && 'Проверенный'}
                                    {user.badge_type === 'premium' && 'Premium'}
                                    {user.badge_type === 'moderator' && 'Модератор'}
                                    {user.badge_type === 'admin' && 'Администратор'}
                                    {user.badge_type === 'owner' && 'Владелец'}
                                    {user.badge_type === 'bot' && 'Бот'}
                                  </span>
                                ) : (
                                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>
                                )}
                                <button onClick={() => { setEditingBadgeId(user.id); setTempBadge(user.badge_type) }} className="btn-icon" style={{ width:28, height:28, opacity:0.6 }}><Edit2 size={14}/></button>
                              </div>
                            )}
                          </td>
                          <td style={{ padding:'12px 16px' }}>
                            {editingUserId === user.id ? (
                              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <select
                                  value={tempRole}
                                  onChange={(e) => setTempRole(e.target.value)}
                                  style={{
                                    padding:'4px 8px', fontSize:12, borderRadius:4,
                                    background:'var(--bg-input)', border:'1px solid var(--border)',
                                    color:'var(--text-primary)', outline:'none'
                                  }}
                                >
                                  <option value="user">Пользователь</option>
                                  <option value="admin">Администратор</option>
                                </select>
                                <button onClick={() => handleRoleChange(user.id, tempRole)} className="btn-icon" style={{ width:28, height:28 }}><Save size={14}/></button>
                                <button onClick={() => setEditingUserId(null)} className="btn-icon" style={{ width:28, height:28 }}><X size={14}/></button>
                              </div>
                            ) : (
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <span style={{
                                  fontSize:12, padding:'4px 8px', borderRadius:12, fontWeight:500,
                                  background: user.role === 'admin' ? 'rgba(109, 94, 245, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                  color: user.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)'
                                }}>
                                  {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                                </span>
                                <button onClick={() => { setEditingUserId(user.id); setTempRole(user.role) }} className="btn-icon" style={{ width:28, height:28, opacity:0.6 }}><Edit2 size={14}/></button>
                              </div>
                            )}
                          </td>
                          <td style={{ padding:'12px 16px' }}>
                            <span style={{
                              fontSize:12, padding:'4px 8px', borderRadius:12, fontWeight:500,
                              background: 'rgba(34, 197, 94, 0.12)',
                              color: '#22c55e'
                            }}>
                              Активен
                            </span>
                          </td>
                          <td style={{ padding:'12px 16px', textAlign:'right' }}>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="btn-icon"
                              style={{ width:32, height:32, color:'#ef4444', opacity:0.7 }}
                              title="Удалить пользователя"
                            >
                              <Trash2 size={16}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
              <Shield size={48} style={{ opacity:0.3, marginBottom:12 }}/>
              <p style={{ fontSize:15, fontWeight:500 }}>Настройки в разработке</p>
              <p style={{ fontSize:13, marginTop:4 }}>Этот раздел будет доступен в будущих обновлениях</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
