import { NextRequest, NextResponse } from 'next/server'

import { getAllUserProfiles } from '@/lib/actions/user-profile'
import { checkAdminAuth } from '@/lib/middleware/admin-auth'

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
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

    // 获取分页参数
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const search = searchParams.get('search') || ''

    // 获取所有用户
    const { profiles, total: allTotal } = await getAllUserProfiles(1, 1000)

    // 搜索过滤
    let filteredUsers = profiles
    if (search) {
      const searchLower = search.toLowerCase()
      filteredUsers = profiles.filter(
        user =>
          user.id.toLowerCase().includes(searchLower) ||
          (user.mobile && user.mobile.includes(search))
      )
    }

    // 分页
    const total = filteredUsers.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedUsers = filteredUsers.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }
    })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取用户列表失败' },
      { status: 500 }
    )
  }
}
