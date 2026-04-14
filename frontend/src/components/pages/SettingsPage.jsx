import { useState, useEffect } from 'react'
import { Moon, Sun, Bell, BellOff, Shield, X, Lock, Eye, EyeOff, Users } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

function SettingRow({ icon, title, description, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 0', borderBottom:'1px solid var(--border-light)' }}>
      <div style={{ width:38, height:38, borderRadius:'var(--radius-sm)', background:'var(--accent-soft)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:14, fontWeight:500, color:'var(--text-primary)' }}>{title}</p>
        {description && <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{description}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch" aria-checked={checked} onClick={onChange} disabled={disabled}
      style={{
        width:44, height:24, borderRadius:12,
        background: checked ? 'var(--accent)' : 'var(--border)',
        border:'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position:'relative', transition:'background var(--transition)', flexShrink:0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position:'absolute', top:2, left: checked ? 22 : 2,
        width:20, height:20, borderRadius:'50%', background:'#fff',
        transition:'left var(--transition)', boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

// Ключи приватности и их пресеты
const PRIVACY_OPTIONS = [
  { k:'all',       icon:<Users size={13}/>,   text:'Все' },
  { k:'followers', icon:<Eye size={13}/>,     text:'Подписчики' },
  { k:'nobody',    icon:<EyeOff size={13}/>,  text:'Никто' },
]

function PrivacyModal({ settings, onSave, onClose }) {
  const [profileVisible, setProfileVisible] = useState(settings.profileVisible || 'all')
  const [postsVisible,   setPostsVisible]   = useState(settings.postsVisible   || 'all')

  function save() {
    onSave({ profileVisible, postsVisible })
    onClose()
  }

  return (
    <div
      style={{ position:'fixed', inset:0, background:'var(--bg-overlay)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card animate-fade-in" style={{ width:'100%', maxWidth:440, padding:24 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)' }}>Конфиденциальность</h2>
          <button className="btn-icon" onClick={onClose}><X size={16}/></button>
        </div>

        {[
          { label:'Кто видит мой профиль', value:profileVisible, set:setProfileVisible },
          { label:'Кто видит мои посты',   value:postsVisible,   set:setPostsVisible },
        ].map(({ label, value, set }) => (
          <div key={label} style={{ marginBottom:16 }}>
            <p style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)', marginBottom:8 }}>{label}</p>
            <div style={{ display:'flex', gap:8 }}>
              {PRIVACY_OPTIONS.map(opt => (
                <button key={opt.k} onClick={() => set(opt.k)} style={{
                  display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                  borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:500, cursor:'pointer',
                  border:`1.5px solid ${value===opt.k ? 'var(--accent)' : 'var(--border)'}`,
                  background: value===opt.k ? 'var(--accent-soft)' : 'var(--bg-input)',
                  color: value===opt.k ? 'var(--accent)' : 'var(--text-secondary)',
                  transition:'all var(--transition)',
                }}>
                  {opt.icon} {opt.text}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginTop:8, padding:'10px 14px', borderRadius:'var(--radius-sm)', background:'var(--accent-soft)', border:'1px solid var(--border)', fontSize:12, color:'var(--text-muted)' }}>
          <Lock size={12} style={{ display:'inline', verticalAlign:'middle', marginRight:5 }} />
          Настройки сохраняются в этом браузере. Серверная фильтрация будет добавлена в следующем обновлении.
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
          <button className="btn btn-primary" onClick={save} style={{ fontSize:13 }}>Сохранить</button>
        </div>
      </div>
    </div>
  )
}

const DEFAULT_PRIVACY = { profileVisible:'all', postsVisible:'all' }

function loadPrivacy() {
  try { return JSON.parse(localStorage.getItem('privacy:settings')) || DEFAULT_PRIVACY }
  catch { return DEFAULT_PRIVACY }
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem('push:enabled') === '1')
  const [pushSupported]               = useState('Notification' in window)
  const [pushDenied, setPushDenied]   = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [privacySettings, setPrivacySettings] = useState(loadPrivacy)
  const [savedMsg, setSavedMsg]       = useState('')

  useEffect(() => {
    if (!pushSupported) return
    if (Notification.permission === 'denied') { setPushDenied(true); setPushEnabled(false) }
  }, [])

  async function togglePush() {
    if (!pushSupported || pushDenied) return
    if (!pushEnabled) {
      const result = await Notification.requestPermission()
      if (result === 'granted') {
        setPushEnabled(true)
        localStorage.setItem('push:enabled', '1')
        new Notification('Vibe Messenger', { body:'Push-уведомления включены ✓', icon:'/icon.png' })
      } else {
        setPushDenied(result === 'denied')
        localStorage.setItem('push:enabled', '0')
      }
    } else {
      setPushEnabled(false)
      localStorage.setItem('push:enabled', '0')
    }
  }

  function savePrivacy(newSettings) {
    setPrivacySettings(newSettings)
    localStorage.setItem('privacy:settings', JSON.stringify(newSettings))
    setSavedMsg('Настройки приватности сохранены')
    setTimeout(() => setSavedMsg(''), 3000)
  }

  const privacyLabel = { all:'Все', followers:'Подписчики', nobody:'Никто' }

  return (
    <div style={{ minHeight:'100dvh', position:'relative', zIndex:1 }}>
      <header className="page-header">
        <h1 className="page-title">Настройки</h1>
      </header>

      <div style={{ maxWidth:600, margin:'0 auto', padding:'24px 16px' }}>

        {savedMsg && (
          <div className="animate-fade-in" style={{
            marginBottom:16, padding:'10px 14px', borderRadius:'var(--radius-sm)',
            background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.25)',
            color:'#16a34a', fontSize:13,
          }}>
            ✓ {savedMsg}
          </div>
        )}

        {/* Внешний вид */}
        <div className="card" style={{ padding:'4px 20px', marginBottom:16 }}>
          <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px', color:'var(--text-muted)', padding:'14px 0 4px' }}>Внешний вид</p>
          <SettingRow
            icon={theme === 'dark' ? <Moon size={18}/> : <Sun size={18}/>}
            title="Тёмная тема"
            description="Переключить на тёмный режим интерфейса"
          >
            <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
          </SettingRow>
        </div>

        {/* Уведомления */}
        <div className="card" style={{ padding:'4px 20px', marginBottom:16 }}>
          <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px', color:'var(--text-muted)', padding:'14px 0 4px' }}>Уведомления</p>
          <SettingRow
            icon={pushEnabled ? <Bell size={18}/> : <BellOff size={18}/>}
            title="Push-уведомления"
            description={
              !pushSupported ? 'Браузер не поддерживает уведомления' :
              pushDenied ? 'Заблокировано — разрешите в настройках браузера' :
              pushEnabled ? 'Включены' : 'Новые сообщения и активность'
            }
          >
            <Toggle checked={pushEnabled} onChange={togglePush} disabled={!pushSupported || pushDenied} />
          </SettingRow>
          {pushDenied && (
            <p style={{ fontSize:12, color:'#f59e0b', padding:'0 0 12px', display:'flex', alignItems:'center', gap:6 }}>
              ⚠️ Уведомления заблокированы. Откройте настройки браузера и разрешите для этого сайта.
            </p>
          )}
        </div>

        {/* Конфиденциальность */}
        <div className="card" style={{ padding:'4px 20px', marginBottom:16 }}>
          <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px', color:'var(--text-muted)', padding:'14px 0 4px' }}>Конфиденциальность</p>
          <SettingRow
            icon={<Shield size={18}/>}
            title="Приватность профиля"
            description={`Профиль: ${privacyLabel[privacySettings.profileVisible]} · Посты: ${privacyLabel[privacySettings.postsVisible]}`}
          >
            <button className="btn btn-secondary" onClick={() => setShowPrivacy(true)} style={{ fontSize:12, padding:'6px 14px' }}>
              Изменить
            </button>
          </SettingRow>
        </div>

        <p style={{ textAlign:'center', fontSize:12, color:'var(--text-muted)', marginTop:24 }}>
          Vibe Messenger v1.0 · © 2026 · Сделано с ❤️
        </p>
      </div>

      {showPrivacy && (
        <PrivacyModal settings={privacySettings} onSave={savePrivacy} onClose={() => setShowPrivacy(false)} />
      )}
    </div>
  )
}
