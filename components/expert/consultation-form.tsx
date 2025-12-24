'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface InitialUserData {
  name?: string
  email?: string
  phone?: string
}

interface ConsultationFormProps {
  onSubmit?: (data: FormData) => void
  initialData?: InitialUserData
}

interface FormData {
  name: string
  company: string
  phone: string
  email: string
  consultationType: string
  description: string
}

export function ConsultationForm({ onSubmit, initialData }: ConsultationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || '',
    company: '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    consultationType: '',
    description: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '提交失败')
      }

      if (onSubmit) {
        onSubmit(formData)
      }

      setSubmitted(true)
    } catch (error) {
      console.error('提交咨询失败:', error)
      alert(error instanceof Error ? error.message : '提交失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
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
            </div>
            <h3 className="text-lg font-medium">提交成功</h3>
            <p className="text-muted-foreground">
              我们已收到您的咨询请求，专业顾问将在 24 小时内与您联系。
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false)
                setFormData({
                  name: '',
                  company: '',
                  phone: '',
                  email: '',
                  consultationType: '',
                  description: ''
                })
              }}
            >
              继续提交
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>预约咨询</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">姓名 *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={e =>
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                }
                placeholder="请输入您的姓名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">公司名称</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={e =>
                  setFormData(prev => ({ ...prev, company: e.target.value }))
                }
                placeholder="请输入公司名称"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">联系电话 *</Label>
              <Input
                id="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={e =>
                  setFormData(prev => ({ ...prev, phone: e.target.value }))
                }
                placeholder="请输入手机号码"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e =>
                  setFormData(prev => ({ ...prev, email: e.target.value }))
                }
                placeholder="请输入邮箱地址"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="consultationType">咨询类型 *</Label>
            <Select
              value={formData.consultationType}
              onValueChange={value =>
                setFormData(prev => ({ ...prev, consultationType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择咨询类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market-research">市场调研服务</SelectItem>
                <SelectItem value="due-diligence">尽职调查服务</SelectItem>
                <SelectItem value="overseas-expansion">出海战略咨询</SelectItem>
                <SelectItem value="custom-report">定制化报告</SelectItem>
                <SelectItem value="membership">会员升级咨询</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">需求描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e =>
                setFormData(prev => ({ ...prev, description: e.target.value }))
              }
              placeholder="请详细描述您的需求，以便我们更好地为您服务"
              rows={4}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? '提交中...' : '提交咨询'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            提交即表示您同意我们的隐私政策，我们将保护您的个人信息安全
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
