const VIBE_NOTIFICATION_ICON = '/logo.png'

// Ленивая инициализация: new Audio() в момент загрузки модуля
// бросает NotAllowedError в Safari и ряде Chrome до любого user-gesture.
// Создаём объект только при первом воспроизведении.
let _sound = null

function getSound() {
  if (!_sound) {
    _sound = new Audio('/notification-sound.mp3')
  }
  return _sound
}

export function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('❌ Браузер не поддерживает уведомления')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      console.log('🔔 Разрешение на уведомления:', permission)
    })
  }

  return false
}

export function showNotification(title, body, onClick) {
  if (!('Notification' in window)) {
    console.warn('❌ Notifications API недоступен')
    return
  }

  if (Notification.permission !== 'granted') {
    console.warn('⚠️ Нет разрешения на уведомления')
    return
  }

  const notification = new Notification(title, {
    body,
    icon: VIBE_NOTIFICATION_ICON,
    badge: VIBE_NOTIFICATION_ICON,
    vibrate: [200, 100, 200],
    tag: 'vibe-messenger',
    requireInteraction: false
  })

  playNotificationSound()

  notification.onclick = (event) => {
    event.preventDefault()
    window.focus()
    if (onClick) onClick()
    notification.close()
  }

  notification.onerror = (err) => {
    console.error('❌ Ошибка уведомления:', err)
  }

  setTimeout(() => notification.close(), 5000)
}

function playNotificationSound() {
  try {
    const sound = getSound()
    sound.volume = 0.3
    sound.currentTime = 0
    sound.play().catch((err) => {
      console.warn('⚠️ Не удалось воспроизвести звук:', err)
    })
  } catch (err) {
    console.warn('⚠️ Ошибка инициализации звука:', err)
  }
}

export function initNotifications() {
  console.log('🔔 Инициализация уведомлений...')
  console.log('🔔 Поддержка Notification:', 'Notification' in window)
  console.log('🔔 Текущее разрешение:', Notification.permission)

  requestNotificationPermission()

  document.addEventListener('click', () => {
    if (Notification.permission === 'default') {
      requestNotificationPermission()
    }
  }, { once: true })
}
