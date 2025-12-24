import type { Metadata, Viewport } from 'next'
import { Inter as FontSans } from 'next/font/google'
import { cookies } from 'next/headers'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { I18nProvider } from '@/lib/i18n/provider'
import { cn } from '@/lib/utils'

import { SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'

import AppSidebar from '@/components/app-sidebar'
import ArtifactRoot from '@/components/artifact/artifact-root'
import { ThemeProvider } from '@/components/theme-provider'

import './globals.css'

import enMessages from '@/messages/en.json'
import zhMessages from '@/messages/zh.json'

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans'
})

const title = '摸摸底'
const description =
  'AI驱动的出海市场研究与分析平台，为中国企业全球化扩张提供智能决策支持。'

export const metadata: Metadata = {
  metadataBase: new URL('https://morphic.sh'),
  title,
  description,
  openGraph: {
    title,
    description
  },
  twitter: {
    title,
    description,
    card: 'summary_large_image',
    creator: '@miiura'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  // Get current user from Better Auth
  const user = await getCurrentUser()

  // Get locale from cookie, default to 'zh' (Chinese)
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'zh'
  const messages = locale === 'zh' ? zhMessages : enMessages

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Preconnect to own domain for faster asset loading */}
        <link rel="preconnect" href="https://navix2025.moments.top" />
        <link rel="dns-prefetch" href="https://navix2025.moments.top" />
      </head>
      <body
        className={cn(
          'min-h-screen flex flex-col font-sans antialiased',
          fontSans.variable
        )}
      >
        <I18nProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SidebarProvider defaultOpen>
              <AppSidebar user={user} />
              <main className="flex flex-1 min-h-0">
                <ArtifactRoot>{children}</ArtifactRoot>
              </main>
            </SidebarProvider>
            <Toaster />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
