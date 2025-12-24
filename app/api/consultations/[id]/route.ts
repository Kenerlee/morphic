import { NextRequest, NextResponse } from 'next/server'

import {
  deleteConsultation,
  getConsultation,
  updateConsultation} from '@/lib/actions/consultation'
import { checkAdminAuth } from '@/lib/middleware/admin-auth'

// GET - Get single consultation (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await checkAdminAuth()
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error?.message },
        { status: authResult.error?.code === 40101 ? 401 : 403 }
      )
    }

    const { id } = await params
    const consultation = await getConsultation(id)

    if (!consultation) {
      return NextResponse.json({ error: '咨询记录不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: consultation
    })
  } catch (error) {
    console.error('获取咨询记录错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取咨询记录失败' },
      { status: 500 }
    )
  }
}

// PATCH - Update consultation (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await checkAdminAuth()
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error?.message },
        { status: authResult.error?.code === 40101 ? 401 : 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const updated = await updateConsultation(id, {
      status: body.status,
      admin_notes: body.admin_notes
    })

    if (!updated) {
      return NextResponse.json({ error: '咨询记录不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: updated
    })
  } catch (error) {
    console.error('更新咨询记录错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新咨询记录失败' },
      { status: 500 }
    )
  }
}

// DELETE - Delete consultation (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await checkAdminAuth()
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error?.message },
        { status: authResult.error?.code === 40101 ? 401 : 403 }
      )
    }

    const { id } = await params
    const success = await deleteConsultation(id)

    if (!success) {
      return NextResponse.json({ error: '删除失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '咨询记录已删除'
    })
  } catch (error) {
    console.error('删除咨询记录错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除咨询记录失败' },
      { status: 500 }
    )
  }
}
