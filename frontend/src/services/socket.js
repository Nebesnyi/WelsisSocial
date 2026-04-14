import { io } from 'socket.io-client'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000'

let socket = null

export function connectSocket(token) {
  if (socket) {
    socket.disconnect()
    socket = null
  }

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  })

  socket.on('connect', () => {
    console.log('🔌 WebSocket подключён')
    console.log('🔌 Socket ID:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('🔌 WebSocket отключён:', reason)
  })

  socket.on('connect_error', (error) => {
    console.error('❌ Ошибка WebSocket:', error.message)
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function getSocket() {
  return socket
}

export function sendMessage(chatId, content) {
  if (socket) {
    socket.emit('message:send', { chatId, content })
  }
}

export function sendTypingStart(chatId) {
  if (socket) {
    socket.emit('typing:start', { chatId })
  }
}

export function sendTypingStop(chatId) {
  if (socket) {
    socket.emit('typing:stop', { chatId })
  }
}

export function markMessagesRead(chatId) {
  if (socket) {
    socket.emit('message:read', { chatId })
  }
}

export function deleteMessage(messageId, chatId) {
  if (socket) {
    console.log('🗑️ Отправка запроса на удаление:', messageId, chatId)
    socket.emit('message:delete', { messageId, chatId })
  }
}