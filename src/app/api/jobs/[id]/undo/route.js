import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { assertUndoConfirmationCurrent, buildLatestTimelineUndoPatch, TimelineUndoError } from '@/lib/timelineUndo'

export async function POST(request, { params }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  try {
    const job = await prisma.$transaction(async (tx) => {
      const existing = await tx.job.findUnique({ where: { id } })
      if (!existing || existing.userId !== user.id) {
        throw new TimelineUndoError('无权修改此记录', 403)
      }

      assertUndoConfirmationCurrent(existing, body.expectedUpdatedAt)
      const undoPatch = buildLatestTimelineUndoPatch(existing, body.eventId, { force: body.force === true })
      const updated = await tx.job.updateMany({
        where: { id, userId: user.id, updatedAt: existing.updatedAt },
        data: undoPatch,
      })
      if (updated.count !== 1) {
        throw new TimelineUndoError(
          '岗位在确认后又被更新，请查看最新内容并重新确认',
          409,
          'UNDO_CONFIRMATION_STALE',
        )
      }

      return tx.job.findUnique({ where: { id } })
    })

    return NextResponse.json({ job })
  } catch (error) {
    if (error instanceof TimelineUndoError) {
      return NextResponse.json({
        error: error.message,
        code: error.code,
        conflicts: error.details?.conflicts,
      }, { status: error.status })
    }
    console.error('[jobs/undo] Failed to undo timeline event', error)
    return NextResponse.json({ error: '撤销失败，请稍后重试' }, { status: 500 })
  }
}
