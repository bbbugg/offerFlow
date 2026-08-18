import test from 'node:test'
import assert from 'node:assert/strict'
import { canSelectJobStatus, FINAL_JOB_STATUSES, JOB_STATUSES, syncInterviewRoundsForStatus } from './jobStatus.js'

test('OA and interview stages cannot return to applied', () => {
  const oaJob = { status: 'OA / 笔试', interviewRounds: [] }
  assert.equal(canSelectJobStatus(oaJob, '已投递'), false)
  assert.equal(canSelectJobStatus(oaJob, 'OA / 笔试'), true)
  assert.equal(canSelectJobStatus(oaJob, '一面中'), true)

  const job = {
    status: '一面中',
    interviewRounds: [{ id: 'r1', round: '一面', status: '进行中', date: '2026-08-18', result: '', notes: '' }],
  }

  assert.equal(canSelectJobStatus(job, 'OA / 笔试'), true)
  assert.equal(canSelectJobStatus(job, '已投递'), false)
  assert.equal(canSelectJobStatus(job, '一面中'), true)
  assert.equal(canSelectJobStatus(job, '二面中'), true)
  assert.equal(canSelectJobStatus(job, '三面中'), false)
})

test('Offer and ended jobs cannot transition to another status', () => {
  for (const finalStatus of FINAL_JOB_STATUSES) {
    const job = { status: finalStatus, interviewRounds: [] }

    for (const targetStatus of JOB_STATUSES) {
      assert.equal(
        canSelectJobStatus(job, targetStatus),
        targetStatus === finalStatus,
        `${finalStatus} -> ${targetStatus}`,
      )
    }
  }
})

test('changing an ending reason remaps failed interview rounds to canceled', () => {
  const rounds = [
    { id: 'r1', round: '一面', status: '已通过', date: '2026-08-01', result: '通过', notes: '' },
    { id: 'r2', round: '二面', status: '未通过', date: '2026-08-10', result: '未通过', notes: '原反馈保留' },
  ]
  const result = syncInterviewRoundsForStatus({
    status: '已结束',
    endReason: '岗位关闭',
    interviewRounds: rounds,
  }, '已结束', { previousEndReason: '被拒绝' })

  assert.deepEqual(result, [
    rounds[0],
    { ...rounds[1], status: '已取消' },
  ])
})

test('changing an ending reason remaps canceled interview rounds to failed', () => {
  const rounds = [
    { id: 'r1', round: '一面', status: '已取消', date: '2026-08-01', result: '', notes: '' },
  ]
  const result = syncInterviewRoundsForStatus({
    status: '已结束',
    endReason: '被拒绝',
    interviewRounds: rounds,
  }, '已结束', { previousEndReason: '自己放弃' })

  assert.deepEqual(result, [{ ...rounds[0], status: '未通过' }])
})

test('changing between ending reasons with the same mapping preserves statuses', () => {
  const rounds = [
    { id: 'r1', round: '一面', status: '已取消', date: '2026-08-01', result: '', notes: '' },
  ]
  const result = syncInterviewRoundsForStatus({
    status: '已结束',
    endReason: '流程太慢',
    interviewRounds: rounds,
  }, '已结束', { previousEndReason: '自己放弃' })

  assert.deepEqual(result, rounds)
})
