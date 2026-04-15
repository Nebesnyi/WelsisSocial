import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Moon, Sun, MoreHorizontal, User, LogOut, Pencil, Settings, Zap, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import api from '../../services/api'
import { sidebarItems } from './sidebarConfig'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function LeftSidebar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar:collapsed') === '1')
  const [menuOpen, setMenuOpen]   = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    localStorage.setItem('sidebar:collapsed', collapsed ? '1' : '0')
    if (collapsed) document.body.classList.add('sidebar-collapsed')
    else           document.body.classList.remove('sidebar-collapsed')
  }, [collapsed])

  useEffect(() => {
    let alive = true
    api.get('/chats?limit=50&offset=0').then(r => {
      const count = (r.data?.chats || []).reduce((s, c) => s + (c.unread_count || 0), 0)
      if (alive) setUnreadCount(count)
    }).catch(() => {})
    return () => { alive = false }
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const h = (e) => {
      if (!e.target.closest('.profile-dropdown') && !e.target.closest('[data-menu-toggle]'))
        setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuOpen])

  return (
    <aside className={`left-sidebar ${collapsed ? 'collapsed' : ''}`}>

      {/* Лого */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><Zap size={17} color="#fff"/></div>
        <span className="sidebar-logo-text">Vibe Messenger</span>
        <button className="collapse-btn" onClick={() => setCollapsed(v => !v)} style={{ marginLeft:'auto' }} aria-label="Свернуть">
          {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
        </button>
      </div>

      {/* Профиль */}
      <button className="profile-chip" onClick={() => navigate('/profile')} aria-label="Профиль">
        <div className="avatar-wrap">
          {user?.avatar
            ? <img src={`${API_URL}${user.avatar}`} alt={user?.username} className="sidebar-avatar"/>
            : <div className="sidebar-avatar-fallback">{user?.username?.[0]?.toUpperCase() || '?'}</div>
          }
          <span className="status-dot online"/>
        </div>
        <div className="profile-meta">
          <strong>{user?.username || 'Пользователь'}</strong>
          <span>в сети</span>
        </div>
      </button>

      {/* Кнопки */}
      <div className="profile-actions">
        <button className="btn-icon" data-menu-toggle onClick={() => setMenuOpen(v => !v)} title="Меню">
          <MoreHorizontal size={16}/>
        </button>
        <button className="btn-icon" onClick={toggleTheme} title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}>
          {theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
        </button>
        <button className="btn-icon" onClick={() => navigate('/settings')} title="Настройки">
          <Settings size={16}/>
        </button>
      </div>

      {/* Выпадающее меню */}
      {menuOpen && (
        <div className="profile-dropdown animate-fade-in">
          <button onClick={() => { navigate('/profile'); setMenuOpen(false) }}><User size={14}/>Профиль</button>
          <button onClick={() => { navigate('/profile'); setMenuOpen(false) }}><Pencil size={14}/>Редактировать</button>
          {user?.is_admin && (
            <button onClick={() => { navigate('/admin'); setMenuOpen(false) }}>
              <Shield size={14}/>Админ-панель
            </button>
          )}
          <button className="danger" onClick={() => { logout(); setMenuOpen(false) }}><LogOut size={14}/>Выйти</button>
        </div>
      )}

      {/* Навигация */}
      <nav className="sidebar-nav">
        {sidebarItems.map(item => {
          const Icon   = item.icon
          const active = item.to === '/messages'
            ? location.pathname.startsWith('/chat') || location.pathname.startsWith('/messages')
            : location.pathname.startsWith(item.to)
          return (
            <NavLink key={item.key} to={item.to} className={`sidebar-link ${active ? 'active' : ''}`}>
              <Icon size={18} className="sidebar-link-icon"/>
              <span>{item.label}</span>
              {item.key === 'messages' && unreadCount > 0 && (
                <em className="sidebar-badge">{unreadCount > 99 ? '99+' : unreadCount}</em>
              )}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
