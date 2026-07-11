import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  // 1. 通过分享 Token 检索对应的用户
  const user = await prisma.user.findUnique({
    where: { shareToken: token },
    select: { id: true, username: true }
  })

  if (!user) {
    return NextResponse.json({ error: '分享链接已失效或不存在' }, { status: 404 })
  }

  // 2. 检索该用户关联的所有求职岗位及日程待办事项数据
  const [jobs, tasks] = await Promise.all([
    prisma.job.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.task.findMany({
      where: { userId: user.id }
    })
  ])

  return NextResponse.json({
    username: user.username,
    jobs,
    tasks
  })
}
