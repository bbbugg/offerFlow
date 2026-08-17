import test from 'node:test'
import assert from 'node:assert/strict'
import { syncInterviewRoundsForStatus } from './jobStatus.js'
import {
  assertUndoConfirmationCurrent,
  buildLatestTimelineUndoPatch,
  canUndoLatestTimelineEvent,
  createUndoableTimelineEvent,
  getLatestTimelineUndoConflicts,
  getJobTimelineSnapshot,
  readAppendedTimelineEvent,
  stripTimelineUndoMetadata,
  TimelineUndoError,
} from './timelineUndo.js'

const FIXED_NOW = new Date('2026-08-18T03:04:05.000Z')

function baseJob(overrides = {}) {
  return {
    status: '感兴趣',
    appliedDate: '',
    endReason: '',
    interviewRounds: [],
    timeline: [],
    ...overrides,
  }
}

function applyStatusChange(job, targetStatus, options = {}) {
  const update = {
    status: targetStatus,
    endReason: targetStatus === '已结束' ? (options.endReason || '手动标记') : '',
    appliedDate: job.appliedDate || (targetStatus === '感兴趣' ? '' : '2026-08-18'),
  }
  update.interviewRounds = syncInterviewRoundsForStatus({ ...job, ...update }, targetStatus)

  const before = getJobTimelineSnapshot(job)
  const after = getJobTimelineSnapshot({ ...job, ...update })
  const id = options.id || `event-${job.timeline.length + 1}`
  const event = createUndoableTimelineEvent({
    event: { action: '状态变更', detail: `从 ${job.status} 更新为 ${targetStatus}` },
    before,
    after,
    now: FIXED_NOW,
    id,
  })

  return {
    ...job,
    ...update,
    timeline: [...job.timeline, event],
  }
}

test('all forward status stages can be undone to the exact previous related state', () => {
  const targets = ['已投递', 'OA / 笔试', '一面中', '二面中', '三面中', '终面中']

  for (const target of targets) {
    const before = baseJob()
    const after = applyStatusChange(before, target)
    const patch = buildLatestTimelineUndoPatch(after, after.timeline.at(-1).id)

    assert.deepEqual(patch, { ...getJobTimelineSnapshot(before), timeline: [] }, target)
  }
})

test('undo restores interview results, notes, dates, ids, and round statuses after advancing', () => {
  const before = baseJob({
    status: '一面中',
    appliedDate: '2026-08-01',
    interviewRounds: [{
      id: 'round-1',
      round: '一面',
      status: '进行中',
      date: '2026-08-10',
      result: '面试官反馈积极',
      notes: '重点复习系统设计',
    }],
  })
  const after = applyStatusChange(before, '二面中')
  const patch = buildLatestTimelineUndoPatch(after, after.timeline.at(-1).id)

  assert.deepEqual(patch.interviewRounds, before.interviewRounds)
  assert.equal(patch.status, '一面中')
  assert.equal(patch.appliedDate, '2026-08-01')
})

test('Offer and every ending reason restore the in-progress interview state', () => {
  const endingReasons = ['被拒绝', '岗位关闭', '自己放弃', '流程太慢', '薪资不匹配', '地点不合适', '手动标记', '其他']
  const before = baseJob({
    status: '二面中',
    appliedDate: '2026-07-20',
    interviewRounds: [
      { id: 'r1', round: '一面', status: '已通过', date: '2026-08-01', result: '通过', notes: '' },
      { id: 'r2', round: '二面', status: '进行中', date: '2026-08-15', result: '', notes: '待反馈' },
    ],
  })

  for (const [targetStatus, endReason] of [
    ['Offer', ''],
    ...endingReasons.map((reason) => ['已结束', reason]),
  ]) {
    const after = applyStatusChange(before, targetStatus, { endReason })
    const patch = buildLatestTimelineUndoPatch(after, after.timeline.at(-1).id)
    assert.deepEqual(patch, { ...getJobTimelineSnapshot(before), timeline: [] }, `${targetStatus}: ${endReason}`)
  }
})

test('sequential undos always operate on the newest event and preserve the snapshot chain', () => {
  const initial = baseJob()
  const applied = applyStatusChange(initial, '已投递', { id: 'applied' })
  const interviewing = applyStatusChange(applied, '一面中', { id: 'interviewing' })

  assert.throws(
    () => buildLatestTimelineUndoPatch(interviewing, 'applied'),
    (error) => error instanceof TimelineUndoError && error.status === 409,
  )

  const firstPatch = buildLatestTimelineUndoPatch(interviewing, 'interviewing')
  const restoredApplied = { ...interviewing, ...firstPatch }
  assert.deepEqual(getJobTimelineSnapshot(restoredApplied), getJobTimelineSnapshot(applied))
  assert.equal(restoredApplied.timeline.length, 1)
  assert.equal(canUndoLatestTimelineEvent(restoredApplied), true)

  const secondPatch = buildLatestTimelineUndoPatch(restoredApplied, 'applied')
  assert.deepEqual(secondPatch, { ...getJobTimelineSnapshot(initial), timeline: [] })
})

test('legacy events and diverged related state are not guessed or overwritten', () => {
  const legacy = baseJob({ timeline: [{ date: '2026-01-01', action: '状态变更' }] })
  assert.equal(canUndoLatestTimelineEvent(legacy), false)
  assert.throws(() => buildLatestTimelineUndoPatch(legacy, undefined), TimelineUndoError)

  const changed = applyStatusChange(baseJob(), '一面中')
  changed.interviewRounds = changed.interviewRounds.map((round) => ({ ...round, result: '后续补充的结果' }))
  assert.equal(canUndoLatestTimelineEvent(changed), false)
  assert.throws(
    () => buildLatestTimelineUndoPatch(changed, changed.timeline.at(-1).id),
    (error) => error instanceof TimelineUndoError
      && error.status === 409
      && error.code === 'UNDO_CONFLICT'
      && error.details.conflicts[0] === 'interviewRounds',
  )
  assert.deepEqual(getLatestTimelineUndoConflicts(changed), ['interviewRounds'])
  const forcedPatch = buildLatestTimelineUndoPatch(changed, changed.timeline.at(-1).id, { force: true })
  assert.deepEqual(forcedPatch, { ...changed.timeline.at(-1)._undo.before, timeline: [] })
})

test('timeline append validation rejects replacement, deletion, and multiple events', () => {
  const existing = [{ id: 'old', action: '旧记录' }]
  const appended = { action: '新记录' }

  assert.equal(readAppendedTimelineEvent(existing, undefined), null)
  assert.equal(readAppendedTimelineEvent(existing, existing), null)
  assert.deepEqual(readAppendedTimelineEvent(existing, [...existing, appended]), appended)
  assert.deepEqual(readAppendedTimelineEvent(existing, [{ action: '旧记录', id: 'old' }, appended]), appended)
  assert.throws(() => readAppendedTimelineEvent(existing, []), TimelineUndoError)
  assert.throws(() => readAppendedTimelineEvent(existing, [{ id: 'changed' }, appended]), TimelineUndoError)
  assert.throws(() => readAppendedTimelineEvent(existing, [...existing, appended, appended]), TimelineUndoError)
})

test('public timeline data omits private rollback snapshots', () => {
  const job = applyStatusChange(baseJob(), '一面中')
  const stripped = stripTimelineUndoMetadata(job.timeline)

  assert.equal(Object.hasOwn(stripped[0], '_undo'), false)
  assert.equal(stripped[0].action, '状态变更')
  assert.equal(Object.hasOwn(job.timeline[0], '_undo'), true)
})

test('ordinary and force undo confirmations must match the latest updatedAt', () => {
  const job = { updatedAt: new Date('2026-08-18T10:00:00.000Z') }

  assert.doesNotThrow(() => assertUndoConfirmationCurrent(job, '2026-08-18T10:00:00.000Z'))
  assert.throws(
    () => assertUndoConfirmationCurrent(job, '2026-08-18T10:00:01.000Z'),
    (error) => error instanceof TimelineUndoError
      && error.status === 409
      && error.code === 'UNDO_CONFIRMATION_STALE',
  )
  assert.throws(
    () => assertUndoConfirmationCurrent(job, undefined),
    (error) => error instanceof TimelineUndoError && error.code === 'UNDO_CONFIRMATION_STALE',
  )
})
