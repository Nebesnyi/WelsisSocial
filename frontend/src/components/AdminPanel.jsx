import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

export default function AdminPanel() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('stats')

  useEffect(() => {
    loadAdminData()
  }, [])

  async function loadAdminData() {
    try {
      setLoading(true)
      setError(null)
      
      // Загрузка статистики
      const statsRes = await api.get('/admin/stats')
      setStats(statsRes.data.stats)
      
      // Загрузка списка пользователей
      const usersRes = await api.get('/admin/users')
      setUsers(usersRes.data.users)
    } catch (err) {
      console.error('Ошибка загрузки данных админ-панели:', err)
      setError(err.response?.data?.error || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  async function changeUserRole(userId, newRole) {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole })
      alert('Роль пользователя изменена')
      loadAdminData()
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка изменения роли')
    }
  }

  async function deleteUser(userId, username) {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${username}?`)) {
      return
    }
    
    try {
      await api.delete(`/admin/users/${userId}`)
      alert('Пользователь удалён')
      loadAdminData()
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка удаления пользователя')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '2px solid #2a2a45', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        <h2>Ошибка доступа</h2>
        <p>{error}</p>
        <p>Убедитесь, что у вас есть права администратора</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', color: '#e2e8f0' }}>
        🔧 Админ-панель
      </h1>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #4c1d95', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('stats')}
          style={{
            padding: '0.5rem 1rem',
            background: activeTab === 'stats' ? '#7c3aed' : 'transparent',
            color: '#e2e8f0',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: activeTab === 'stats' ? 'bold' : 'normal'
          }}
        >
          📊 Статистика
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '0.5rem 1rem',
            background: activeTab === 'users' ? '#7c3aed' : 'transparent',
            color: '#e2e8f0',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: activeTab === 'users' ? 'bold' : 'normal'
          }}
        >
          👥 Пользователи
        </button>
      </div>

      {/* Статистика */}
      {activeTab === 'stats' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.875rem', color: '#a78bfa', marginBottom: '0.5rem' }}>Всего пользователей</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{stats.totalUsers}</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.875rem', color: '#6ee7b7', marginBottom: '0.5rem' }}>Онлайн</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{stats.onlineUsers}</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.875rem', color: '#93c5fd', marginBottom: '0.5rem' }}>Всего постов</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{stats.totalPosts}</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.875rem', color: '#fca5a5', marginBottom: '0.5rem' }}>Сообщений</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{stats.totalMessages}</div>
          </div>
        </div>
      )}

      {/* Пользователи */}
      {activeTab === 'users' && (
        <div style={{ background: '#1e1b4b', borderRadius: '1rem', padding: '1.5rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #4c1d95' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#a78bfa' }}>ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#a78bfa' }}>Пользователь</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#a78bfa' }}>Email</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#a78bfa' }}>Роль</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#a78bfa' }}>Статус</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#a78bfa' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #312e81' }}>
                  <td style={{ padding: '1rem', color: '#e2e8f0' }}>{u.id}</td>
                  <td style={{ padding: '1rem', color: '#e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {u.avatar && (
                        <img src={u.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                      )}
                      {u.username}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: '#9ca3af' }}>{u.email}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      background: u.role === 'admin' ? '#7c3aed' : '#4c1d95',
                      color: '#fff'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      background: u.status === 'online' ? '#059669' : '#4b5563',
                      color: '#fff'
                    }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => changeUserRole(u.id, 'admin')}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#7c3aed',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          Сделать админом
                        </button>
                      )}
                      {u.role === 'admin' && u.id !== user?.id && (
                        <button
                          onClick={() => changeUserRole(u.id, 'user')}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#dc2626',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          Снять админа
                        </button>
                      )}
                      {u.id !== user?.id && (
                        <button
                          onClick={() => deleteUser(u.id, u.username)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#991b1b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
