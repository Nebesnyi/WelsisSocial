import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Paperclip, Send, Trash2, X, ChevronUp, Smile } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getSocket, sendMessage, sendTypingStart, sendTypingStop, markMessagesRead, deleteMessage } from '../services/socket'
import { initNotifications, showNotification } from '../services/notifications'
import { formatLastSeen } from '../utils/formatTime'
import api from '../services/api'

const API_URL   = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const PAGE_SIZE = 50

// ── Emoji ─────────────────────────────────────────────────────────────────────
// Используем только эмодзи, которые гарантированно рендерятся как картинки
// во всех браузерах (без проблем с квадратиками и неотображаемыми глифами)
const EMOJI_TABS = [
  {
    label: '😀',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃',
      '😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙',
      '😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔',
      '😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔',
      '😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶',
      '😱','😨','😰','😥','😓','🤯','😭','😢','😤','😠',
    ],
  },
  {
    label: '👍',
    emojis: [
      '👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉',
      '👆','👇','☝️','👏','🙌','🤲','🤝','🙏','✍️','💪',
      '🦵','🦶','👂','👃','🫀','🫁','🧠','🦷','🦴','👀',
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
      '💯','💢','💥','💫','💦','💨','🕳️','💬','💭','🗯️',
    ],
  },
  {
    label: '🐶',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
      '🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧',
      '🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝',
      '🐛','🦋','🐌','🐞','🐜','🦟','🦗','🦂','🐢','🐍',
      '🦎','🦖','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟',
    ],
  },
  {
    label: '🍕',
    emojis: [
      '🍕','🍔','🌭','🌮','🌯','🥙','🧆','🥚','🍳','🥘',
      '🍲','🍜','🍝','🍛','🍣','🍱','🍤','🍙','🍚','🍘',
      '🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫',
      '🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','☕','🍵',
      '🧋','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾',
    ],
  },
  {
    label: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱',
      '🏓','🏸','🏒','🥅','⛳','🏹','🎣','🤿','🎽','🎿',
      '🛷','🥌','🎯','🎱','🎮','🎲','🎭','🎨','🎬','🎤',
      '🎧','🎸','🎹','🎷','🎺','🎻','🥁','🪘','📱','💻',
      '🚀','🌍','⭐','🌈','🔥','✨','🎉','🎊','🎈','🏆',
    ],
  },
]

function EmojiPicker({ onSelect, onClose }) {
  const [tab, setTab] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  // Прокрутка колесиком мыши вниз/вверх
  useEffect(() => {
    const el = ref.current?.querySelector('.emoji-grid')
    if (!el) return
    const handleWheel = (e) => {
      e.preventDefault()
      el.scrollTop += e.deltaY
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  return (
    <div ref={ref} style={{
      position:'absolute', bottom:'calc(100% + 8px)', left:0,
      width:320, background:'var(--bg-surface)',
      border:'1px solid var(--border)', borderRadius:'var(--radius-md)',
      boxShadow:'var(--shadow-lg)', zIndex:200, overflow:'hidden',
    }}>
      {/* Вкладки */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--bg-surface-2)' }}>
        {EMOJI_TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            flex:1, padding:'8px 0', fontSize:18, lineHeight:1,
            background:'transparent', border:'none', cursor:'pointer',
            borderBottom: tab === i ? '2px solid var(--accent)' : '2px solid transparent',
            opacity: tab === i ? 1 : 0.55, transition:'opacity 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>
      {/* Сетка с вертикальной прокруткой */}
      <div className="emoji-grid" style={{
        padding:8, display:'grid', gridTemplateColumns:'repeat(10, 1fr)', gap:2,
        maxHeight:220, overflowY:'auto', overflowX:'hidden',
      }}>
        {EMOJI_TABS[tab].emojis.map((emoji, i) => (
          <button key={i} onClick={() => { onSelect(emoji); onClose() }} style={{
            fontSize:20, padding:'5px 2px', background:'transparent', border:'none',
            cursor:'pointer', borderRadius:6, lineHeight:1,
            fontFamily:'"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif',
          }}
            onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 36 }) {
  const colors = ['#6d5ef5','#7c3aed','#5b21b6','#4c1d95']
  const color  = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', overflow:'hidden', flexShrink:0, background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:600, color:'#fff' }}>
      {src ? <img src={src} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : name?.[0]?.toUpperCase()}
    </div>
  )
}

function fmtTime(str) {
  if (!str) return ''
  return new Date(str).toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' })
}

// ── ChatWindow ─────────────────────────────────────────────────────────────────
export default function ChatWindow() {
  const { id: chatId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [chat, setChat]           = useState(null)
  const [messages, setMessages]   = useState([])
  const [messageInput, setInput]  = useState('')
  const [loading, setLoading]     = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore]     = useState(false)
  const [offset, setOffset]       = useState(0)
  const [typingUsers, setTyping]  = useState([])
  const [sending, setSending]     = useState(false)
  const [otherUser, setOtherUser] = useState(null)
  const [showDeleteId, setDeleteId] = useState(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [error, setError]         = useState('')

  const endRef         = useRef(null)
  const topSentinelRef = useRef(null)
  const typingTimer    = useRef(null)
  const inputRef       = useRef(null)
  const readTimer      = useRef(null)
  const mainRef        = useRef(null)
  const prevScrollH    = useRef(0)

  function scheduleMarkRead() {
    if (readTimer.current) clearTimeout(readTimer.current)
    readTimer.current = setTimeout(() => markMessagesRead(chatId), 400)
  }

  const handleNewMessage = useCallback(({ message }) => {
    if (String(message.chat_id) !== String(chatId)) return
    setMessages(prev => {
      if (prev.some(m => m.id === message.id)) return prev
      const optIdx = prev.findIndex(m => m.content === message.content && m.user_id === message.user_id && m.id > 1e12)
      if (optIdx !== -1) { const u=[...prev]; u[optIdx]={...u[optIdx], id:message.id}; return u }
      return [...prev, message]
    })
    scheduleMarkRead()
    setTimeout(() => endRef.current?.scrollIntoView({ behavior:'smooth' }), 60)
  }, [chatId])

  const handleMessageRead  = useCallback(({ chatId:rid, userId }) => {
    if (String(rid) !== String(chatId) || String(userId) === String(user.id)) return
    setMessages(prev => prev.map(m => String(m.user_id) === String(user.id) ? {...m, is_read:1} : m))
  }, [chatId, user.id])

  const handleDeletedMessage = useCallback(({ messageId, chatId:dc }) => {
    if (String(dc) === String(chatId)) setMessages(prev => prev.filter(m => m.id !== messageId))
  }, [chatId])

  const handleTypingStart = useCallback(({ userId }) => {
    if (String(userId) !== String(user.id)) setTyping(prev => [...prev.filter(x=>x!==userId), userId])
  }, [user.id])
  const handleTypingStop  = useCallback(({ userId }) => setTyping(prev => prev.filter(x=>x!==userId)), [])
  const handleUserOnline  = useCallback(({ userId }) => setOtherUser(p => p && String(userId)===String(p.id) ? {...p,status:'online'} : p), [])
  const handleUserOffline = useCallback(({ userId }) => setOtherUser(p => p && String(userId)===String(p.id) ? {...p,status:'offline', last_seen:new Date().toISOString()} : p), [])
  const handlePush        = useCallback(({ type, from, chatId:nc, content }) => {
    if (type === 'message') showNotification(from, content, () => navigate(`/chat/${nc}`))
  }, [navigate])

  useEffect(() => {
    initNotifications()
    loadChat()
    loadMessages(0, true)
    const s = getSocket()
    if (s) {
      s.on('message:new',             handleNewMessage)
      s.on('message:read',            handleMessageRead)
      s.on('message:deleted',         handleDeletedMessage)
      s.on('message:deleted:confirm', () => {})
      s.on('typing:start',            handleTypingStart)
      s.on('typing:stop',             handleTypingStop)
      s.on('user:online',             handleUserOnline)
      s.on('user:offline',            handleUserOffline)
      s.on('notification:new',        handlePush)
    }
    return () => {
      if (s) {
        s.off('message:new', handleNewMessage); s.off('message:read', handleMessageRead)
        s.off('message:deleted', handleDeletedMessage); s.off('typing:start', handleTypingStart)
        s.off('typing:stop', handleTypingStop); s.off('user:online', handleUserOnline)
        s.off('user:offline', handleUserOffline); s.off('notification:new', handlePush)
      }
      if (readTimer.current) clearTimeout(readTimer.current)
      if (typingTimer.current) clearTimeout(typingTimer.current)
    }
  }, [chatId, handleNewMessage, handleMessageRead, handleDeletedMessage,
      handleTypingStart, handleTypingStop, handleUserOnline, handleUserOffline, handlePush])

  useEffect(() => { if (chatId) scheduleMarkRead() }, [chatId])
  useEffect(() => {
    if (chat?.type === 'private' && chat.members)
      setOtherUser(chat.members.find(m => String(m.id) !== String(user.id)))
  }, [chat, user.id])

  useEffect(() => {
    if (!hasMore || loadingOlder) return
    const sentinel = topSentinelRef.current; if (!sentinel) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) loadOlderMessages() },
      { root: mainRef.current, threshold: 0.1 }
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [hasMore, loadingOlder, offset])

  async function loadChat() {
    try { const r = await api.get(`/chats/${chatId}`); setChat(r.data.chat) }
    catch { navigate('/messages') }
  }

  async function loadMessages(off = 0, initial = false) {
    try {
      const r = await api.get(`/messages/chat/${chatId}?limit=${PAGE_SIZE}&offset=${off}`)
      const fetched = r.data.messages || []
      const total   = r.data.meta?.total ?? fetched.length
      if (initial) {
        setMessages(fetched); setOffset(fetched.length)
        setHasMore(fetched.length < total)
        setTimeout(() => endRef.current?.scrollIntoView({ behavior:'instant' }), 50)
      }
      scheduleMarkRead()
    } catch { setError('Не удалось загрузить сообщения') }
    finally { setLoading(false) }
  }

  async function loadOlderMessages() {
    if (loadingOlder || !hasMore) return
    setLoadingOlder(true)
    const el = mainRef.current
    if (el) prevScrollH.current = el.scrollHeight
    try {
      const r = await api.get(`/messages/chat/${chatId}?limit=${PAGE_SIZE}&offset=${offset}`)
      const fetched  = r.data.messages || []
      const total    = r.data.meta?.total ?? 0
      const newOffset = offset + fetched.length
      setMessages(prev => [...fetched, ...prev])
      setOffset(newOffset); setHasMore(newOffset < total)
      requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevScrollH.current })
    } catch { /* silent */ }
    finally { setLoadingOlder(false) }
  }

  async function handleSend(e) {
    e?.preventDefault()
    if (!messageInput.trim() || sending) return
    setSending(true)
    const text = messageInput.trim()
    try {
      const opt = { id:Date.now(), chat_id:parseInt(chatId), user_id:user.id, username:user.username, avatar:user.avatar, content:text, file_url:null, file_type:null, file_name:null, created_at:new Date().toISOString(), is_read:0 }
      setMessages(prev => [...prev, opt])
      setInput('')
      sendMessage(chatId, text)
      sendTypingStop(chatId)
      setTimeout(() => endRef.current?.scrollIntoView({ behavior:'smooth' }), 60)
    } catch { setError('Не удалось отправить') }
    finally { setSending(false) }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]; if (!file) return
    const fd = new FormData(); fd.append('chatId', chatId); fd.append('file', file)
    const optId = Date.now()
    const localUrl = URL.createObjectURL(file)
    setMessages(prev => [...prev, { id:optId, chat_id:parseInt(chatId), user_id:user.id, username:user.username, avatar:user.avatar, content:null, file_url:localUrl, file_type:file.type, file_name:file.name, created_at:new Date().toISOString(), is_read:0, _isLocalPreview:true }])
    setTimeout(() => endRef.current?.scrollIntoView({ behavior:'smooth' }), 60)
    try {
      setSending(true)
      const r = await api.post('/messages', fd, { headers:{ 'Content-Type':'multipart/form-data' } })
      if (r?.data?.message) setMessages(prev => prev.map(m => m.id === optId ? r.data.message : m))
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка отправки файла')
      setMessages(prev => prev.filter(m => m.id !== optId))
    } finally { URL.revokeObjectURL(localUrl); setSending(false); e.target.value = '' }
  }

  function handleTyping() {
    sendTypingStart(chatId)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => sendTypingStop(chatId), 1000)
  }

  function insertEmoji(emoji) {
    const input = inputRef.current
    if (!input) { setInput(prev => prev + emoji); return }
    const start = input.selectionStart ?? messageInput.length
    const end   = input.selectionEnd   ?? messageInput.length
    const next  = messageInput.slice(0, start) + emoji + messageInput.slice(end)
    setInput(next)
    setTimeout(() => { input.focus(); const pos = start + [...emoji].length; input.setSelectionRange(pos, pos) }, 0)
  }

  async function handleDelete(id) {
    if (id > 1e12) return
    deleteMessage(id, chatId)
    setMessages(prev => prev.filter(m => m.id !== id))
    setDeleteId(null)
  }

  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', zIndex:1 }}>
      <div style={{ width:32, height:32, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  )

  const isOnline      = otherUser?.status === 'online'
  const chatName      = chat?.name || otherUser?.username || chat?.other_members || 'Чат'
  const otherAvatarSrc = otherUser?.avatar ? `${API_URL}${otherUser.avatar}` : (chat?.other_avatar ? `${API_URL}${chat.other_avatar}` : null)
  const statusText    = otherUser ? formatLastSeen(otherUser.status, otherUser.last_seen) : ''

  return (
    <div style={{ height:'calc(100dvh - 52px)', display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>

      {/* Шапка чата */}
      <div style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border)', padding:'10px 16px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <button className="btn-icon" onClick={() => navigate('/messages')} title="Назад"><ArrowLeft size={18}/></button>
        <div style={{ position:'relative' }}>
          <button onClick={() => otherUser?.id && navigate(`/users/${otherUser.id}`)} style={{ background:'transparent', border:'none', padding:0, cursor: otherUser?.id ? 'pointer' : 'default' }}>
            <Avatar src={otherAvatarSrc} name={chatName} size={40}/>
          </button>
          {chat?.type === 'private' && (
            <span style={{ position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:'50%', border:'2px solid var(--bg-surface)', background: isOnline ? 'var(--status-online)' : 'var(--status-offline)' }} />
          )}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p onClick={() => otherUser?.id && navigate(`/users/${otherUser.id}`)}
            style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor: otherUser?.id ? 'pointer' : 'default' }}>
            {chatName}
          </p>
          <p style={{ fontSize:12, color: typingUsers.length ? 'var(--accent)' : isOnline ? 'var(--status-online)' : 'var(--text-muted)' }}>
            {typingUsers.length ? 'печатает...' : statusText}
          </p>
        </div>
      </div>

      {/* Сообщения */}
      <main ref={mainRef} style={{ flex:1, overflowY:'auto', padding:'12px 16px', background:'var(--bg-app)' }}
        onClick={() => { setDeleteId(null); setShowEmoji(false) }}>
        <div style={{ maxWidth:720, margin:'0 auto', display:'flex', flexDirection:'column', gap:4 }}>

          {error && (
            <div style={{ padding:'10px 14px', borderRadius:'var(--radius-sm)', marginBottom:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', fontSize:13, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              {error}
              <button onClick={() => setError('')} style={{ background:'none', border:'none', cursor:'pointer', padding:2, color:'#ef4444' }}><X size={14}/></button>
            </div>
          )}

          <div ref={topSentinelRef} style={{ height:1 }}/>

          {hasMore && (
            <button className="load-older-btn" onClick={loadOlderMessages} disabled={loadingOlder}>
              {loadingOlder
                ? <div style={{ width:16, height:16, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                : <><ChevronUp size={14}/> Загрузить старые сообщения</>
              }
            </button>
          )}

          {messages.map((msg, i) => {
            const isOwn      = String(msg.user_id) === String(user.id)
            const isRead     = msg.is_read === 1
            const showAvatar = !isOwn && (i === 0 || messages[i-1]?.user_id !== msg.user_id)
            const groupTail  = isOwn ? (i === messages.length-1 || messages[i+1]?.user_id !== msg.user_id) : showAvatar
            const msgAvatar  = msg.avatar ? `${API_URL}${msg.avatar}` : null
            return (
              <div key={msg.id} className="animate-fade-in"
                style={{ display:'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', alignItems:'flex-end', gap:8, marginBottom: groupTail ? 8 : 2 }}>
                {!isOwn && <div style={{ width:32, flexShrink:0 }}>{showAvatar && <Avatar src={msgAvatar} name={msg.username} size={32}/>}</div>}
                <div style={{ display:'flex', flexDirection:'column', alignItems: isOwn ? 'flex-end' : 'flex-start', maxWidth:'min(72%, 480px)' }}>
                  {!isOwn && showAvatar && (
                    <span onClick={() => navigate(`/users/${msg.user_id}`)} style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3, marginLeft:2, cursor:'pointer' }}>{msg.username}</span>
                  )}
                  <div style={{ position:'relative' }}>
                    {isOwn && showDeleteId === msg.id && (
                      <div style={{ position:'absolute', top:-42, right:0, zIndex:10, display:'flex', gap:6 }}>
                        <button onClick={() => handleDelete(msg.id)} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--radius-sm)', padding:'6px 12px', color:'#ef4444', fontSize:12, cursor:'pointer', fontWeight:500, whiteSpace:'nowrap' }}>
                          <Trash2 size={13}/> Удалить
                        </button>
                        <button onClick={() => setDeleteId(null)} style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'6px 10px', color:'var(--text-muted)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center' }}>
                          <X size={13}/>
                        </button>
                      </div>
                    )}
                    <div
                      onClick={e => { e.stopPropagation(); if (isOwn) setDeleteId(showDeleteId === msg.id ? null : msg.id) }}
                      style={{
                        padding:'9px 14px',
                        borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isOwn ? 'var(--accent)' : 'var(--bg-surface)',
                        color: isOwn ? '#fff' : 'var(--text-primary)',
                        border: isOwn ? 'none' : '1px solid var(--border)',
                        cursor: isOwn ? 'pointer' : 'default',
                        boxShadow:'var(--shadow-sm)',
                        fontFamily:'"Segoe UI","Apple Color Emoji","Noto Color Emoji",sans-serif',
                      }}>
                      {msg.content && (
                        <p style={{ fontSize:14, lineHeight:1.55, wordBreak:'break-word', whiteSpace:'pre-wrap', fontFamily:'inherit' }}>{msg.content}</p>
                      )}
                      {msg.file_url && (
                        <div style={{ marginTop: msg.content ? 8 : 0 }}>
                          {msg.file_type?.startsWith('image/') ? (
                            <img src={msg._isLocalPreview ? msg.file_url : `${API_URL}${msg.file_url}`} alt={msg.file_name} style={{ maxWidth:'100%', borderRadius:10, display:'block' }}/>
                          ) : (
                            <a href={msg._isLocalPreview ? msg.file_url : `${API_URL}${msg.file_url}`} target="_blank" rel="noopener noreferrer"
                              style={{ display:'flex', alignItems:'center', gap:8, background: isOwn ? 'rgba(255,255,255,0.15)' : 'var(--bg-surface-2)', padding:'8px 12px', borderRadius:10, textDecoration:'none', color:'inherit', border:`1px solid ${isOwn ? 'rgba(255,255,255,0.2)' : 'var(--border)'}` }}>
                              <Paperclip size={14}/>
                              <span style={{ fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{msg.file_name}</span>
                            </a>
                          )}
                        </div>
                      )}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:4, marginTop:4 }}>
                        <span style={{ fontSize:10, opacity: isOwn ? 0.7 : 0.5 }}>{fmtTime(msg.created_at)}</span>
                        {isOwn && (isRead
                          ? <svg width="16" height="10" viewBox="0 0 16 10" fill="none"><path d="M1 5l3 3L11 1" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 5l3 3L15 1" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          : <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 5l3 3L9 1" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {typingUsers.length > 0 && (
            <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
              <div style={{ width:32, flexShrink:0 }}><Avatar src={otherAvatarSrc} name={chatName} size={32}/></div>
              <div style={{ padding:'10px 16px', borderRadius:'18px 18px 18px 4px', background:'var(--bg-surface)', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)' }}>
                <div style={{ display:'flex', gap:4, alignItems:'center', height:16 }}>
                  {[0,0.2,0.4].map((d, i) => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', opacity:0.7, animation:`pulse 1.2s ${d}s infinite` }}/>)}
                </div>
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>
      </main>

      {/* Поле ввода */}
      <footer style={{ background:'var(--bg-surface)', borderTop:'1px solid var(--border)', padding:'10px 16px', flexShrink:0 }}>
        <div style={{ maxWidth:720, margin:'0 auto', display:'flex', alignItems:'center', gap:8 }}>

          {/* Прикрепить файл */}
          <label className="btn-icon" style={{ width:38, height:38, cursor:'pointer', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', flexShrink:0 }} title="Прикрепить файл">
            <Paperclip size={17}/>
            <input type="file" onChange={handleFileUpload} style={{ display:'none' }} accept="image/*,.pdf,.doc,.docx,.txt,.zip"/>
          </label>

          {/* Эмодзи */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <button className="btn-icon"
              style={{ width:38, height:38, border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', color: showEmoji ? 'var(--accent)' : 'var(--text-muted)' }}
              onClick={e => { e.stopPropagation(); setShowEmoji(v => !v) }}
              title="Эмодзи"
            >
              <Smile size={17}/>
            </button>
            {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} position="top-right"/>}
          </div>

          {/* Ввод */}
          <input
            ref={inputRef}
            type="text"
            value={messageInput}
            onChange={e => { setInput(e.target.value); handleTyping() }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            className="ui-input"
            placeholder="Сообщение..."
            style={{ flex:1, borderRadius:'var(--radius-md)', fontFamily:'"Segoe UI","Apple Color Emoji","Noto Color Emoji",sans-serif' }}
          />

          {/* Отправить */}
          <button onClick={handleSend} disabled={!messageInput.trim() || sending}
            style={{
              width:40, height:40, borderRadius:'var(--radius-sm)', border:'none',
              cursor: messageInput.trim() ? 'pointer' : 'not-allowed', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              background: messageInput.trim() ? 'var(--accent)' : 'var(--bg-surface-2)',
              color: messageInput.trim() ? '#fff' : 'var(--text-muted)',
              boxShadow: messageInput.trim() ? '0 2px 10px var(--accent-glow)' : 'none',
              transition:'all var(--transition)',
            }}
          >
            <Send size={16}/>
          </button>
        </div>
      </footer>
    </div>
  )
}
