'use client'

import { useIsMobile } from '@/hooks/use-mobile'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export interface ResponsiveOption {
  value: string
  label: string
}

interface ResponsiveRadioSelectProps {
  options: ResponsiveOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function ResponsiveRadioSelect({
  options,
  value,
  onValueChange,
  placeholder = '请选择...',
  className,
  disabled = false
}: ResponsiveRadioSelectProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    // 移动端：使用 Select 下拉框
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  // 桌面端：使用 RadioGroup
  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      className={className}
      disabled={disabled}
    >
      {options.map(option => (
        <div key={option.value} className="flex items-center space-x-2">
          <RadioGroupItem value={option.value} id={option.value} />
          <Label htmlFor={option.value} className="cursor-pointer">
            {option.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  )
}
