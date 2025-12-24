import { useTranslations } from '@/lib/i18n/provider'

export function useI18n() {
  const t = useTranslations()
  return { t }
}
