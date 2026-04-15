import { useState, useEffect, useCallback } from 'react'

const EMOJI_FONT_FAMILY = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'

export function useEmojiInsert(targetRef, currentValue, onChange) {
  const insertEmoji = useCallback(
    (emoji) => {
      const target = targetRef.current
      if (!target) {
        onChange((prev) => prev + emoji)
        return
      }

      const start = target.selectionStart ?? currentValue.length
      const end = target.selectionEnd ?? currentValue.length
      const next = currentValue.slice(0, start) + emoji + currentValue.slice(end)

      onChange(next)

      setTimeout(() => {
        target.focus()
        const pos = start + [...emoji].length
        target.setSelectionRange(pos, pos)
      }, 0)
    },
    [targetRef, currentValue, onChange]
  )

  return insertEmoji
}

export function useTextLengthLimit(value, maxLength = 2000) {
  const remaining = maxLength - (value?.length || 0)
  const isNearLimit = remaining <= 200
  const isOverLimit = remaining < 0

  return {
    remaining,
    isNearLimit,
    isOverLimit,
    isValid: !isOverLimit,
  }
}

export function useAutoResizeTextarea(ref, value) {
  const autoResize = useCallback(() => {
    const el = ref.current
    if (!el) return

    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [ref])

  useEffect(() => {
    autoResize()
  }, [value, autoResize])

  return autoResize
}

export default { useEmojiInsert, useTextLengthLimit, useAutoResizeTextarea }
