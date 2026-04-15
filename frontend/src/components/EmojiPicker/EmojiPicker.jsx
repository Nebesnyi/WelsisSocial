import { useState, useEffect, useRef, useCallback, memo } from 'react'

const EMOJI_TABS = [
  { label: '😀', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤯', '😭', '😢', '😤', '😠'] },
  { label: '👍', emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👏', '🙌', '🤲', '🤝', '🙏', '✍️', '💪', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '💭', '🗯️'] },
  { label: '🐶', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🦂', '🐢', '🐍'] },
  { label: '🍕', emojis: ['🍕', '🍔', '🌭', '🌮', '🌯', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🍜', '🍝', '🍛', '🍣', '🍱', '🍤', '🍙', '🍚', '🍘', '🍥', '🥮', '🍢', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🧃', '🥤', '☕', '🍵'] },
  { label: '⚽', emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '⛳', '🎣', '🎯', '🎮', '🎲', '🎭', '🎨', '🎬', '🎤', '🎧', '🎸', '🎹', '🥁', '🚀', '🌍', '⭐', '🌈', '🔥', '✨', '🎉', '🎊', '🎈', '🏆', '💻', '📱', '🛸', '🌙'] },
]

const EMOJI_FONT_FAMILY = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'

export const EmojiPicker = memo(function EmojiPicker({ onSelect, onClose }) {
  const [tab, setTab] = useState(0)
  const ref = useRef(null)

  const handleClickOutside = useCallback((e) => {
    if (ref.current && !ref.current.contains(e.target)) {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        left: 0,
        width: 320,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 200,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface-2)',
        }}
      >
        {EMOJI_TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              flex: 1,
              padding: '8px 0',
              fontSize: 18,
              lineHeight: 1,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderBottom: tab === i ? '2px solid var(--accent)' : '2px solid transparent',
              opacity: tab === i ? 1 : 0.55,
              transition: 'opacity 0.15s',
            }}
            aria-label={`Эмодзи ${t.label}`}
            aria-pressed={tab === i}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        style={{
          padding: 8,
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: 2,
          maxHeight: 220,
          overflowY: 'auto',
        }}
        role="listbox"
        aria-label="Выбор эмодзи"
      >
        {EMOJI_TABS[tab].emojis.map((emoji, i) => (
          <button
            key={i}
            onClick={() => {
              onSelect(emoji)
              onClose()
            }}
            style={{
              fontSize: 20,
              padding: '5px 2px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 6,
              lineHeight: 1,
              fontFamily: EMOJI_FONT_FAMILY,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            role="option"
            aria-label={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
})

export default EmojiPicker
