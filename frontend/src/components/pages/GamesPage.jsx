import { Construction } from 'lucide-react'

export default function GamesPage() {
  const titles = { GamesPage: 'Игры', GroupsPage: 'Группы', MediaPage: 'Медиа' }
  const name = 'GamesPage'
  return (
    <div style={{ minHeight: '100dvh', position: 'relative', zIndex: 1 }}>
      <header className="page-header">
        <h1 className="page-title">{titles[name]}</h1>
      </header>
      <div className="empty-state" style={{ marginTop: 80 }}>
        <Construction size={48} style={{ color: 'var(--accent)', opacity: 0.7 }} />
        <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Скоро здесь появится {titles[name].toLowerCase()}</p>
        <p style={{ fontSize: 14 }}>Раздел находится в разработке</p>
      </div>
    </div>
  )
}
