import { useEffect, useState } from 'react'

import { authClient } from '@/lib/auth/client'

export const useCurrentUserName = () => {
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfileName = async () => {
      const { data, error } = await authClient.getSession()
      if (error) {
        console.error(error)
      }

      setName(data?.user?.name ?? '?')
    }

    fetchProfileName()
  }, [])

  return name || '?'
}
