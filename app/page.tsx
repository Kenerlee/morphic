import { generateId } from 'ai'

import { getModels } from '@/lib/config/models'
import { createClient } from '@/lib/supabase/server'

import { Chat } from '@/components/chat'

export default async function Page() {
  const id = generateId()
  const models = await getModels()

  // Get current user
  let user = null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = await createClient()
      const {
        data: { user: currentUser }
      } = await supabase.auth.getUser()
      user = currentUser
    } catch (error) {
      console.error('Error getting user:', error)
    }
  }

  return <Chat key={id} id={id} models={models} user={user} />
}
