'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  Languages,
  LogOut,
  Palette,
  Settings,
  User as UserIcon} from 'lucide-react'

import { authClient } from '@/lib/auth/client'
import { useTranslations } from '@/lib/i18n/provider'
import { UserLevel } from '@/lib/types/user-profile'

// Better Auth 用户类型
interface User {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
  phone?: string | null
  phoneVerified?: boolean | null
  role?: string | null
}

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

import { Button } from './ui/button'
import { LanguageMenuItems } from './language-menu-items'
import { ThemeMenuItems } from './theme-menu-items'

interface UserMenuProps {
  user: User
}

interface UserQuota {
  level: UserLevel
  role: string
  remaining: number
  limit: number
  isUnlimited: boolean
}

export default function UserMenu({ user }: UserMenuProps) {
  const router = useRouter()
  const t = useTranslations()
  const [quota, setQuota] = useState<UserQuota | null>(null)

  const userName = user.name || t('userMenu.defaultUser')
  const avatarUrl = user.image ?? undefined

  // 判断是否为手机号登录用户
  const isPhoneUser = !!user.phone || user.email?.endsWith('@phone.navix.local')
  const phoneNumber = user.phone || (isPhoneUser ? user.email?.split('@')[0] : null)
  const displayEmail = isPhoneUser && phoneNumber ? `+86 ${phoneNumber}` : user.email

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const response = await fetch('/api/user/me')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.quota) {
            setQuota({
              level: data.user.level,
              role: data.user.role,
              remaining: data.quota.remaining,
              limit: data.quota.limit,
              isUnlimited: data.quota.is_unlimited
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch user quota:', error)
      }
    }
    fetchQuota()
  }, [])

  const getInitials = (name: string, email: string | undefined) => {
    if (name && name !== t('userMenu.defaultUser')) {
      const names = name.split(' ')
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.split('@')[0].substring(0, 2).toUpperCase()
    }
    return t('userMenu.defaultInitial')
  }

  const handleLogout = async () => {
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={userName} />
            <AvatarFallback>{getInitials(userName, user.email ?? undefined)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none truncate">
                {userName}
              </p>
              {quota && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    quota.level === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : quota.level === 'vip'
                        ? 'bg-amber-100 text-amber-700'
                        : quota.level === 'pro'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {quota.level.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {displayEmail}
            </p>
            {quota && !quota.isUnlimited && (
              <p className="text-xs leading-none text-muted-foreground">
                {t('userMenu.quotaRemaining')}: {quota.remaining}/{quota.limit}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          <UserIcon className="mr-2 h-4 w-4" />
          <span>{t('userMenu.profile')}</span>
        </DropdownMenuItem>
        {quota?.role === 'admin' && (
          <DropdownMenuItem onClick={() => router.push('/admin')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>{t('userMenu.admin')}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="mr-2 h-4 w-4" />
            <span>{t('userMenu.theme')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <ThemeMenuItems />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages className="mr-2 h-4 w-4" />
            <span>{t('userMenu.language')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <LanguageMenuItems />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('userMenu.logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
