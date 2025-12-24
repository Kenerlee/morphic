'use client'

import { UserLevel } from '@/lib/types/user-profile'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface UpgradeCtaProps {
  currentLevel: UserLevel
}

const upgradeOptions = [
  {
    level: 'pro' as UserLevel,
    name: 'Pro',
    price: '¥99/月',
    features: ['每月 20 次调研', '优先客服支持', '高级报告模板']
  },
  {
    level: 'vip' as UserLevel,
    name: 'VIP',
    price: '¥999/年',
    features: ['每月 100 次调研', '专属客服', '全部高级功能', '定制化需求']
  }
]

export function UpgradeCta({ currentLevel }: UpgradeCtaProps) {
  if (currentLevel === 'admin' || currentLevel === 'vip') {
    return null
  }

  const availableOptions =
    currentLevel === 'pro'
      ? upgradeOptions.filter(o => o.level === 'vip')
      : upgradeOptions

  const handleContactAdmin = () => {
    // 可以跳转到专家咨询页面或显示联系方式
    window.location.href = '/expert'
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">升级会员</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {availableOptions.map(option => (
          <Card key={option.level} className="relative overflow-hidden">
            {option.level === 'vip' && (
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs px-2 py-1 rounded-bl">
                推荐
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{option.name}</span>
                <span className="text-lg font-bold">{option.price}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {option.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={option.level === 'vip' ? 'default' : 'outline'}
                onClick={handleContactAdmin}
              >
                联系管理员升级
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        如需升级，请联系管理员或访问专家咨询页面
      </p>
    </div>
  )
}
