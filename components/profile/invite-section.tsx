'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface UserInvite {
  code: string
  createdBy: string
  createdAt: string
  expiresAt: string
  usedBy?: string
  usedAt?: string
  usedByEmail?: string
}

interface InviteStats {
  totalCreated: number
  totalUsed: number
  available: number
}

interface InviteSectionProps {
  messages: {
    profile: {
      invite: {
        title: string
        description: string
        invited: string
        created: string
        used: string
        available: string
        generate: string
        generating: string
        maxReached: string
        createError: string
        statusUsed: string
        statusExpired: string
        statusAvailable: string
        expires: string
        copy: string
        copied: string
        shareLink: string
        noInvites: string
        noInvitesHint: string
      }
    }
  }
  locale?: string
}

export function InviteSection({ messages, locale = 'zh' }: InviteSectionProps) {
  const t = messages.profile.invite

  const [invites, setInvites] = useState<UserInvite[]>([])
  const [stats, setStats] = useState<InviteStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchInvites = async () => {
    try {
      const response = await fetch('/api/user/invites')
      const data = await response.json()
      if (data.success) {
        setInvites(data.invites || [])
        setStats(data.stats || null)
      }
    } catch (err) {
      console.error('Failed to fetch invites:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvites()
  }, [])

  const handleCreateInvite = async () => {
    setIsCreating(true)
    setError(null)
    try {
      const response = await fetch('/api/user/invites', {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        fetchInvites()
      } else {
        setError(data.error || t.createError)
      }
    } catch (err) {
      setError(t.createError)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    }
  }

  const handleCopyShareLink = async (code: string) => {
    const shareLink = `${window.location.origin}/auth/sign-up?invite=${code}`
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopiedCode(`link-${code}`)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      const textArea = document.createElement('textarea')
      textArea.value = shareLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedCode(`link-${code}`)
      setTimeout(() => setCopiedCode(null), 2000)
    }
  }

  const getInviteStatus = (invite: UserInvite) => {
    if (invite.usedBy) {
      return { label: t.statusUsed, className: 'bg-gray-100 text-gray-600' }
    }
    if (new Date(invite.expiresAt) < new Date()) {
      return { label: t.statusExpired, className: 'bg-red-100 text-red-600' }
    }
    return { label: t.statusAvailable, className: 'bg-green-100 text-green-600' }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t.title}</span>
          {stats && (
            <span className="text-sm font-normal text-muted-foreground">
              {t.invited.replace('{count}', String(stats.totalUsed))}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          {t.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.totalCreated}</div>
              <div className="text-xs text-muted-foreground">{t.created}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{stats.totalUsed}</div>
              <div className="text-xs text-muted-foreground">{t.used}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{stats.available}</div>
              <div className="text-xs text-muted-foreground">{t.available}</div>
            </div>
          </div>
        )}

        {/* Create Button */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCreateInvite}
            disabled={isCreating || !!(stats && stats.available >= 10)}
            className="flex-1"
          >
            {isCreating ? t.generating : t.generate}
          </Button>
          {stats && stats.available >= 10 && (
            <span className="text-xs text-muted-foreground">
              {t.maxReached}
            </span>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {/* Invite List */}
        {invites.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {invites.map((invite) => {
              const status = getInviteStatus(invite)
              const isAvailable = !invite.usedBy && new Date(invite.expiresAt) > new Date()

              return (
                <div
                  key={invite.code}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <code className="font-mono text-sm font-medium">
                      {invite.code}
                    </code>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {invite.usedBy ? (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(invite.usedAt || invite.createdAt)}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(invite.expiresAt)} {t.expires}
                        </span>
                        {isAvailable && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyCode(invite.code)}
                              className="h-7 px-2"
                            >
                              {copiedCode === invite.code ? t.copied : t.copy}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyShareLink(invite.code)}
                              className="h-7 px-2"
                            >
                              {copiedCode === `link-${invite.code}` ? t.copied : t.shareLink}
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p>{t.noInvites}</p>
            <p className="text-sm mt-1">{t.noInvitesHint}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
