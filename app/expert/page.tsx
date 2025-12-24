import { getUserProfile } from '@/lib/actions/user-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'

import { ExpertPageClient } from './expert-page-client'

export default async function ExpertPage() {
  // Get user data on server side
  let userData: { name?: string; email?: string; phone?: string } = {}

  try {
    const user = await getCurrentUser()

    if (user) {
      // Get user profile from Redis
      const profile = await getUserProfile(user.id)
      userData = {
        email: user.email || profile?.email || undefined,
        phone: (user as any).phone || profile?.mobile || undefined,
        name: user.name || undefined
      }
    }
  } catch (error) {
    console.error('Error fetching user data for expert page:', error)
  }

  return <ExpertPageClient initialUserData={userData} />
}
