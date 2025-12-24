'use client'

import { createContext, ReactNode,useContext } from 'react'

type Messages = Record<string, any>

interface I18nContextValue {
  locale: string
  messages: Messages
  t: (key: string, params?: Record<string, any>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({
  locale,
  messages,
  children
}: {
  locale: string
  messages: Messages
  children: ReactNode
}) {
  const t = (key: string, params?: Record<string, any>) => {
    const keys = key.split('.')
    let value: any = messages

    for (const k of keys) {
      value = value?.[k]
    }

    if (typeof value !== 'string') {
      return key
    }

    // Replace parameters like {count}, {message}, etc.
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() || `{${paramKey}}`
      })
    }

    return value
  }

  return (
    <I18nContext.Provider value={{ locale, messages, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslations(namespace?: string) {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslations must be used within I18nProvider')
  }

  // If namespace is provided, return a function that prepends the namespace
  if (namespace) {
    return (key: string, params?: Record<string, any>) => {
      return context.t(`${namespace}.${key}`, params)
    }
  }

  return context.t
}

export function useLocale() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useLocale must be used within I18nProvider')
  }
  return context.locale
}
