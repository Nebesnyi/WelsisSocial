import { CheckCircle2, Circle, Clock, Zap, MessageSquare, Users, Image, Gamepad2, Bell, Shield, Smartphone, Search } from 'lucide-react'

const PHASES = [
  {
    id: 'done',
    label: 'Готово',
    color: 'var(--status-online)',
    icon: CheckCircle2,
    items: [
      { icon: Zap,           text: 'Редизайн — светлая/тёмная тема, CSS-переменные' },
      { icon: Users,         text: 'Лента: лайки, посты, skeleton-загрузка' },
      { icon: MessageSquare, text: 'Чат: реалтайм через WebSocket, отправка файлов' },
      { icon: Users,         text: 'Профиль: обложка, вкладки, смена аватара' },
      { icon: Users,         text: 'Чужой профиль: посты через /posts/user/:id, follow/unfollow' },
      { icon: Search,        text: 'Поиск людей: вкладки Подписки / Онлайн / Поиск' },
    ],
  },
  {
    id: 'active',
    label: 'Текущий спринт (исправления аудита)',
    color: 'var(--accent)',
    icon: Zap,
    items: [
      { icon: CheckCircle2,  text: 'Кнопка подписки — разные стили для «подписан» / «не подписан»' },
      { icon: CheckCircle2,  text: 'Правый сайдбар — реальный онлайн из /follows/me, без фейковых точек' },
      { icon: CheckCircle2,  text: 'N+1 запросов в FriendsPage — устранён, статус из одного запроса' },
      { icon: CheckCircle2,  text: 'Комментарии в ленте — полноценные (загрузка, отправка, счётчик)' },
      { icon: CheckCircle2,  text: 'ChatWindow — sending всегда сбрасывается (try/finally)' },
      { icon: CheckCircle2,  text: 'Уведомление в профиле — автосброс через 3 секунды' },
      { icon: CheckCircle2,  text: 'Sidebar margin — CSS-класс на body вместо querySelector' },
      { icon: CheckCircle2,  text: 'Email скрыт на чужом профиле (приватность)' },
      { icon: CheckCircle2,  text: 'Просмотр своего профиля → редирект на /profile' },
      { icon: CheckCircle2,  text: 'Пагинация ленты — «Загрузить ещё»' },
    ],
  },
  {
    id: 'next',
    label: 'Следующий шаг — Critical Path',
    color: 'var(--status-away)',
    icon: Clock,
    items: [
      { icon: Bell,          text: 'Уведомления — колокольчик в хедере, badge непрочитанных, список событий (лайк, коммент, подписка)' },
      { icon: Image,         text: 'Медиа в постах — загрузка фото прямо при создании поста' },
      { icon: MessageSquare, text: 'Бесконечный скролл в чате — подгрузка старых сообщений при скролле вверх' },
      { icon: Users,         text: 'Счётчики подписчиков/подписок на профиле (followers, following)' },
      { icon: Search,        text: 'Глобальный поиск в хедере — люди + посты в одном месте' },
    ],
  },
  {
    id: 'mid',
    label: 'Среднесрочно (1–2 месяца)',
    color: 'var(--text-muted)',
    icon: Circle,
    items: [
      { icon: Shield,        text: 'Модерация: удаление своих постов, жалобы на контент' },
      { icon: Gamepad2,      text: 'Группы — создание, вступление, лента группы' },
      { icon: Image,         text: 'Медиагалерея на профиле — вкладка «Фото»' },
      { icon: MessageSquare, text: 'Групповые чаты' },
      { icon: Bell,          text: 'Email-уведомления о новых подписчиках и сообщениях' },
      { icon: Users,         text: 'Рекомендации «Кого читать» — на основе общих подписок' },
    ],
  },
  {
    id: 'future',
    label: 'Долгосрочно',
    color: 'var(--text-muted)',
    icon: Circle,
    items: [
      { icon: Smartphone,    text: 'PWA / мобильное приложение' },
      { icon: Image,         text: 'Stories — временные публикации 24ч' },
      { icon: Search,        text: 'Алгоритмическая лента — ранжирование по активности' },
      { icon: Shield,        text: 'Двухфакторная аутентификация' },
      { icon: Gamepad2,      text: 'Мини-игры в разделе «Игры»' },
    ],
  },
]

export default function RoadmapPage() {
  return (
    <div style={{ minHeight: '100dvh', position: 'relative', zIndex: 1 }}>
      <header className="page-header">
        <h1 className="page-title">Roadmap</h1>
        <span className="badge badge-accent" style={{ marginLeft: 8, fontSize: 12 }}>Plan</span>
      </header>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px' }}>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.6 }}>
          Статус разработки Aura Social. Обновляется после каждого спринта.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {PHASES.map(phase => {
            const PhaseIcon = phase.icon
            return (
              <div key={phase.id}>
                {/* Phase header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <PhaseIcon size={18} style={{ color: phase.color, flexShrink: 0 }} />
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{phase.label}</h2>
                </div>

                {/* Items */}
                <div className={`roadmap-phase ${phase.id === 'done' ? 'done' : phase.id === 'active' ? 'active' : phase.id === 'next' ? 'next' : ''}`}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {phase.items.map((item, i) => {
                      const ItemIcon = item.icon
                      const isDone = phase.id === 'done' || (phase.id === 'active' && item.icon === CheckCircle2)
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <ItemIcon size={15} style={{
                            color: isDone ? 'var(--status-online)' : phase.color,
                            flexShrink: 0, marginTop: 1,
                          }} />
                          <span style={{
                            fontSize: 14, color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)',
                            lineHeight: 1.5,
                            textDecoration: phase.id === 'done' ? 'line-through' : 'none',
                            textDecorationColor: 'var(--text-muted)',
                          }}>
                            {item.text}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="card" style={{ padding: 20, marginTop: 36, background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
            <strong>Приоритет выбора фич:</strong> каждая следующая фича должна отвечать на вопрос
            «почему пользователь откроет приложение завтра?». Уведомления, медиа в постах и счётчики подписок
            — это минимум, без которого retention падает в первую неделю.
          </p>
        </div>
      </div>
    </div>
  )
}
