import { redirect } from 'next/navigation'

import { generateId } from 'ai'

import { getModels } from '@/lib/config/models'
import { createClient } from '@/lib/supabase/server'

import { Chat } from '@/components/chat'

export const maxDuration = 60

export default async function SearchPage(props: {
  searchParams: Promise<{ q: string }>
}) {
  const { q } = await props.searchParams
  if (!q) {
    redirect('/')
  }

  const id = generateId()
  const models = await getModels()

  // Get current user for auth check
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

  return <Chat id={id} query={q} models={models} user={user} />
}
