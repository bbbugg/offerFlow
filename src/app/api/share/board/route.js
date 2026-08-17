import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { parseShareSettings } from '@/lib/shareSettings'
import { stripTimelineUndoMetadata } from '@/lib/timelineUndo'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  // 1. 通过分享 Token 检索对应的用户及分享权限配置
  const user = await prisma.user.findUnique({
    where: { shareToken: token },
    select: { id: true, username: true, shareSettings: true }
  })

  if (!user) {
    return NextResponse.json({ error: '分享链接已失效或不存在' }, { status: 404 })
  }

  const shareSettings = parseShareSettings(user.shareSettings)
  const { shareSchedule, shareUsername } = shareSettings

  // 2. 检索该用户关联的求职岗位，如果开启了日程分享则检索待办事项数据
  const [jobs, tasks] = await Promise.all([
    prisma.job.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        companyName: true,
        jobTitle: true,
        status: true,
        city: true,
        salaryRange: true,
        workMode: true,
        channel: true,
        priority: true,
        appliedDate: true,
        jobLink: true,
        jdText: true,
        contactName: true,
        contactInfo: true,
        nextAction: true,
        notes: true,
        endReason: true,
        interviewRounds: true,
        timeline: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' }
    }),
    shareSchedule
      ? prisma.task.findMany({
          where: { userId: user.id },
          select: {
            id: true,
            title: true,
            type: true,
            date: true,
            startTime: true,
            endTime: true,
            priority: true,
            done: true,
            jobId: true
          }
        })
      : Promise.resolve([])
  ])

  return NextResponse.json({
    username: shareUsername ? user.username : null,
    shareSettings,
    jobs: jobs.map((job) => ({
      ...job,
      timeline: stripTimelineUndoMetadata(job.timeline),
    })),
    tasks
  })
}
