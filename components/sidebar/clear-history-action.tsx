'use client'

import { useState, useTransition } from 'react'

import { MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { clearChats } from '@/lib/actions/chat'
import { useTranslations } from '@/lib/i18n/provider'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { SidebarGroupAction } from '@/components/ui/sidebar'
import { Spinner } from '@/components/ui/spinner'

interface ClearHistoryActionProps {
  empty: boolean
}

export function ClearHistoryAction({ empty }: ClearHistoryActionProps) {
  const t = useTranslations()
  const [isPending, start] = useTransition()
  const [open, setOpen] = useState(false)

  const onClear = () =>
    start(async () => {
      const res = await clearChats()
      res?.error ? toast.error(res.error) : toast.success(t('toasts.historyCleared'))
      setOpen(false)
      window.dispatchEvent(new CustomEvent('chat-history-updated'))
    })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarGroupAction disabled={empty} className="static size-7 p-1">
          <MoreHorizontal size={16} />
          <span className="sr-only">{t('history.historyActions')}</span>
        </SidebarGroupAction>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              disabled={empty || isPending}
              className="gap-2 text-destructive focus:text-destructive"
              onSelect={event => event.preventDefault()} // Prevent closing dropdown
            >
              <Trash2 size={14} /> {t('history.clearHistory')}
            </DropdownMenuItem>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('history.areYouAbsolutelySure')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('history.deleteHistoryWarning')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>{t('buttons.cancel')}</AlertDialogCancel>
              <AlertDialogAction disabled={isPending} onClick={onClear}>
                {isPending ? <Spinner /> : t('buttons.clear')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
