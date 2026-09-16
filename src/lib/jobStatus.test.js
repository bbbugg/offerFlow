import test from 'node:test'
import assert from 'node:assert/strict'
import { canSelectJobStatus, FINAL_JOB_STATUSES, JOB_STATUSES, syncInterviewRoundsForStatus } from './jobStatus.js'

test('OA, AI interview, and formal interview stages cannot return to applied', () => {
  const oaJob = { status: 'OA / 笔试', interviewRounds: [] }
  assert.equal(canSelectJobStatus(oaJob, '已投递'), false)
  assert.equal(canSelectJobStatus(oaJob, 'OA / 笔试'), true)
  assert.equal(canSelectJobStatus(oaJob, 'AI 面试'), true)
  assert.equal(canSelectJobStatus(oaJob, '一面中'), true)

  const aiInterviewJob = { status: 'AI 面试', interviewRounds: [] }
  assert.equal(canSelectJobStatus(aiInterviewJob, '已投递'), false)
  assert.equal(canSelectJobStatus(aiInterviewJob, 'OA / 笔试'), true)
  assert.equal(canSelectJobStatus(aiInterviewJob, 'AI 面试'), true)
  assert.equal(canSelectJobStatus(aiInterviewJob, '一面中'), true)

  const job = {
    status: '一面中',
    interviewRounds: [{ id: 'r1', round: '一面', status: '进行中', date: '2026-08-18', result: '', notes: '' }],
  }

  assert.equal(canSelectJobStatus(job, 'OA / 笔试'), true)
  assert.equal(canSelectJobStatus(job, 'AI 面试'), true)
  assert.equal(canSelectJobStatus(job, '已投递'), false)
  assert.equal(canSelectJobStatus(job, '一面中'), true)
  assert.equal(canSelectJobStatus(job, '二面中'), true)
  assert.equal(canSelectJobStatus(job, '三面中'), false)
  assert.equal(canSelectJobStatus(job, '终面中'), true)
})

test('any progress can jump to final interview but final cannot go back', () => {
  const progressJobs = [
    { status: '已投递', interviewRounds: [] },
    { status: 'OA / 笔试', interviewRounds: [] },
    { status: 'AI 面试', interviewRounds: [] },
    {
      status: '二面中',
      interviewRounds: [
        { id: 'r1', round: '一面', status: '已通过', date: '2026-08-18', result: '', notes: '' },
        { id: 'r2', round: '二面', status: '进行中', date: '2026-08-18', result: '', notes: '' },
      ],
    },
    {
      status: '三面中',
      interviewRounds: [
        { id: 'r1', round: '一面', status: '已通过', date: '2026-08-18', result: '', notes: '' },
        { id: 'r2', round: '二面', status: '已通过', date: '2026-08-18', result: '', notes: '' },
        { id: 'r3', round: '三面', status: '进行中', date: '2026-08-18', result: '', notes: '' },
      ],
    },
  ]

  for (const job of progressJobs) {
    assert.equal(canSelectJobStatus(job, '终面中'), true, `${job.status} -> 终面中`)
  }

  const finalJob = {
    status: '终面中',
    interviewRounds: [
      { id: 'r1', round: '一面', status: '已通过', date: '2026-08-18', result: '', notes: '' },
      { id: 'r2', round: '二面', status: '已通过', date: '2026-08-18', result: '', notes: '' },
      { id: 'r3', round: '三面', status: '已通过', date: '2026-08-18', result: '', notes: '' },
      { id: 'r4', round: '终面', status: '进行中', date: '2026-08-18', result: '', notes: '' },
    ],
  }

  assert.equal(canSelectJobStatus(finalJob, '一面中'), false)
  assert.equal(canSelectJobStatus(finalJob, '二面中'), false)
  assert.equal(canSelectJobStatus(finalJob, '三面中'), false)
  assert.equal(canSelectJobStatus(finalJob, '终面中'), true)
  assert.equal(canSelectJobStatus(finalJob, 'Offer'), true)
})

test('AI interview behaves like OA without creating a formal interview round', () => {
  const aiInterviewRounds = syncInterviewRoundsForStatus({
    status: '已投递',
    interviewRounds: [],
  }, 'AI 面试')
  const oaRounds = syncInterviewRoundsForStatus({
    status: '已投递',
    interviewRounds: [],
  }, 'OA / 笔试')

  assert.deepEqual(aiInterviewRounds, oaRounds)
  assert.deepEqual(aiInterviewRounds, [])
})

test('jumping to final interview does not infer missing earlier rounds', () => {
  const directResult = syncInterviewRoundsForStatus({
    status: '已投递',
    interviewRounds: [],
  }, '终面中')

  assert.deepEqual(
    directResult.map(({ round, status }) => ({ round, status })),
    [{ round: '终面', status: '进行中' }],
  )

  const existingRounds = [
    { id: 'r1', round: '一面', status: '已通过', date: '2026-08-18', result: '通过', notes: '' },
    { id: 'r2', round: '二面', status: '进行中', date: '2026-08-25', result: '', notes: '等待结果' },
  ]
  const resultWithHistory = syncInterviewRoundsForStatus({
    status: '二面中',
    interviewRounds: existingRounds,
  }, '终面中')

  assert.deepEqual(
    resultWithHistory.map(({ round, status }) => ({ round, status })),
    [
      { round: '一面', status: '已通过' },
      { round: '二面', status: '已通过' },
      { round: '终面', status: '进行中' },
    ],
  )
  assert.equal(resultWithHistory[1].notes, '等待结果')
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
