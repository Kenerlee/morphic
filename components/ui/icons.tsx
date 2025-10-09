'use client'

import { cn } from '@/lib/utils'

function IconLogo({ className, ...props }: { className?: string }) {
  return (
    <img
      src="/images/logo.png"
      alt="NaviX Logo"
      className={cn('h-4 w-4 object-contain', className)}
      {...props}
    />
  )
}

export { IconLogo }
