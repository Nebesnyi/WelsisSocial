import {
  House,
  Users,
  MessageCircle,
  Gamepad2,
  UsersRound,
  Image,
  Settings,
  Map,
} from 'lucide-react'

export const sidebarItems = [
  { key: 'home',     label: 'Главная',    to: '/feed',     icon: House },
  { key: 'friends',  label: 'Люди',       to: '/friends',  icon: Users },
  { key: 'messages', label: 'Сообщения',  to: '/messages', icon: MessageCircle },
  { key: 'games',    label: 'Игры',       to: '/games',    icon: Gamepad2 },
  { key: 'groups',   label: 'Группы',     to: '/groups',   icon: UsersRound },
  { key: 'media',    label: 'Медиа',      to: '/media',    icon: Image },
  { key: 'roadmap',  label: 'Roadmap',    to: '/roadmap',  icon: Map },
  { key: 'settings', label: 'Настройки',  to: '/settings', icon: Settings },
]
