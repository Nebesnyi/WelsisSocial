import { memo, useState, useCallback, useRef } from 'react'
import { Image as ImageIcon, Send, X, Smile } from 'lucide-react'
import { EmojiPicker } from '../EmojiPicker/EmojiPicker'
import { useEmojiInsert, useTextLengthLimit, useAutoResizeTextarea } from '../../hooks/usePost'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const Avatar = memo(function Avatar({ src, name, size = 38 }) {
  const colors = ['#6d5ef5', '#7c3aed', '#5b21b6', '#4c1d95']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: color,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 600,
        color: '#fff',
      }}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        name?.[0]?.toUpperCase()
      )}
    </div>
  )
})

export const PostCreator = memo(function PostCreator({ user, onCreate, onError }) {
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [posting, setPosting] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)

  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const insertEmoji = useEmojiInsert(textareaRef, content, setContent)
  const textLimit = useTextLengthLimit(content, 2000)
  const autoResize = useAutoResizeTextarea(textareaRef, content)

  const handleImagePick = useCallback(
    (e) => {
      const file = e.target.files[0]
      if (!file) return

      if (imagePreview) URL.revokeObjectURL(imagePreview)
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      e.target.value = ''
    },
    [imagePreview]
  )

  const removeImage = useCallback(() => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
  }, [imagePreview])

  const createPost = useCallback(
    async (e) => {
      e?.preventDefault()
      if ((!content.trim() && !imageFile) || posting) return

      setPosting(true)
      try {
        const fd = new FormData()
        if (content.trim()) fd.append('content', content.trim())
        if (imageFile) fd.append('image', imageFile)

        // Retry-логика: до 3 попыток с экспоненциальной задержкой
        let attempts = 0
        let success = false
        while (attempts < 3 && !success) {
          try {
            await onCreate(fd)
            success = true
          } catch (err) {
            attempts++
            if (attempts >= 3) throw err
            await new Promise(r => setTimeout(r, Math.pow(2, attempts) * 100))
          }
        }
        
        setContent('')
        removeImage()
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
      } catch (err) {
        onError?.(err?.response?.data?.error || 'Не удалось создать пост')
      } finally {
        setPosting(false)
      }
    },
    [content, imageFile, posting, onCreate, onError, removeImage]
  )

  const avatarSrc = user?.avatar ? `${API_URL}${user.avatar}` : null
  const canSubmit = (content.trim() || imageFile) && !posting && textLimit.isValid

  return (
    <div className="card" style={{ padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar src={avatarSrc} name={user?.username} />
        <div style={{ flex: 1 }}>
          <div style={{ position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                autoResize()
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && createPost(e)}
              placeholder="Поделитесь новостью..."
              className="ui-input"
              rows={1}
              maxLength={2000}
              style={{
                resize: 'none',
                overflow: 'hidden',
                lineHeight: 1.5,
                minHeight: 40,
                paddingRight: 40,
                fontFamily: '"Segoe UI", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', alignItems: 'center' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowEmoji((v) => !v)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 0,
                  opacity: showEmoji ? 1 : 0.5,
                }}
                title="Эмодзи"
              >
                😊
              </button>
            </div>
            {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} position="top-right" />}
          </div>

          {imagePreview && (
            <div className="post-image-preview">
              <img src={imagePreview} alt="preview" />
              <button className="post-image-remove" onClick={removeImage} type="button">
                <X size={13} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: imageFile ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                transition: 'background var(--transition), color var(--transition)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <ImageIcon size={16} />
              {imageFile ? 'Фото добавлено' : 'Добавить фото'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImagePick}
                style={{ display: 'none' }}
              />
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {content.length > 0 && (
                <span style={{ fontSize: 12, color: textLimit.isNearLimit ? '#f59e0b' : textLimit.isOverLimit ? '#ef4444' : 'var(--text-muted)' }}>
                  {content.length}/2000
                </span>
              )}
              <button
                className="btn btn-primary"
                onClick={createPost}
                disabled={!canSubmit}
                style={{ padding: '7px 16px', fontSize: 13, gap: 6 }}
              >
                <Send size={14} />
                {posting ? 'Публикуем...' : 'Опубликовать'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default PostCreator
