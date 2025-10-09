'use client'

import { useTranslations } from '@/lib/i18n/provider'

export function AppSidebarTitle() {
  const t = useTranslations()

  return <span className="font-semibold text-sm">{t('navigation.appTitle')}</span>
}
