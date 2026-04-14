import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const response = await api.get('/auth/me')
        setUser(response.data.user)
        connectSocket(token)
      } catch (error) {
        localStorage.removeItem('token')
      }
    }
    setLoading(false)
  }

  async function login(email, password) {
    const response = await api.post('/auth/login', { email, password })
    const { user, token } = response.data
    localStorage.setItem('token', token)
    setUser(user)
    connectSocket(token)
    return user
  }

  async function register(email, password, username) {
    const response = await api.post('/auth/register', { email, password, username })
    const { user, token } = response.data
    localStorage.setItem('token', token)
    setUser(user)
    connectSocket(token)
    return user
  }

  function logout() {
    localStorage.removeItem('token')
    disconnectSocket()
    setUser(null)
  }

  function updateUser(updatedUser) {
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
