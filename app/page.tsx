import { generateId } from 'ai'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { getModels } from '@/lib/config/models'

import { Chat } from '@/components/chat'

export default async function Page() {
  const id = generateId()
  const models = await getModels()

  // Get current user from Better Auth
  const user = await getCurrentUser()

  return <Chat key={id} id={id} models={models} user={user} />
}
