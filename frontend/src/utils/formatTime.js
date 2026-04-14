export function formatTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return 'только что'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} д назад`
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

/**
 * Показывает "онлайн" или "был(а) в сети X назад".
 * Используется вместо ручных статусов online/away/busy.
 *
 * @param {string} status      - 'online' | 'offline' | ...
 * @param {string} lastSeen    - ISO datetime из БД
 * @param {boolean} feminine   - true чтобы "была" вместо "был"
 */
export function formatLastSeen(status, lastSeen, feminine = false) {
  if (status === 'online') return 'онлайн'

  if (!lastSeen) return feminine ? 'была давно' : 'был давно'

  const was = feminine ? 'была' : 'был'
  const d = new Date(lastSeen)
  const now = new Date()
  const diff = now - d

  if (diff < 60_000)           return `${was} только что`
  if (diff < 3_600_000)        return `${was} ${Math.floor(diff / 60_000)} мин назад`
  if (diff < 86_400_000) {
    const hh = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    return `${was} сегодня в ${hh}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    const hh = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    return `${was} вчера в ${hh}`
  }

  if (diff < 7 * 86_400_000) {
    const days = ['вс','пн','вт','ср','чт','пт','сб']
    const hh = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    return `${was} в ${days[d.getDay()]} в ${hh}`
  }

  return `${was} ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
}
