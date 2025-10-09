'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { LogIn, UserPlus, X } from 'lucide-react'

import { useTranslations } from '@/lib/i18n/provider'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { IconLogo } from '@/components/ui/icons'

interface AuthPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthPromptDialog({
  open,
  onOpenChange
}: AuthPromptDialogProps) {
  const t = useTranslations()
  const router = useRouter()

  const handleSignIn = () => {
    // Store return URL to redirect back after login
    sessionStorage.setItem('returnUrl', window.location.pathname)
    router.push('/auth/login')
  }

  const handleSignUp = () => {
    // Store return URL to redirect back after signup
    sessionStorage.setItem('returnUrl', window.location.pathname)
    router.push('/auth/sign-up')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <DialogHeader className="text-center items-center">
          <IconLogo className="size-12 mb-4" />
          <DialogTitle className="text-2xl">
            {t('auth.loginPromptTitle')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t('auth.loginPromptMessage')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            {t('auth.loginPromptDescription')}
          </p>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleSignIn}
              className="w-full"
              size="lg"
              variant="default"
            >
              <LogIn className="mr-2 h-4 w-4" />
              {t('auth.signIn')}
            </Button>

            <Button
              onClick={handleSignUp}
              className="w-full"
              size="lg"
              variant="outline"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {t('auth.signUp')}
            </Button>
          </div>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('auth.or')}
              </span>
            </div>
          </div>

          <Button
            onClick={() => onOpenChange(false)}
            className="w-full"
            variant="ghost"
          >
            {t('auth.continueAsGuest')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
