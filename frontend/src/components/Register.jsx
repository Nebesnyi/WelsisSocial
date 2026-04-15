import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap, Lock, Mail, User } from 'lucide-react'
import { toast } from 'react-toastify'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const [email, setEmail]       = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    
    // Валидация на клиенте
    if (password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов')
      return
    }
    if (!email.includes('@')) {
      toast.error('Введите корректный email')
      return
    }
    if (username.length < 2 || username.length > 30) {
      toast.error('Имя должно быть от 2 до 30 символов')
      return
    }
    
    setError(''); setLoading(true)
    try {
      await register(email, password, username)
      toast.success('Регистрация успешна! Добро пожаловать!')
      navigate('/messages')
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Ошибка при регистрации'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, position: 'relative', zIndex: 1, background: 'var(--bg-app)',
    }}>
      <div style={{
        position: 'fixed', bottom: -200, left: -200,
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px var(--accent-glow)', marginBottom: 14,
          }}>
            <Zap size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Создать аккаунт</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Присоединяйтесь к Aura Social</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Имя пользователя</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="ui-input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" required minLength={2} maxLength={30} style={{ paddingLeft: 38 }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="ui-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={{ paddingLeft: 38 }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Пароль</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="ui-input" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Минимум 6 символов" required minLength={6} style={{ paddingLeft: 38, paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPass(v => !v)} className="btn-icon" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13 }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4, padding: '11px', fontSize: 15, position: 'relative', minWidth: 120 }}>
              {loading ? (
                <>
                  <span style={{ opacity: 0 }}>Зарегистрироваться</span>
                  <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                    <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                </>
              ) : 'Зарегистрироваться'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
          Уже есть аккаунт?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>Войти</Link>
        </p>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }
