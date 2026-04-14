import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, User, FileText, X, Command } from 'lucide-react'
import api from '../../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function debounce(fn, ms) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

export default function GlobalSearch() {
  const navigate  = useNavigate()
  const [query, setQuery]     = useState('')
  const [open, setOpen]       = useState(false)
  const [results, setResults] = useState({ users: [], posts: [] })
  const [loading, setLoading] = useState(false)
  const inputRef  = useRef(null)
  const panelRef  = useRef(null)

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const doSearch = useCallback(debounce(async (q) => {
    if (q.length < 2) { setResults({ users: [], posts: [] }); setLoading(false); return }
    setLoading(true)
    try {
      // Run user search and post search in parallel
      const [usersRes, feedRes] = await Promise.all([
        api.get(`/users/search?q=${encodeURIComponent(q)}&limit=5`),
        api.get(`/posts/feed?limit=50`), // search in loaded posts
      ])
      const users = usersRes.data.users || []
      const allPosts = feedRes.data.posts || []
      const ql = q.toLowerCase()
      const posts = allPosts
        .filter(p => p.content?.toLowerCase().includes(ql))
        .slice(0, 4)
      setResults({ users, posts })
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, 300), [])

  useEffect(() => {
    if (query.length >= 2) {
      setLoading(true)
      doSearch(query)
    } else {
      setResults({ users: [], posts: [] })
      setLoading(false)
    }
  }, [query])

  function handleSelect(path) {
    navigate(path)
    setOpen(false)
    setQuery('')
  }

  const hasResults = results.users.length > 0 || results.posts.length > 0
  const showPanel  = open && (query.length >= 2 || loading)

  return (
    <div ref={panelRef} style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{
          position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', pointerEvents: 'none',
        }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Поиск людей и постов..."
          className="ui-input"
          style={{ paddingLeft: 34, paddingRight: 60, fontSize: 13, height: 36 }}
        />
        {/* Kbd hint */}
        {!query && (
          <kbd style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center', gap: 2,
            fontSize: 10, color: 'var(--text-muted)',
            background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '2px 5px', pointerEvents: 'none',
          }}>
            <Command size={9} />K
          </kbd>
        )}
        {/* Clear button */}
        {query && (
          <button
            className="btn-icon"
            onClick={() => { setQuery(''); setResults({ users: [], posts: [] }) }}
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: 4 }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Results panel */}
      {showPanel && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 200, overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : !hasResults && query.length >= 2 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              Ничего не найдено по «{query}»
            </div>
          ) : (
            <>
              {/* Users section */}
              {results.users.length > 0 && (
                <div>
                  <p style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px',
                    color: 'var(--text-muted)', padding: '10px 14px 6px',
                  }}>
                    Люди
                  </p>
                  {results.users.map(u => {
                    const colors = ['#6d5ef5','#7c3aed','#5b21b6']
                    const bg = colors[(u.username?.charCodeAt(0) || 0) % colors.length]
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleSelect(`/users/${u.id}`)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 14px',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          transition: 'background var(--transition)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: bg, overflow: 'hidden', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 600, color: '#fff',
                        }}>
                          {u.avatar
                            ? <img src={`${API_URL}${u.avatar}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : u.username?.[0]?.toUpperCase()
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{u.username}</p>
                          <p style={{ fontSize: 11, color: u.status === 'online' ? 'var(--status-online)' : 'var(--text-muted)' }}>
                            {u.status === 'online' ? 'онлайн' : 'офлайн'}
                          </p>
                        </div>
                        <User size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Divider */}
              {results.users.length > 0 && results.posts.length > 0 && (
                <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
              )}

              {/* Posts section */}
              {results.posts.length > 0 && (
                <div>
                  <p style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px',
                    color: 'var(--text-muted)', padding: '10px 14px 6px',
                  }}>
                    Публикации
                  </p>
                  {results.posts.map(p => {
                    // Highlight matching text
                    const idx = p.content.toLowerCase().indexOf(query.toLowerCase())
                    const start = Math.max(0, idx - 20)
                    const snippet = (start > 0 ? '...' : '') + p.content.slice(start, idx + query.length + 40) + (idx + query.length + 40 < p.content.length ? '...' : '')
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelect(`/users/${p.user_id}`)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '8px 14px',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          transition: 'background var(--transition)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <FileText size={15} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2 }}>{p.username}</p>
                          <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {snippet}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Footer hint */}
              <div style={{
                padding: '8px 14px',
                borderTop: '1px solid var(--border-light)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {results.users.length + results.posts.length} результатов
                </span>
                <kbd style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 5px' }}>
                  Esc — закрыть
                </kbd>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
