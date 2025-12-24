import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for long-running skill calls

const SKILLS_API_URL = process.env.SKILLS_API_URL || 'http://localhost:8000'
const HOMESTAY_SKILL_ID = 'skill_015FtmDcs3NUKhwqTgukAyWc'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, stream = true } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      )
    }

    // Use streaming endpoint if requested
    if (stream) {
      const response = await fetch(`${SKILLS_API_URL}/stream/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          skill_ids: [HOMESTAY_SKILL_ID],
          message: message,
          max_tokens: 8192
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return NextResponse.json(
          {
            error: errorData.detail || 'Skills API request failed',
            status: response.status
          },
          { status: response.status }
        )
      }

      // Forward the SSE stream to the client
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const text = decoder.decode(chunk, { stream: true })
          // Forward the SSE data as-is
          controller.enqueue(encoder.encode(text))
        }
      })

      const body = response.body
      if (!body) {
        return NextResponse.json(
          { error: 'No response body from Skills API' },
          { status: 500 }
        )
      }

      const reader = body.getReader()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                controller.close()
                break
              }
              controller.enqueue(value)
            }
          } catch (error) {
            controller.error(error)
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no'
        }
      })
    }

    // Non-streaming fallback
    const response = await fetch(`${SKILLS_API_URL}/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        skill_ids: [HOMESTAY_SKILL_ID],
        message: message,
        max_tokens: 8192
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        {
          error: errorData.detail || 'Skills API request failed',
          status: response.status
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      data: data
    })
  } catch (error: any) {
    console.error('Error calling Skills API:', error)
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
