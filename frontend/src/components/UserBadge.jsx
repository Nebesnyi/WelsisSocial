import React from 'react';
import { Shield, ShieldCheck, Scale, BadgeCheck, Gem, Crown, Bot } from 'lucide-react';
import './UserBadge.css';

const UserBadge = ({ type, size = 'medium', showTooltip = true }) => {
  if (!type) return null;

  const config = {
    owner: {
      icon: Crown,
      label: 'Владелец',
      className: 'badge-owner',
      color: '#FFD700',
    },
    admin: {
      icon: ShieldCheck,
      label: 'Администратор',
      className: 'badge-admin',
      color: '#FF4444',
    },
    moderator: {
      icon: Scale,
      label: 'Модератор',
      className: 'badge-moderator',
      color: '#9B59B6',
    },
    verified: {
      icon: BadgeCheck,
      label: 'Проверенный пользователь',
      className: 'badge-verified',
      color: '#3498DB',
    },
    premium: {
      icon: Gem,
      label: 'Premium',
      className: 'badge-premium',
      color: '#1ABC9C',
    },
    bot: {
      icon: Bot,
      label: 'Бот',
      className: 'badge-bot',
      color: '#95A5A6',
    },
  };

  const badge = config[type];
  if (!badge) return null;

  const IconComponent = badge.icon;
  const sizeClass = `badge-${size}`;

  return (
    <span 
      className={`user-badge ${badge.className} ${sizeClass}`}
      title={showTooltip ? badge.label : ''}
      style={{ '--badge-color': badge.color }}
    >
      <IconComponent size={size === 'small' ? 14 : size === 'large' ? 24 : 18} />
    </span>
  );
};

export default UserBadge;
