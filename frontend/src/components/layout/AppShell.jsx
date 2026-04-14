import { useLocation } from 'react-router-dom'
import LeftSidebar from '../navigation/LeftSidebar'
import TopBar from './TopBar'

// Правый сайдбар убран по требованию

export default function AppShell({ children }) {
  const location = useLocation()

  return (
    <div className="app-shell">
      <LeftSidebar />
      <div className="app-shell-main">
        <TopBar />
        <section className="app-shell-content" style={{ position:'relative', zIndex:1 }}>
          {children}
        </section>
      </div>
    </div>
  )
}
