import { useEffect, useState } from 'react'

import { authClient } from '@/lib/auth/client'

export const useCurrentUserImage = () => {
  const [image, setImage] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserImage = async () => {
      const { data, error } = await authClient.getSession()
      if (error) {
        console.error(error)
      }

      setImage(data?.user?.image ?? null)
    }
    fetchUserImage()
  }, [])

  return image
}
