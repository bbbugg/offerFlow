import { formatBeijingDate } from './dateUtils.js'

export const TIMELINE_UNDO_VERSION = 1

const SNAPSHOT_FIELDS = ['status', 'appliedDate', 'endReason', 'interviewRounds']

export class TimelineUndoError extends Error {
  constructor(message, status = 400, code = null, details = null) {
    super(message)
    this.name = 'TimelineUndoError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map(canonicalizeJson)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalizeJson(value[key])]),
  )
}

function snapshotsEqual(left, right) {
  return JSON.stringify(canonicalizeJson(left)) === JSON.stringify(canonicalizeJson(right))
}

function isValidSnapshot(snapshot) {
  return snapshot
    && typeof snapshot === 'object'
    && SNAPSHOT_FIELDS.every((field) => Object.hasOwn(snapshot, field))
    && Array.isArray(snapshot.interviewRounds)
}

export function getJobTimelineSnapshot(job) {
  return {
    status: job?.status || '感兴趣',
    appliedDate: job?.appliedDate || '',
    endReason: job?.endReason || '',
    interviewRounds: cloneJson(Array.isArray(job?.interviewRounds) ? job.interviewRounds : []),
  }
}

export function readAppendedTimelineEvent(existingTimeline, incomingTimeline) {
  const existing = Array.isArray(existingTimeline) ? existingTimeline : []
  if (incomingTimeline === undefined) return null
  if (!Array.isArray(incomingTimeline)) {
    throw new TimelineUndoError('时间线数据格式不正确')
  }
  if (snapshotsEqual(existing, incomingTimeline)) return null
  if (incomingTimeline.length !== existing.length + 1) {
    throw new TimelineUndoError('时间线只能随一次状态变更追加一条记录', 409)
  }
  if (!snapshotsEqual(existing, incomingTimeline.slice(0, -1))) {
    throw new TimelineUndoError('岗位时间线已变化，请刷新后重试', 409)
  }
  return incomingTimeline.at(-1)
}

export function createUndoableTimelineEvent({ event, before, after, now = new Date(), id = crypto.randomUUID() }) {
  const source = event && typeof event === 'object' ? event : {}
  return {
    id,
    date: formatBeijingDate(now),
    action: typeof source.action === 'string' && source.action.trim() ? source.action.trim() : '状态变更',
    detail: typeof source.detail === 'string' ? source.detail.trim() : '',
    createdAt: now.toISOString(),
    _undo: {
      version: TIMELINE_UNDO_VERSION,
      before: cloneJson(before),
      after: cloneJson(after),
    },
  }
}

export function canUndoLatestTimelineEvent(job) {
  const timeline = Array.isArray(job?.timeline) ? job.timeline : []
  const latestEvent = timeline.at(-1)
  const undo = latestEvent?._undo
  return Boolean(
    latestEvent?.id
    && undo?.version === TIMELINE_UNDO_VERSION
    && isValidSnapshot(undo.before)
    && isValidSnapshot(undo.after)
    && snapshotsEqual(getJobTimelineSnapshot(job), undo.after)
  )
}

export function hasLatestTimelineUndoSnapshot(job) {
  const timeline = Array.isArray(job?.timeline) ? job.timeline : []
  const latestEvent = timeline.at(-1)
  const undo = latestEvent?._undo
  return Boolean(
    latestEvent?.id
    && undo?.version === TIMELINE_UNDO_VERSION
    && isValidSnapshot(undo.before)
    && isValidSnapshot(undo.after)
  )
}

export function getLatestTimelineUndoConflicts(job) {
  if (!hasLatestTimelineUndoSnapshot(job)) return []
  const timeline = Array.isArray(job.timeline) ? job.timeline : []
  const after = timeline.at(-1)._undo.after
  const current = getJobTimelineSnapshot(job)
  return SNAPSHOT_FIELDS.filter((field) => !snapshotsEqual(current[field], after[field]))
}

export function assertUndoConfirmationCurrent(job, expectedUpdatedAt) {
  const currentTimestamp = new Date(job?.updatedAt || 0).getTime()
  const expectedTimestamp = new Date(expectedUpdatedAt || 0).getTime()
  if (!expectedUpdatedAt || Number.isNaN(currentTimestamp) || Number.isNaN(expectedTimestamp) || currentTimestamp !== expectedTimestamp) {
    throw new TimelineUndoError(
      '岗位在确认后又被更新，请查看最新内容并重新确认',
      409,
      'UNDO_CONFIRMATION_STALE',
    )
  }
}

export function buildLatestTimelineUndoPatch(job, expectedEventId, { force = false } = {}) {
  const timeline = Array.isArray(job?.timeline) ? job.timeline : []
  const latestEvent = timeline.at(-1)

  if (!latestEvent) {
    throw new TimelineUndoError('当前没有可撤销的时间线操作', 409)
  }
  if (!expectedEventId || latestEvent.id !== expectedEventId) {
    throw new TimelineUndoError('最新时间线操作已变化，请刷新后重试', 409)
  }
  if (!hasLatestTimelineUndoSnapshot(job)) {
    throw new TimelineUndoError('该操作缺少完整回滚信息，无法安全撤销', 409)
  }
  if (!force && getLatestTimelineUndoConflicts(job).length > 0) {
    const conflicts = getLatestTimelineUndoConflicts(job)
    throw new TimelineUndoError(
      '相关状态已被后续修改，请确认是否强制覆盖',
      409,
      'UNDO_CONFLICT',
      { conflicts },
    )
  }

  return {
    ...cloneJson(latestEvent._undo.before),
    timeline: cloneJson(timeline.slice(0, -1)),
  }
}

export function stripTimelineUndoMetadata(timeline) {
  if (!Array.isArray(timeline)) return timeline
  return timeline.map(({ _undo, ...event }) => event)
}
