'use client'

import Image from 'next/image'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface WechatQrProps {
  qrCodeUrl?: string
  wechatId?: string
}

export function WechatQr({ qrCodeUrl, wechatId }: WechatQrProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">微信咨询</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {qrCodeUrl ? (
          <div className="mx-auto w-48 h-48 bg-muted rounded-lg overflow-hidden relative">
            <Image
              src={qrCodeUrl}
              alt="微信二维码"
              fill
              className="object-contain"
              priority
            />
          </div>
        ) : (
          <div className="mx-auto w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <svg
                className="w-16 h-16 mx-auto mb-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.004-.268-.033-.406-.033zm-1.863 2.789c.473 0 .857.39.857.871a.864.864 0 0 1-.857.87.864.864 0 0 1-.857-.87c0-.481.384-.87.857-.87zm4.283 0c.473 0 .857.39.857.871a.864.864 0 0 1-.857.87.864.864 0 0 1-.857-.87c0-.481.384-.87.857-.87z" />
              </svg>
              <p className="text-sm">微信二维码</p>
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground">扫码添加专属顾问</p>
        {wechatId && (
          <p className="text-sm">
            微信号: <span className="font-mono">{wechatId}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
