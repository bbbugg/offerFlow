import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { parseShareSettings, validateShareSettings } from '@/lib/shareSettings'
import { randomUUID } from 'crypto'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { shareToken: true, shareSettings: true }
  })
  const settings = parseShareSettings(dbUser?.shareSettings)
  return NextResponse.json({
    shareToken: dbUser?.shareToken || null,
    shareSettings: settings
  })
}

export async function POST() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  // 使用 UUID 拼接成 64 位的高安全随机 Token
  const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { shareToken: token },
    select: { shareToken: true, shareSettings: true }
  })

  return NextResponse.json({
    shareToken: updatedUser.shareToken,
    shareSettings: parseShareSettings(updatedUser.shareSettings)
  })
}

export async function PATCH(request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  try {
    const body = await request.json()
    const shareSettings = validateShareSettings(body?.shareSettings)
    if (!shareSettings) {
      return NextResponse.json({
        error: '分享设置必须包含 shareSchedule 和 shareUsername 两个布尔值'
      }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { shareSettings },
      select: { shareToken: true, shareSettings: true }
    })

    return NextResponse.json({
      shareToken: updatedUser.shareToken,
      shareSettings: parseShareSettings(updatedUser.shareSettings)
    })
  } catch {
    return NextResponse.json({ error: '更新设置失败' }, { status: 400 })
  }
}

export async function DELETE() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  await prisma.user.update({
    where: { id: user.id },
    data: { shareToken: null }
  })

  return NextResponse.json({ success: true })
}
