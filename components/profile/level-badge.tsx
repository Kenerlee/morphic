'use client'

import { UserLevel } from '@/lib/types/user-profile'
import { cn } from '@/lib/utils'

interface LevelBadgeProps {
  level: UserLevel
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const levelConfig: Record<
  UserLevel,
  { label: string; color: string; bgColor: string }
> = {
  free: {
    label: 'Free',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100'
  },
  pro: {
    label: 'Pro',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100'
  },
  vip: {
    label: 'VIP',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100'
  },
  admin: {
    label: 'Admin',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100'
  }
}

const sizeConfig = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base'
}

export function LevelBadge({ level, size = 'md', className }: LevelBadgeProps) {
  const config = levelConfig[level]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        config.bgColor,
        config.color,
        sizeConfig[size],
        className
      )}
    >
      {config.label}
    </span>
  )
}
