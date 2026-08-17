import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { canSelectJobStatus, JOB_STATUSES, JOB_STATUS_TRANSITION_ERROR, statusImpliesApplied, syncInterviewRoundsForStatus } from '@/lib/jobStatus'
import { formatBeijingDate } from '@/lib/dateUtils'
import {
  createUndoableTimelineEvent,
  getJobTimelineSnapshot,
  readAppendedTimelineEvent,
  TimelineUndoError,
} from '@/lib/timelineUndo'

const UPDATABLE_JOB_FIELDS = [
  'companyName',
  'jobTitle',
  'status',
  'city',
  'salaryRange',
  'workMode',
  'channel',
  'priority',
  'appliedDate',
  'jobLink',
  'jdText',
  'contactName',
  'contactInfo',
  'nextAction',
  'notes',
  'endReason',
  'interviewRounds',
]

function getBeijingDateString() {
  return formatBeijingDate()
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
  const { companyName, jobTitle, status, city, salaryRange, workMode, channel, priority, appliedDate, jobLink, jdText, contactName, contactInfo, nextAction, notes, endReason, interviewRounds } = body
  const normalizedStatus = status || '感兴趣'
  if (!JOB_STATUSES.includes(normalizedStatus)) {
    return NextResponse.json({ error: '岗位状态不正确' }, { status: 400 })
  }
  const normalizedAppliedDate = appliedDate?.trim() || (statusImpliesApplied(normalizedStatus) ? getBeijingDateString() : '')
  const normalizedInterviewRounds = syncInterviewRoundsForStatus({
    endReason: endReason || '',
    interviewRounds: interviewRounds || [],
  }, normalizedStatus)

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
      contactName: contactName || '',
      contactInfo: contactInfo || '',
      nextAction: nextAction || '',
      notes: notes || '',
      endReason: endReason || '',
      interviewRounds: normalizedInterviewRounds,
      timeline: [],
    },
  })

  return NextResponse.json({ job }, { status: 201 })
}

export async function PUT(request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await request.json()
  const { id } = body

  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const data = {}
  for (const field of UPDATABLE_JOB_FIELDS) {
    if (Object.hasOwn(body, field)) data[field] = body[field]
  }

  try {
    const job = await prisma.$transaction(async (tx) => {
      const existing = await tx.job.findUnique({ where: { id } })
      if (!existing || existing.userId !== user.id) {
        throw new TimelineUndoError('无权修改此记录', 403)
      }

      const appendedEvent = readAppendedTimelineEvent(existing.timeline, body.timeline)
      const statusChanged = Object.hasOwn(data, 'status') && data.status !== existing.status

      if (Object.hasOwn(data, 'status') && !JOB_STATUSES.includes(data.status)) {
        throw new TimelineUndoError('岗位状态不正确')
      }
      if (data.status && !canSelectJobStatus(existing, data.status)) {
        throw new TimelineUndoError(JOB_STATUS_TRANSITION_ERROR)
      }
      if (appendedEvent && !statusChanged) {
        throw new TimelineUndoError('只有状态变更可以追加时间线记录')
      }

      const updateData = { ...data }
      if (updateData.status && statusImpliesApplied(updateData.status) && !existing.appliedDate && !updateData.appliedDate) {
        updateData.appliedDate = getBeijingDateString()
      }
      if (updateData.status || updateData.endReason || updateData.interviewRounds) {
        const nextStatus = updateData.status ?? existing.status
        const endReasonChanged = Object.hasOwn(updateData, 'endReason') && updateData.endReason !== existing.endReason
        updateData.interviewRounds = syncInterviewRoundsForStatus({
          ...existing,
          ...updateData,
          interviewRounds: updateData.interviewRounds ?? existing.interviewRounds,
        }, nextStatus, {
          previousEndReason: nextStatus === '已结束' && existing.status === '已结束' && endReasonChanged
            ? existing.endReason
            : undefined,
        })
      }

      if (statusChanged) {
        const before = getJobTimelineSnapshot(existing)
        const after = getJobTimelineSnapshot({ ...existing, ...updateData })
        const event = appendedEvent || {
          action: '状态变更',
          detail: `从 ${existing.status} 更新为 ${updateData.status}`,
        }
        updateData.timeline = [
          ...(Array.isArray(existing.timeline) ? existing.timeline : []),
          createUndoableTimelineEvent({ event, before, after }),
        ]
      }

      const updated = await tx.job.updateMany({
        where: { id, userId: user.id, updatedAt: existing.updatedAt },
        data: updateData,
      })
      if (updated.count !== 1) {
        throw new TimelineUndoError('岗位已被其他操作更新，请刷新后重试', 409)
      }

      return tx.job.findUnique({ where: { id } })
    })

    return NextResponse.json({ job })
  } catch (error) {
    if (error instanceof TimelineUndoError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[jobs] Failed to update job', error)
    return NextResponse.json({ error: '岗位更新失败，请稍后重试' }, { status: 500 })
  }
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
