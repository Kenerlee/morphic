'use client'

import { ArrowRight } from 'lucide-react'

import { useTranslations } from '@/lib/i18n/provider'

import { Button } from '@/components/ui/button'

export function EmptyScreen({
  submitMessage,
  className
}: {
  submitMessage: (message: string) => void
  className?: string
}) {
  const t = useTranslations()

  const exampleMessages = [
    {
      heading: t('exampleQuestions.chenXiangGui'),
      message: t('exampleQuestions.chenXiangGui')
    },
    {
      heading: t('exampleQuestions.herbalX'),
      message: t('exampleQuestions.herbalX')
    },
    {
      heading: t('exampleQuestions.teslaVsRivian'),
      message: t('exampleQuestions.teslaVsRivian')
    },
    {
      heading: t('exampleQuestions.toyBookResearch'),
      message: t('exampleQuestions.toyBookResearch')
    },
    {
      heading: t('exampleQuestions.paperSummary'),
      message: t('exampleQuestions.paperSummary')
    }
  ]
  return (
    <div className={`mx-auto w-full transition-all ${className}`}>
      <div className="bg-background p-2">
        <div className="mt-2 flex flex-col items-start space-y-2 mb-4">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              name={message.message}
              onClick={async () => {
                submitMessage(message.message)
              }}
            >
              <ArrowRight size={16} className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
