import test from 'node:test'
import assert from 'node:assert/strict'
import { compareJobsByLatestTimeline, getLatestTimelineTimestamp } from './jobSort.js'

test('board sorting uses the latest timeline time instead of job updatedAt', () => {
  const jobs = [
    {
      id: 'newer-row-update',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-18T12:00:00.000Z',
      timeline: [{ createdAt: '2026-08-02T01:00:00.000Z', date: '2026-08-02' }],
    },
    {
      id: 'newer-timeline',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-17T12:00:00.000Z',
      timeline: [{ createdAt: '2026-08-18T01:00:00.000Z', date: '2026-08-18' }],
    },
  ]

  jobs.sort(compareJobsByLatestTimeline)
  assert.deepEqual(jobs.map((job) => job.id), ['newer-timeline', 'newer-row-update'])
})

test('legacy timeline dates and empty timelines have deterministic fallbacks', () => {
  const legacy = {
    id: 'legacy',
    createdAt: '2026-07-01T00:00:00.000Z',
    timeline: [{ date: '2026-08-03' }],
  }
  const empty = {
    id: 'empty',
    createdAt: '2026-08-02T00:00:00.000Z',
    timeline: [],
  }

  assert.equal(getLatestTimelineTimestamp(legacy), new Date('2026-08-03T00:00:00+08:00').getTime())
  assert.equal(getLatestTimelineTimestamp(empty), new Date(empty.createdAt).getTime())
  assert.equal(compareJobsByLatestTimeline(legacy, empty) < 0, true)
})

test('timeline createdAt distinguishes events recorded on the same day', () => {
  const earlier = { id: 'earlier', createdAt: '2026-01-01', timeline: [{ date: '2026-08-18', createdAt: '2026-08-18T01:00:00.000Z' }] }
  const later = { id: 'later', createdAt: '2026-01-01', timeline: [{ date: '2026-08-18', createdAt: '2026-08-18T02:00:00.000Z' }] }

  assert.equal(compareJobsByLatestTimeline(later, earlier) < 0, true)
})
