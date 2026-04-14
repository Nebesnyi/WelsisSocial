import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import NotificationBell from '../ui/NotificationBell'
import GlobalSearch from '../ui/GlobalSearch'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function TopBar() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 20px',
      height: 52,
      display: 'flex', alignItems: 'center', gap: 12,
      transition: 'background var(--transition), border-color var(--transition)',
    }}>
      {/* Global search — takes most space */}
      <GlobalSearch />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <NotificationBell />

        {/* Avatar shortcut to profile */}
        <button
          onClick={() => navigate('/profile')}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--accent)', border: '2px solid var(--border)',
            overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 600, color: '#fff',
            transition: 'border-color var(--transition)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          title="Профиль"
        >
          {user?.avatar
            ? <img src={`${API_URL}${user.avatar}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : user?.username?.[0]?.toUpperCase()
          }
        </button>
      </div>
    </header>
  )
}
