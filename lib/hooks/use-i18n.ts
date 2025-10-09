import { useTranslations } from 'next-intl'

export function useI18n() {
  const t = useTranslations()
  return { t }
}
