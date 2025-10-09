'use client'

import { useRouter } from 'next/navigation'

import { Check, Languages } from 'lucide-react'

import { getCookie, setCookie } from '@/lib/utils/cookies'

import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

export function LanguageMenuItems() {
  const router = useRouter()
  const currentLocale = getCookie('NEXT_LOCALE') || 'en'

  const setLocale = (locale: string) => {
    setCookie('NEXT_LOCALE', locale)
    router.refresh()
  }

  return (
    <>
      <DropdownMenuItem onClick={() => setLocale('en')}>
        English
        {currentLocale === 'en' && <Check className="ml-auto h-4 w-4" />}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setLocale('zh')}>
        中文
        {currentLocale === 'zh' && <Check className="ml-auto h-4 w-4" />}
      </DropdownMenuItem>
    </>
  )
}
