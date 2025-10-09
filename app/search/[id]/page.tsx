import { notFound, redirect } from 'next/navigation'

import { getChat } from '@/lib/actions/chat'
import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { getModels } from '@/lib/config/models'
import { createClient } from '@/lib/supabase/server'
import { ExtendedCoreMessage, SearchResults } from '@/lib/types' // Added SearchResults
import { convertToUIMessages } from '@/lib/utils'

import { Chat } from '@/components/chat'

export const maxDuration = 60

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const userId = await getCurrentUserId()
  const chat = await getChat(id, userId || 'anonymous') // Ensure fallback for userId

  let metadata: {
    title: string
    openGraph?: { images?: { url: string; width?: number; height?: number }[] }
  } = {
    title: chat?.title?.toString().slice(0, 50) || 'Search'
  }

  if (chat && chat.messages) {
    const dataMessage = chat.messages.find(
      (msg: ExtendedCoreMessage) => msg.role === 'data'
    )

    if (dataMessage && dataMessage.content) {
      // Assuming dataMessage.content is of type SearchResults or a compatible structure
      const searchData = dataMessage.content as SearchResults
      if (searchData.images && searchData.images.length > 0) {
        const firstImage = searchData.images[0]
        let imageUrl: string | undefined = undefined

        if (typeof firstImage === 'string') {
          imageUrl = firstImage
        } else if (typeof firstImage === 'object' && firstImage.url) {
          imageUrl = firstImage.url
        }

        if (imageUrl) {
          metadata.openGraph = {
            images: [{ url: imageUrl, width: 1200, height: 630 }] // Standard OG image dimensions
          }
        }
      }
    }
  }
  // If no image is found, metadata.openGraph.images will remain undefined,
  // allowing fallback to parent or global OG image settings.
  return metadata
}

// ... rest of the file (default export SearchPage) remains the same
export default async function SearchPage(props: {
  params: Promise<{ id: string }>
}) {
  const userId = await getCurrentUserId()
  const { id } = await props.params

  const chat = await getChat(id, userId)
  // convertToUIMessages for useChat hook
  const messages = convertToUIMessages(chat?.messages || [])

  if (!chat) {
    redirect('/')
  }

  if (chat?.userId !== userId && chat?.userId !== 'anonymous') {
    notFound()
  }

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

  return (
    <Chat
      key={id}
      id={id}
      savedMessages={messages}
      models={models}
      user={user}
    />
  )
}
