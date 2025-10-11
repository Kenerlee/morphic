'use client'

import Image from 'next/image'

import { cn } from '@/lib/utils'

function IconLogo({ className, ...props }: { className?: string }) {
  return (
    <Image
      src="/images/logo.webp"
      alt="NaviX Logo"
      width={512}
      height={512}
      className={cn('h-4 w-4 object-contain', className)}
      priority
      {...props}
    />
  )
}

export { IconLogo }
