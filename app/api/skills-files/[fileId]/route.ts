import { NextRequest, NextResponse } from 'next/server'

const SKILLS_API_URL = process.env.SKILLS_API_URL || 'http://localhost:8000'

/**
 * Proxy for Skills API file operations to avoid CORS issues
 * GET /api/skills-files/[fileId]?action=metadata - Get file metadata
 * GET /api/skills-files/[fileId]?action=download - Download file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'metadata'

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    // Validate action
    if (action !== 'metadata' && action !== 'download') {
      return NextResponse.json(
        { error: 'Invalid action. Use "metadata" or "download"' },
        { status: 400 }
      )
    }

    const endpoint = action === 'download' ? 'download' : 'metadata'
    const url = `${SKILLS_API_URL}/files/${fileId}/${endpoint}`

    console.log(`[Skills Files Proxy] Fetching ${action} for file ${fileId}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: action === 'download' ? '*/*' : 'application/json'
      }
    })

    if (!response.ok) {
      console.error(
        `[Skills Files Proxy] Error from Skills API: ${response.status}`
      )
      return NextResponse.json(
        { error: `Skills API returned ${response.status}` },
        { status: response.status }
      )
    }

    if (action === 'download') {
      // For download, stream the file content
      const contentType =
        response.headers.get('content-type') || 'application/octet-stream'
      const contentDisposition = response.headers.get('content-disposition')

      const headers: HeadersInit = {
        'Content-Type': contentType
      }

      if (contentDisposition) {
        headers['Content-Disposition'] = contentDisposition
      }

      const blob = await response.blob()
      return new NextResponse(blob, { headers })
    } else {
      // For metadata, return JSON
      const data = await response.json()
      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('[Skills Files Proxy] Error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy request to Skills API' },
      { status: 500 }
    )
  }
}
