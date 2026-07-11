import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { shareToken: true }
  })
  return NextResponse.json({ shareToken: dbUser?.shareToken || null })
}

export async function POST() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  // 使用 UUID 拼接成 64 位的高安全随机 Token
  const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')

  await prisma.user.update({
    where: { id: user.id },
    data: { shareToken: token }
  })

  return NextResponse.json({ shareToken: token })
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
