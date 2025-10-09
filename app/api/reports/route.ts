import { NextRequest, NextResponse } from 'next/server'

import { createReport, getReports } from '@/lib/actions/report'
import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { CreateReportInput } from '@/lib/types/report'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reports
 * Get all reports for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reports = await getReports(userId)

    return NextResponse.json({ reports }, { status: 200 })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/reports
 * Create a new report
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const input: CreateReportInput = {
      title: body.title,
      content: body.content,
      coverImage: body.coverImage,
      metadata: body.metadata
    }

    // Validate required fields
    if (!input.title || !input.content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const report = await createReport(userId, input)

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error('Error creating report:', error)
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    )
  }
}
