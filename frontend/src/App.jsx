import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Register from './components/Register'
import ChatList from './components/ChatList'
import ChatWindow from './components/ChatWindow'
import Profile from './components/Profile'
import Feed from './components/Feed'
import People from './components/People'
import AppShell from './components/layout/AppShell'
import FriendsPage from './components/pages/FriendsPage'
import GamesPage from './components/pages/GamesPage'
import GroupsPage from './components/pages/GroupsPage'
import MediaPage from './components/pages/MediaPage'
import SettingsPage from './components/pages/SettingsPage'
import UserProfileView from './components/pages/UserProfileView'
import RoadmapPage from './components/pages/RoadmapPage'
import AdminPanel from './components/pages/AdminPanel'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',zIndex:1}}>
      <div style={{width:36,height:36,border:'2px solid #2a2a45',borderTopColor:'#8b5cf6',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  return user ? children : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',zIndex:1}}>
      <div style={{width:36,height:36,border:'2px solid #2a2a45',borderTopColor:'#8b5cf6',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  return !user ? children : <Navigate to="/chats" />
}

export default function App() {
  const withShell = (component) => <PrivateRoute><AppShell>{component}</AppShell></PrivateRoute>
return (
    <div className="app-shell">
      {/* ⭐ Звёзды */}
      <div className="shooting-star" style={{ left: '20%', animationDelay: '0s' }} />
      <div className="shooting-star" style={{ left: '60%', animationDelay: '2.5s' }} />
      <div className="shooting-star" style={{ left: '85%', animationDelay: '5s' }} />

      {/* 🚀 Роуты */}
      <Routes>
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/chats"    element={<Navigate to="/messages" />} />
        <Route path="/messages" element={withShell(<ChatList />)} />
        <Route path="/chat/:id" element={withShell(<ChatWindow />)} />
        <Route path="/profile"  element={withShell(<Profile />)} />
        <Route path="/users/:id" element={withShell(<UserProfileView />)} />
        <Route path="/feed"     element={withShell(<Feed />)} />
        <Route path="/friends"  element={withShell(<FriendsPage />)} />
        <Route path="/people"   element={<Navigate to="/friends" />} />
        <Route path="/games"    element={withShell(<GamesPage />)} />
        <Route path="/groups"   element={withShell(<GroupsPage />)} />
        <Route path="/media"    element={withShell(<MediaPage />)} />
        <Route path="/settings" element={withShell(<SettingsPage />)} />
        <Route path="/roadmap"  element={withShell(<RoadmapPage />)} />
        <Route path="/"         element={<Navigate to="/messages" />} />
      </Routes>
    </div>
  );
}