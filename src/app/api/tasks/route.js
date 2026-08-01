import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const UPDATABLE_TASK_FIELDS = [
  'title',
  'type',
  'date',
  'startTime',
  'endTime',
  'priority',
  'done',
  'jobId',
  'notes',
]

function normalizeJobId(jobId) {
  if (jobId == null) return null
  if (typeof jobId !== 'string') return undefined
  return jobId.trim() || null
}

async function canLinkJob(jobId, userId) {
  if (!jobId) return true

  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
    select: { id: true },
  })
  return Boolean(job)
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tasks = await prisma.task.findMany({
    where: { userId: user.id },
    orderBy: { date: 'asc' },
  })
  return NextResponse.json(tasks)
}

export async function POST(request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await request.json()
  const { title, type, date, startTime, endTime, priority, done, jobId, notes } = body
  const normalizedJobId = normalizeJobId(jobId)
  if (normalizedJobId === undefined) {
    return NextResponse.json({ error: '岗位 id 格式不正确' }, { status: 400 })
  }
  if (!(await canLinkJob(normalizedJobId, user.id))) {
    return NextResponse.json({ error: '无权关联此岗位' }, { status: 403 })
  }

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title: title || '',
      type: type || '其他',
      date: date || '',
      startTime: startTime || '',
      endTime: endTime || '',
      priority: priority || '中',
      done: done || false,
      jobId: normalizedJobId,
      notes: notes || '',
    },
  })

  return NextResponse.json({ task }, { status: 201 })
}

export async function PUT(request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await request.json()
  const { id } = body

  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const data = {}
  for (const field of UPDATABLE_TASK_FIELDS) {
    if (Object.hasOwn(body, field)) data[field] = body[field]
  }

  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: '无权修改此记录' }, { status: 403 })
  }

  if ('jobId' in data) {
    data.jobId = normalizeJobId(data.jobId)
    if (data.jobId === undefined) {
      return NextResponse.json({ error: '岗位 id 格式不正确' }, { status: 400 })
    }
    if (!(await canLinkJob(data.jobId, user.id))) {
      return NextResponse.json({ error: '无权关联此岗位' }, { status: 403 })
    }
  }

  const task = await prisma.task.update({
    where: { id, userId: user.id },
    data,
  })

  return NextResponse.json({ task })
}

export async function DELETE(request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: '无权删除此记录' }, { status: 403 })
  }

  await prisma.task.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
