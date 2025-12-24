import { NextRequest, NextResponse } from 'next/server'

import { createConsultation, getAllConsultations } from '@/lib/actions/consultation'
import { checkAdminAuth } from '@/lib/middleware/admin-auth'
import { ConsultationStatus, CreateConsultationInput } from '@/lib/types/consultation'

// POST - Create new consultation (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.phone || !body.consultationType) {
      return NextResponse.json(
        { error: '请填写必填字段（姓名、电话、咨询类型）' },
        { status: 400 }
      )
    }

    const input: CreateConsultationInput = {
      name: body.name,
      company: body.company,
      phone: body.phone,
      email: body.email,
      consultationType: body.consultationType,
      description: body.description
    }

    const consultation = await createConsultation(input)

    return NextResponse.json({
      success: true,
      data: consultation
    })
  } catch (error) {
    console.error('创建咨询记录错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建咨询记录失败' },
      { status: 500 }
    )
  }
}

// GET - Get all consultations (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check admin auth
    const authResult = await checkAdminAuth()
    if (!authResult.isAdmin) {
      return NextResponse.json(
        {
          error: authResult.error?.message,
          error_code: authResult.error?.code
        },
        { status: authResult.error?.code === 40101 ? 401 : 403 }
      )
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const status = searchParams.get('status') as ConsultationStatus | null

    const { consultations, total } = await getAllConsultations(
      page,
      limit,
      status || undefined
    )

    return NextResponse.json({
      success: true,
      data: {
        consultations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取咨询列表错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取咨询列表失败' },
      { status: 500 }
    )
  }
}
