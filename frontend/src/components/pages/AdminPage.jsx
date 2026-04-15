import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { Shield, CheckCircle, XCircle, Users, MessageSquare, Zap, Eye, Trash2, UserCheck } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [recentUsers, setRecentUsers] = useState([])
  const [recentPosts, setRecentPosts] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [usersList, setUsersList] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [verifyingUser, setVerifyingUser] = useState(null)

  useEffect(() => {
    // Проверка прав администратора
    if (!user?.is_admin) {
      navigate('/feed')
      return
    }
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const response = await api.get('/admin/stats')
      setStats(response.data.stats)
      setRecentUsers(response.data.recentUsers)
      setRecentPosts(response.data.recentPosts)
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadUsers(page = 1) {
    try {
      const response = await api.get(`/admin/users?page=${page}&limit=20`)
      setUsersList(response.data.users)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error)
    }
  }

  async function toggleVerification(userId, currentStatus) {
    setVerifyingUser(userId)
    try {
      const response = await api.put(`/admin/verify/${userId}`, {
        is_verified: !currentStatus
      })
      // Обновляем локально
      setRecentUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_verified: !currentStatus } : u
      ))
      setUsersList(prev => prev.map(u => 
        u.id === userId ? { ...u, is_verified: !currentStatus } : u
      ))
      alert(response.data.message)
    } catch (error) {
      console.error('Ошибка верификации:', error)
      alert('Ошибка при изменении верификации')
    } finally {
      setVerifyingUser(null)
    }
  }

  async function handleDeleteUser(userId, username) {
    if (!confirm(`Вы уверены, что хотите удалить пользователя "${username}"? Это действие необратимо.`)) {
      return
    }
    try {
      await api.delete(`/admin/user/${userId}`)
      alert('Пользователь удалён')
      loadStats()
      loadUsers(pagination.page)
    } catch (error) {
      console.error('Ошибка удаления:', error)
      alert('Ошибка при удалении пользователя')
    }
  }

  if (!user?.is_admin) {
    return null
  }

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Загрузка админ-панели...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Shield size={32} color="var(--accent)" />
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>Админ-панель</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: activeTab === 'overview' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'overview' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          Обзор
        </button>
        <button
          onClick={() => { setActiveTab('users'); loadUsers(1); }}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: activeTab === 'users' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'users' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          Пользователи
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <>
          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard icon={<Users size={24} />} label="Всего пользователей" value={stats.totalUsers} color="#8b5cf6" />
            <StatCard icon={<UserCheck size={24} />} label="Онлайн" value={stats.onlineUsers} color="#10b981" />
            <StatCard icon={<Zap size={24} />} label="Верифицировано" value={stats.verifiedUsers} color="#f59e0b" />
            <StatCard icon={<MessageSquare size={24} />} label="Сообщений" value={stats.totalMessages} color="#3b82f6" />
            <StatCard icon={<Eye size={24} />} label="Постов" value={stats.totalPosts} color="#ec4899" />
            <StatCard icon={<Shield size={24} />} label="Чатов" value={stats.totalChats} color="#6366f1" />
          </div>

          {/* Recent Users */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Последние пользователи</h2>
            <div style={{ background: 'var(--bg-surface)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'var(--bg-card)' }}>
                  <tr>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>ID</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>Имя</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>Email</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>Верифицирован</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>Дата</th>
                    <th style={{ padding: 12, textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 500 }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map(u => (
                    <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: 12, color: 'var(--text-secondary)' }}>#{u.id}</td>
                      <td style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {u.avatar && (
                          <img src={`${API_URL}${u.avatar}`} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                        )}
                        <span style={{ fontWeight: 500 }}>{u.username}</span>
                      </td>
                      <td style={{ padding: 12, color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td style={{ padding: 12 }}>
                        {u.is_verified ? (
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={16} /> Да
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <XCircle size={16} /> Нет
                          </span>
                        )}
                      </td>
                      <td style={{ padding: 12, color: 'var(--text-secondary)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <button
                          onClick={() => toggleVerification(u.id, u.is_verified)}
                          disabled={verifyingUser === u.id}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            background: u.is_verified ? '#ef4444' : '#10b981',
                            color: '#fff',
                            border: 'none',
                            cursor: verifyingUser === u.id ? 'not-allowed' : 'pointer',
                            opacity: verifyingUser === u.id ? 0.6 : 1,
                            marginRight: 8
                          }}
                        >
                          {verifyingUser === u.id ? '...' : (u.is_verified ? 'Снять' : 'Верифицировать')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Posts */}
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Последние посты</h2>
            <div style={{ background: 'var(--bg-surface)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'var(--bg-card)' }}>
                  <tr>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>ID</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>Автор</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>Контент</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPosts.map(p => (
                    <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: 12, color: 'var(--text-secondary)' }}>#{p.id}</td>
                      <td style={{ padding: 12, fontWeight: 500 }}>{p.username}</td>
                      <td style={{ padding: 12, color: 'var(--text-secondary)', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.content?.substring(0, 80) || '—'}
                      </td>
                      <td style={{ padding: 12, color: 'var(--text-secondary)' }}>{new Date(p.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Все пользователи</h2>
            <span style={{ color: 'var(--text-secondary)' }}>
              Стр. {pagination.page} из {pagination.totalPages}
            </span>
          </div>
          
          <div style={{ background: 'var(--bg-surface)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--bg-card)' }}>
                <tr>
                  <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>ID</th>
                  <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>Имя</th>
                  <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>Статус</th>
                  <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>Верификация</th>
                  <th style={{ padding: 12, textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 500 }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map(u => (
                  <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 12, color: 'var(--text-secondary)' }}>#{u.id}</td>
                    <td style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {u.avatar && (
                        <img src={`${API_URL}${u.avatar}`} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 500 }}>{u.username}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email}</div>
                      </div>
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: u.status === 'online' ? '#10b98120' : '#6b728020',
                        color: u.status === 'online' ? '#10b981' : '#6b7280',
                        fontSize: 12,
                        fontWeight: 500
                      }}>
                        {u.status === 'online' ? 'Онлайн' : 'Оффлайн'}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      {u.is_verified ? (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={16} />
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      <button
                        onClick={() => toggleVerification(u.id, u.is_verified)}
                        disabled={verifyingUser === u.id}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          background: u.is_verified ? '#ef4444' : '#10b981',
                          color: '#fff',
                          border: 'none',
                          cursor: verifyingUser === u.id ? 'not-allowed' : 'pointer',
                          opacity: verifyingUser === u.id ? 0.6 : 1,
                          marginRight: 8
                        }}
                      >
                        {verifyingUser === u.id ? '...' : (u.is_verified ? 'Снять' : '✓')}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button
              onClick={() => loadUsers(pagination.page - 1)}
              disabled={pagination.page === 1}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: pagination.page === 1 ? 'var(--bg-card)' : 'var(--accent)',
                color: pagination.page === 1 ? 'var(--text-secondary)' : '#fff',
                border: 'none',
                cursor: pagination.page === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Назад
            </button>
            <button
              onClick={() => loadUsers(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: pagination.page >= pagination.totalPages ? 'var(--bg-card)' : 'var(--accent)',
                color: pagination.page >= pagination.totalPages ? 'var(--text-secondary)' : '#fff',
                border: 'none',
                cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Вперёд
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 10,
        background: `${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</div>
      </div>
    </div>
  )
}
