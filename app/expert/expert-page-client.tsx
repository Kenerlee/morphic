'use client'

import { useTranslations } from '@/lib/i18n/provider'

import { ConsultationForm } from '@/components/expert/consultation-form'
import { WechatQr } from '@/components/expert/wechat-qr'

interface InitialUserData {
  name?: string
  email?: string
  phone?: string
}

interface ExpertPageClientProps {
  initialUserData?: InitialUserData
}

export function ExpertPageClient({ initialUserData }: ExpertPageClientProps) {
  const t = useTranslations('expert')

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      {/* Header - more compact */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
      </div>

      {/* Services section - now first and visible immediately */}
      <div className="mb-6 rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-semibold">{t('services')}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <h3 className="text-sm font-medium">{t('service1Title')}</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('service1Desc')}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <h3 className="text-sm font-medium">{t('service2Title')}</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('service2Desc')}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <h3 className="text-sm font-medium">{t('service3Title')}</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('service3Desc')}
            </p>
          </div>
        </div>
      </div>

      {/* Form and WeChat - side by side, more compact */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Form */}
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-semibold">{t('contactForm')}</h2>
          <ConsultationForm initialData={initialUserData} />
        </div>

        {/* Right: WeChat QR */}
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-semibold">{t('wechatScan')}</h2>
          <WechatQr
            qrCodeUrl="/images/wechat_navix.png"
            wechatId="NaviX_Support"
          />
        </div>
      </div>
    </div>
  )
}
