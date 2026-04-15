import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send, X, ChevronDown, Smile } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const LIMIT   = 20

// ── Обновленный набор эмодзи по категориям (как в ВК) ──────────────────────────
const EMOJI_TABS = [
  { 
    label: '😀', 
    name: 'Частые',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇',
      '🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑',
      '🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬',
      '🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵',
      '🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️',
      '😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱',
      '😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿',
      '💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'
    ] 
  },
  { 
    label: '👍', 
    name: 'Жесты',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈',
      '👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌',
      '👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂',
      '🦻','👃','🧠','🦷','🦴','👀','👁️','👅','👄','💋','🩸',
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞',
      '💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯',
      '🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐',
      '♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺',
      '🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️',
      '🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','💥','💫',
      '💦','💨','🕳️','💣','💬','👁️‍🗨️','🗨️','🗯️','💭','💤'
    ] 
  },
  { 
    label: '🐶', 
    name: 'Животные',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷',
      '🐽','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥',
      '🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌',
      '🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🕸️','🦂','🐢','🐍','🦎',
      '🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋',
      '🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫',
      '🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌',
      '🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍','🪶','🐓','🦃','🦤','🦚','🦜',
      '🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿️','🦔',
      '🐾','🐉','🐲','🌵','🎄','🌲','🌳','🌴','🪹','🪺','🌱','🌿','☘️',
      '🍀','🎍','🪴','🎋','🍃','🍂','🍁','🍄','🐚','🪨','🌾','💐','🌷',
      '🌹','🥀','🌺','🌸','🌼','🌻','🌞','🌝','🌛','🌜','🌚','🌕','🌖',
      '🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌎','🌍','🌏','🪐','💫','⭐',
      '🌟','✨','⚡','☄️','💥','🔥','🌪️','🌈','☀️','🌤️','⛅','🌥️','☁️',
      '🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','💧','💦',
      '☔','☂️','🌊','🌫️'
    ] 
  },
  { 
    label: '🍕', 
    name: 'Еда',
    emojis: [
      '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑',
      '🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽',
      '🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚',
      '🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕',
      '🥪','🥙','🧆','🌮','🌯','🥗','🥘','🥫','🍝','🍜',
      '🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮',
      '🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫',
      '🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','🫖','☕','🍵','🧃','🥤',
      '🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄',
      '🍴','🍽️','🥣','🥡','🥢','🧂'
    ] 
  },
  { 
    label: '⚽', 
    name: 'Активность',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒',
      '🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽',
      '🛹','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️',
      '🤺','🤾','🏌️','🏇','⛑️','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴',
      '🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹','🎭',
      '🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸',
      '🪕','🎻','🎲','♟️','🎯','🎳','🎮','🎰','🧩','🚀','🛸','🚁','🛶',
      '⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🪝','⛽','🚧','🚦','🚥','🚏',
      '🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️',
      '🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','⛺','🛖','🏠','🏡','🏘️',
      '🏚️','🏗️','🏭','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏩',
      '💒','🎪','🌁','🌉','🗾','🎑','🏞️','🌅','🌄','🌠','🎇','🎆','🌇',
      '🌆','🏙️','🌃','🌌','🌉','🌃'
    ] 
  },
  { 
    label: '🎉', 
    name: 'Праздник',
    emojis: [
      '🎃','🎄','🎆','🎇','🧨','✨','🎈','🎉','🎊','🎋','🎍','🎎','🎏',
      '🎐','🎑','🧧','🎀','🎁','🎗️','🎟️','🎫','🎖️','🏆','🏅','🥇','🥈',
      '🥉','⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓',
      '🏸','🏒','🏑','🥍','🏏','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋',
      '🎽','🛹','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸',
      '⛹️','🤺','🤾','🏌️','🏇','⛑️','🧘','🏄','🏊','🤽','🚣','🧗','🚵',
      '🚴','👑','💍','💎','🔮','📿','🧿','💈','⚖️','🔭','🔬','🕳️','💊',
      '💉','🩸','🩹','🩺','🌡️','🧬','🦠','🧫','🧪','🌐','💻','🖥️','🖨️',
      '⌨️','🖱️','🖲️','💽','💾','💿','📀','🧮','🎥','🎞️','📽️','🎬',
      '📺','📷','📸','📹','📼','🔍','🔎','🕯️','💡','🔦','🏮','🪔','📱',
      '☎️','📞','📟','📠','🔋','🔌','💻','🖥️','🖨️','⌨️','🖱️','🖲️',
      '💽','💾','💿','📀','🧮','🎥','🎞️','📽️','🎬','📺','📷','📸','📹',
      '📼','🔍','🔎','🕯️','💡','🔦','🏮','🪔','📱','☎️','📞','📟','📠'
    ] 
  },
]

function EmojiPickerInline({ onSelect, onClose }) {
  const [tab, setTab] = useState(0)
  const ref = useRef(null)
  const scrollRef = useRef(null)

  // Закрытие при клике вне
  useEffect(() => {
    const h = (e) => { 
      if (ref.current && !ref.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', h, true)
    return () => document.removeEventListener('mousedown', h, true)
  }, [onClose])

  // Исправление скролла: используем нативный addEventListener с passive: false
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const handleWheel = (e) => {
      e.stopPropagation();
      
      const isAtTop = element.scrollTop <= 0;
      const isAtBottom = element.scrollTop + element.clientHeight >= element.scrollHeight;
      
      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        return; 
      }

      e.preventDefault();
      element.scrollTop += e.deltaY;
    };

    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div ref={ref} style={{
      position:'absolute', 
      top: '100%', 
      right: 0,
      marginTop: 8,
      width:320, background:'var(--bg-surface)',
      border:'1px solid var(--border)', borderRadius:'var(--radius-md)',
      boxShadow:'var(--shadow-lg)', zIndex:200, overflow:'hidden',
    }}>
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--bg-surface-2)' }}>
        {EMOJI_TABS.map((t, i) => (
          <button 
            key={i} 
            onClick={(e) => { e.stopPropagation(); setTab(i) }} 
            title={t.name}
            style={{
              flex:1, padding:'8px 0', fontSize:18, lineHeight:1,
              background:'transparent', border:'none', cursor:'pointer',
              borderBottom: tab === i ? '2px solid var(--accent)' : '2px solid transparent',
              opacity: tab === i ? 1 : 0.55,
            }}
          >{t.label}</button>
        ))}
      </div>
      
      <div 
        ref={scrollRef}
        key={tab}
        style={{ 
          padding: 8, 
          display: 'grid', 
          gridTemplateColumns: 'repeat(10, 1fr)', 
          gap: 2, 
          maxHeight: 200, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          overscrollBehavior: 'contain' 
        }}
      >
        {EMOJI_TABS[tab].emojis.map((emoji, i) => (
          <button 
            key={i} 
            type="button"
            onClick={() => { onSelect(emoji); onClose() }} 
            style={{
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

function Avatar({ src, name, size = 38, onClick }) {
  const colors = ['#6d5ef5','#7c3aed','#5b21b6','#4c1d95']
  const color  = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div onClick={onClick} style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, background:color, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:600, color:'#fff', cursor: onClick ? 'pointer' : 'default' }}>
      {src ? <img src={src} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : name?.[0]?.toUpperCase()}
    </div>
  )
}

function formatDate(str) {
  if (!str) return ''
  const d = new Date(str), now = new Date(), diff = now - d
  if (diff < 60000) return 'только что'
  if (diff < 3600000) return `${Math.floor(diff/60000)} мин назад`
  if (diff < 86400000) return d.toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' })
  return d.toLocaleDateString('ru-RU', { day:'numeric', month:'long' })
}

function CommentsSection({ postId, commentsCount }) {
  const { user } = useAuth()
  const [open, setOpen]         = useState(false)
  const [comments, setComments] = useState([])
  const [loading, setLoading]   = useState(false)
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [count, setCount]       = useState(commentsCount)
  const [error, setError]       = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef             = useRef(null)

  async function loadComments() {
    if (loading) return; setLoading(true)
    try { const r = await api.get(`/posts/${postId}/comments`); setComments(r.data.comments || []) }
    catch { /* silent */ } finally { setLoading(false) }
  }

  async function toggle() { if (!open) await loadComments(); setOpen(v => !v) }

  async function submit(e) {
    e.preventDefault()
    const trimmed = text.trim(); if (!trimmed || sending) return
    setSending(true); setError('')
    try {
      const r = await api.post(`/posts/${postId}/comments`, { content: trimmed })
      if (r.data.comment) { setComments(prev => [r.data.comment, ...prev]); setCount(c => c+1); setText('') }
    } catch (err) { setError(err?.response?.data?.error || 'Ошибка отправки') }
    finally { setSending(false) }
  }

  function insertEmoji(emoji) {
    const ta = textareaRef.current
    if (!ta) { setText(prev => prev + emoji); return }
    const start = ta.selectionStart ?? text.length
    const end   = ta.selectionEnd   ?? text.length
    const next  = text.slice(0, start) + emoji + text.slice(end)
    setText(next)
    setTimeout(() => { ta.focus(); const pos = start + [...emoji].length; ta.setSelectionRange(pos, pos) }, 0)
  }

  return (
    <div>
      <button onClick={toggle} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, padding:'6px 12px', color: open ? 'var(--accent)' : 'var(--text-muted)', background:'transparent', border:'none', cursor:'pointer', borderRadius:'var(--radius-sm)' }}>
        <MessageCircle size={15}/>
        {count > 0 && <span>{count}</span>}
        <span>Комментарий</span>
        {count > 0 && <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}/>}
      </button>

      {open && (
        <div style={{ borderTop:'1px solid var(--border-light)', padding:'12px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          <form onSubmit={submit} style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
            <Avatar src={user?.avatar ? `${API_URL}${user.avatar}` : null} name={user?.username} size={28}/>
            <div style={{ flex:1, position:'relative' }}>
              <input
                ref={textareaRef}
                className="ui-input"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Написать комментарий..."
                style={{ width:'100%', padding:'7px 36px 7px 12px', fontSize:13, boxSizing:'border-box', fontFamily:'"Segoe UI","Apple Color Emoji","Noto Color Emoji",sans-serif' }}
                maxLength={500}
              />
              {/* Эмодзи внутри поля */}
              <div style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)' }}>
                <button type="button" onClick={e => { e.stopPropagation(); setShowEmoji(v => !v) }}
                  style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:16, lineHeight:1, padding:0, color: showEmoji ? 'var(--accent)' : 'var(--text-muted)' }}>
                  😊
                </button>
              </div>
              {showEmoji && <EmojiPickerInline onSelect={insertEmoji} onClose={() => setShowEmoji(false)}/>}
            </div>
            <button type="submit" disabled={!text.trim() || sending}
              style={{ background: text.trim() ? 'var(--accent)' : 'var(--bg-surface-2)', color: text.trim() ? '#fff' : 'var(--text-muted)', border:'none', borderRadius:'var(--radius-sm)', width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor: text.trim() ? 'pointer' : 'default', flexShrink:0, transition:'all var(--transition)' }}>
              <Send size={15}/>
            </button>
          </form>
          {error && <p style={{ fontSize:12, color:'#ef4444' }}>{error}</p>}
          {loading ? (
            <div style={{ textAlign:'center', padding:'8px 0' }}>
              <div style={{ width:20, height:20, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/>
            </div>
          ) : comments.length === 0 ? (
            <p style={{ fontSize:13, color:'var(--text-muted)', textAlign:'center', padding:'8px 0' }}>Нет комментариев</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:320, overflowY:'auto' }}>
              {comments.map(c => (
                <div key={c.id} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <Avatar src={c.avatar ? `${API_URL}${c.avatar}` : null} name={c.username} size={28}/>
                  <div style={{ flex:1, background:'var(--bg-surface-2)', borderRadius:'var(--radius-sm)', padding:'8px 12px' }}>
                    <p style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>{c.username}</p>
                    <p style={{ fontSize:13, color:'var(--text-primary)', lineHeight:1.5, fontFamily:'"Segoe UI","Apple Color Emoji","Noto Color Emoji",sans-serif' }}>{c.content}</p>
                    <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{formatDate(c.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PostCard({ post, onLike, onNavigate }) {
  const [expanded, setExpanded] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const isLong = post.content?.length > 280

  async function handleLike() {
    if (likeLoading) return; setLikeLoading(true)
    try { await onLike(post.id) } finally { setLikeLoading(false) }
  }

  return (
    <article className="card animate-fade-in" style={{ padding:0, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px 10px' }}>
        <Avatar src={post.avatar ? `${API_URL}${post.avatar}` : null} name={post.username} onClick={() => onNavigate(post.user_id)}/>
        <div style={{ flex:1, minWidth:0 }}>
          <button onClick={() => onNavigate(post.user_id)} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
            <span style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>{post.username}</span>
          </button>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>{formatDate(post.created_at)}</div>
        </div>
      </div>

      {post.content && (
        <div style={{ padding:'0 16px 12px' }}>
          <p style={{ fontSize:14, lineHeight:1.6, color:'var(--text-primary)', whiteSpace:'pre-wrap', overflow:'hidden', display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp: expanded || !isLong ? 'unset' : 4, fontFamily:'"Segoe UI","Apple Color Emoji","Noto Color Emoji",sans-serif' }}>
            {post.content}
          </p>
          {isLong && !expanded && (
            <button onClick={() => setExpanded(true)} style={{ fontSize:13, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', padding:'4px 0' }}>Читать далее</button>
          )}
        </div>
      )}

      {post.image_url && (
        <div style={{ overflow:'hidden', borderTop: post.content ? '1px solid var(--border-light)' : 'none' }}>
          <img src={`${API_URL}${post.image_url}`} alt="" style={{ width:'100%', maxHeight:480, objectFit:'cover', display:'block' }} loading="lazy"/>
        </div>
      )}

      <div style={{ height:1, background:'var(--border-light)' }}/>

      <div style={{ display:'flex', gap:4, padding:'6px 12px' }}>
        <button onClick={handleLike} disabled={likeLoading} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, padding:'7px 12px', color: post.liked_by_viewer ? 'var(--accent)' : 'var(--text-muted)', background:'transparent', border:'none', cursor:'pointer', borderRadius:'var(--radius-sm)', transition:'color var(--transition)' }}>
          <Heart size={16} fill={post.liked_by_viewer ? 'currentColor' : 'none'}/>
          {post.likes_count > 0 && <span>{post.likes_count}</span>}
          <span>Нравится</span>
        </button>

        <CommentsSection postId={post.id} commentsCount={post.comments_count}/>

        <button style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, padding:'7px 12px', color:'var(--text-muted)', marginLeft:'auto', background:'transparent', border:'none', cursor:'pointer', borderRadius:'var(--radius-sm)' }}>
          <Share2 size={16}/>
        </button>
      </div>
    </article>
  )
}

export default function Feed() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [posts, setPosts]           = useState([])
  const [content, setContent]       = useState('')
  const [imageFile, setImageFile]   = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [posting, setPosting]       = useState(false)
  const [error, setError]           = useState('')
  const [hasMore, setHasMore]       = useState(false)
  const [offset, setOffset]         = useState(0)
  const [showEmoji, setShowEmoji]   = useState(false)

  const textareaRef  = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => { loadFeed(0, true) }, [])
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }, [imagePreview])

  async function loadFeed(off = 0, replace = false) {
    try {
      if (replace) setLoading(true)
      const r = await api.get(`/posts/feed?limit=${LIMIT}&offset=${off}`)
      const newPosts = r.data.posts || []
      const total    = r.data.meta?.total ?? newPosts.length
      setPosts(prev => replace ? newPosts : [...prev, ...newPosts])
      setHasMore(off + newPosts.length < total)
      setOffset(off + newPosts.length)
    } catch { setError('Не удалось загрузить ленту') }
    finally { setLoading(false) }
  }

  function handleImagePick(e) {
    const file = e.target.files[0]; if (!file) return
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(file); setImagePreview(URL.createObjectURL(file)); e.target.value = ''
  }
  function removeImage() { if (imagePreview) URL.revokeObjectURL(imagePreview); setImageFile(null); setImagePreview(null) }

  function insertEmoji(emoji) {
    const ta = textareaRef.current
    if (!ta) { setContent(prev => prev + emoji); return }
    const start = ta.selectionStart ?? content.length
    const end   = ta.selectionEnd   ?? content.length
    const next  = content.slice(0, start) + emoji + content.slice(end)
    setContent(next)
    setTimeout(() => { ta.focus(); const pos = start + [...emoji].length; ta.setSelectionRange(pos, pos) }, 0)
  }

  async function createPost(e) {
    e?.preventDefault()
    if ((!content.trim() && !imageFile) || posting) return
    setPosting(true); setError('')
    try {
      const fd = new FormData()
      if (content.trim()) fd.append('content', content.trim())
      if (imageFile)       fd.append('image', imageFile)
      const r = await api.post('/posts', fd, { headers:{ 'Content-Type':'multipart/form-data' } })
      setPosts(prev => [r.data.post, ...prev])
      setContent(''); removeImage()
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch (err) {
      setError(err?.response?.data?.error || 'Не удалось создать пост')
    } finally { setPosting(false) }
  }

  async function toggleLike(postId) {
    try {
      const r = await api.post(`/posts/${postId}/like`)
      setPosts(prev => prev.map(p => p.id === postId ? r.data.post : p))
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка')
      setTimeout(() => setError(''), 3000)
    }
  }

  function autoResize(e) { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,160)+'px' }

  const canSubmit = (content.trim() || imageFile) && !posting

  return (
    <div style={{ minHeight:'100dvh', position:'relative', zIndex:1 }} onClick={() => setShowEmoji(false)}>
      <header className="page-header"><h1 className="page-title">Лента</h1></header>

      <div style={{ maxWidth:640, margin:'0 auto', padding:'20px 16px' }}>

        {/* Форма создания поста */}
        <div className="card" style={{ padding:16, marginBottom:20 }}>
          <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <Avatar src={user?.avatar ? `${API_URL}${user.avatar}` : null} name={user?.username}/>
            <div style={{ flex:1 }}>
              <div style={{ position:'relative' }}>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={e => { setContent(e.target.value); autoResize(e) }}
                  onKeyDown={e => e.key === 'Enter' && e.ctrlKey && createPost(e)}
                  placeholder="Поделитесь новостью..."
                  className="ui-input"
                  rows={1}
                  maxLength={2000}
                  style={{ resize:'none', overflow:'hidden', lineHeight:1.5, minHeight:40, paddingRight:40, fontFamily:'"Segoe UI","Apple Color Emoji","Noto Color Emoji",sans-serif', width:'100%', boxSizing:'border-box' }}
                />
                {/* Кнопка эмодзи внутри поля */}
                <div style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)' }}>
                  <button type="button"
                    onClick={e => { e.stopPropagation(); setShowEmoji(v => !v) }}
                    style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:18, lineHeight:1, padding:0, opacity: showEmoji ? 1 : 0.5 }}
                    title="Эмодзи"
                  >😊</button>
                </div>
                {showEmoji && <EmojiPickerInline onSelect={insertEmoji} onClose={() => setShowEmoji(false)}/>}
              </div>

              {imagePreview && (
                <div className="post-image-preview">
                  <img src={imagePreview} alt="preview"/>
                  <button className="post-image-remove" onClick={removeImage} type="button"><X size={13}/></button>
                </div>
              )}

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
                <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color: imageFile ? 'var(--accent)' : 'var(--text-muted)', cursor:'pointer', padding:'6px 8px', borderRadius:'var(--radius-sm)', transition:'background var(--transition), color var(--transition)' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  <ImageIcon size={16}/>
                  {imageFile ? 'Фото добавлено' : 'Добавить фото'}
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImagePick} style={{ display:'none' }}/>
                </label>

                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {content.length > 0 && (
                    <span style={{ fontSize:12, color: content.length > 1800 ? '#ef4444' : 'var(--text-muted)' }}>{content.length}/2000</span>
                  )}
                  <button className="btn btn-primary" onClick={createPost} disabled={!canSubmit} style={{ padding:'7px 16px', fontSize:13, gap:6, position: 'relative', minWidth: 100 }}>
                    {posting ? (
                      <>
                        <span style={{ opacity: 0 }}><Send size={14}/> Опубликовать</span>
                        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                          <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        </div>
                      </>
                    ) : (
                      <>
                        <Send size={14}/>
                        Опубликовать
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="animate-fade-in" style={{ marginBottom:16, padding:'10px 14px', borderRadius:'var(--radius-sm)', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', fontSize:13, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            {error}
            <button onClick={() => setError('')} style={{ background:'none', border:'none', cursor:'pointer', padding:2, color:'#ef4444' }}><X size={14}/></button>
          </div>
        )}

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {[1,2,3].map(i => (
              <div key={i} className="card" style={{ padding:16, height:140 }}>
                <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--border)', animation:'pulse 1.5s infinite' }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ height:12, width:'30%', background:'var(--border)', borderRadius:6, marginBottom:6, animation:'pulse 1.5s infinite' }}/>
                    <div style={{ height:10, width:'15%', background:'var(--border-light)', borderRadius:6, animation:'pulse 1.5s infinite' }}/>
                  </div>
                </div>
                <div style={{ height:10, background:'var(--border)', borderRadius:6, marginBottom:8, animation:'pulse 1.5s infinite' }}/>
                <div style={{ height:10, width:'80%', background:'var(--border-light)', borderRadius:6, animation:'pulse 1.5s infinite' }}/>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <MessageCircle size={40}/>
            <p style={{ fontSize:16, fontWeight:500 }}>Лента пуста</p>
            <p style={{ fontSize:14 }}>Подпишитесь на пользователей, чтобы видеть их посты</p>
            <button className="btn btn-primary" onClick={() => navigate('/friends')}>Найти людей</button>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {posts.map(post => <PostCard key={post.id} post={post} onLike={toggleLike} onNavigate={id => navigate(`/users/${id}`)}/>)}
            </div>
            {hasMore && (
              <button className="btn btn-secondary" onClick={() => loadFeed(offset)} style={{ width:'100%', marginTop:16, justifyContent:'center' }}>
                Загрузить ещё
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}