import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { canSelectInterviewStatus, syncInterviewRoundsForStatus } from '@/lib/jobStatus'

function getBeijingDateString() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jobs = await prisma.job.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(jobs)
}

export async function POST(request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await request.json()
  const { companyName, jobTitle, status, city, salaryRange, workMode, channel, priority, appliedDate, jobLink, jdText, resumeId, contactName, contactInfo, nextAction, notes, endReason, interviewRounds, timeline } = body
  const normalizedStatus = status || '感兴趣'
  const normalizedAppliedDate = appliedDate?.trim() || (normalizedStatus === '已投递' ? getBeijingDateString() : '')
  const normalizedInterviewRounds = syncInterviewRoundsForStatus({ interviewRounds: interviewRounds || [] }, normalizedStatus)

  const job = await prisma.job.create({
    data: {
      userId: user.id,
      companyName: companyName || '',
      jobTitle: jobTitle || '',
      status: normalizedStatus,
      city: city || '',
      salaryRange: salaryRange || '',
      workMode: workMode || '',
      channel: channel || '',
      priority: priority || '中',
      appliedDate: normalizedAppliedDate,
      jobLink: jobLink || '',
      jdText: jdText || '',
      resumeId: resumeId || null,
      contactName: contactName || '',
      contactInfo: contactInfo || '',
      nextAction: nextAction || '',
      notes: notes || '',
      endReason: endReason || '',
      interviewRounds: normalizedInterviewRounds,
      timeline: timeline || [],
    },
  })

  return NextResponse.json({ job }, { status: 201 })
}

export async function PUT(request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await request.json()
  const { id, ...data } = body

  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const existing = await prisma.job.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: '无权修改此记录' }, { status: 403 })
  }

  // Convert empty resumeId to null to avoid FK issues
  if (data.resumeId === '') data.resumeId = null

  if (data.status && !canSelectInterviewStatus(existing, data.status)) {
    return NextResponse.json({ error: '面试状态只能按轮次向后推进，不能退回前面的面试轮次' }, { status: 400 })
  }

  const updateData = { ...data }
  if (updateData.status) {
    updateData.interviewRounds = syncInterviewRoundsForStatus({
      ...existing,
      ...updateData,
      interviewRounds: updateData.interviewRounds ?? existing.interviewRounds,
    }, updateData.status)
  }

  const job = await prisma.job.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({ job })
}

export async function DELETE(request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  let ids = []
  if (id) {
    ids = [id]
  } else {
    const body = await request.json().catch(() => ({}))
    ids = body.ids || []
  }

  if (ids.length === 0) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  // Verify ownership for all ids
  const owned = await prisma.job.findMany({
    where: { id: { in: ids }, userId: user.id },
    select: { id: true },
  })
  const ownedIds = owned.map((j) => j.id)

  if (ownedIds.length === 0) {
    return NextResponse.json({ error: '无权删除' }, { status: 403 })
  }

  await prisma.job.deleteMany({
    where: { id: { in: ownedIds } },
  })

  return NextResponse.json({ success: true, deletedIds: ownedIds })
}
