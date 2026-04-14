import { Construction } from 'lucide-react'

export default function UnderConstructionCard({ title = 'Раздел в разработке' }) {
  return (
    <div className="empty-state" style={{ marginTop: 60 }}>
      <Construction size={44} style={{ color: 'var(--accent)', opacity: 0.7 }} />
      <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>{title}</p>
      <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Скоро здесь появится новый функционал</p>
    </div>
  )
}
