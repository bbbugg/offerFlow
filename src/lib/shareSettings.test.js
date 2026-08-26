import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_SHARE_SETTINGS,
  filterTasksForSharedJobs,
  JOB_SHARE_FIELDS,
  parseShareSettings,
  sanitizeSharedJob,
  validateShareSettings
} from './shareSettings.js'

test('missing job share settings default every job field to shared', () => {
  const settings = parseShareSettings({ shareSchedule: false, shareUsername: true })

  assert.equal(settings.shareSchedule, false)
  assert.equal(settings.shareUsername, true)
  for (const { setting } of JOB_SHARE_FIELDS) {
    assert.equal(settings[setting], true, setting)
  }
})

test('share settings validation requires every known boolean setting', () => {
  const validSettings = { ...DEFAULT_SHARE_SETTINGS, shareJobProgress: false }

  assert.deepEqual(validateShareSettings(validSettings), validSettings)
  assert.equal(validateShareSettings({ shareSchedule: true, shareUsername: true }), null)
  assert.equal(validateShareSettings({ ...validSettings, unexpected: true }), null)
  assert.equal(validateShareSettings({ ...validSettings, shareJobSalaryRange: 'false' }), null)
})

test('shared jobs keep names while replacing each disabled field safely', () => {
  const job = {
    id: 'job-1',
    companyName: '示例公司',
    jobTitle: '前端工程师',
    status: 'Offer',
    city: '上海',
    salaryRange: '30k-40k',
    workMode: '混合办公',
    channel: '官网',
    priority: '高',
    appliedDate: '2026-08-20',
    jobLink: 'https://example.com/job',
    jdText: '岗位描述',
    contactName: '招聘经理',
    contactInfo: 'secret@example.com',
    nextAction: '等待结果',
    notes: '私人备注',
    endReason: '主动放弃',
    interviewRounds: [{ round: '一面' }],
    timeline: [{ action: '状态变更' }],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
    shareVisible: true,
    userId: 'must-not-leak'
  }
  const settings = Object.fromEntries(
    Object.keys(DEFAULT_SHARE_SETTINGS).map((key) => [key, false])
  )

  const sharedJob = sanitizeSharedJob(job, settings)

  assert.deepEqual(sharedJob, {
    id: 'job-1',
    companyName: '示例公司',
    jobTitle: '前端工程师',
    status: '感兴趣',
    city: '上海',
    salaryRange: '',
    workMode: '',
    channel: '',
    priority: '',
    appliedDate: '',
    jobLink: '',
    jdText: '',
    contactName: '',
    contactInfo: '',
    nextAction: '',
    notes: '',
    endReason: '',
    interviewRounds: [],
    timeline: [],
    createdAt: null,
    updatedAt: null
  })
})

test('shared jobs preserve enabled fields', () => {
  const job = Object.fromEntries([
    ['id', 'job-1'],
    ['companyName', '示例公司'],
    ['jobTitle', '后端工程师'],
    ['city', '深圳'],
    ...JOB_SHARE_FIELDS.map(({ field }) => [field, `${field}-value`])
  ])

  assert.deepEqual(sanitizeSharedJob(job, DEFAULT_SHARE_SETTINGS), job)
})

test('progress and contact switches hide their grouped fields together', () => {
  const job = {
    id: 'job-1',
    companyName: '示例公司',
    jobTitle: '产品经理',
    status: '二面中',
    appliedDate: '2026-08-20',
    endReason: '流程过慢',
    interviewRounds: [{ round: '一面' }],
    timeline: [{ action: '状态变更' }],
    updatedAt: '2026-08-26T00:00:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    contactName: '招聘经理',
    contactInfo: 'secret@example.com',
    city: '北京'
  }
  const sharedJob = sanitizeSharedJob(job, {
    ...DEFAULT_SHARE_SETTINGS,
    shareJobProgress: false,
    shareJobContact: false
  })

  assert.equal(sharedJob.status, '感兴趣')
  assert.equal(sharedJob.appliedDate, '')
  assert.equal(sharedJob.endReason, '')
  assert.deepEqual(sharedJob.interviewRounds, [])
  assert.deepEqual(sharedJob.timeline, [])
  assert.equal(sharedJob.updatedAt, null)
  assert.equal(sharedJob.createdAt, null)
  assert.equal(sharedJob.contactName, '')
  assert.equal(sharedJob.contactInfo, '')
  assert.equal(sharedJob.city, '北京')
})

test('shared tasks exclude tasks linked to hidden jobs', () => {
  const tasks = [
    { id: 'task-visible', jobId: 'job-visible' },
    { id: 'task-hidden', jobId: 'job-hidden' },
    { id: 'task-unlinked', jobId: null }
  ]

  assert.deepEqual(
    filterTasksForSharedJobs(tasks, [{ id: 'job-visible' }]),
    [tasks[0], tasks[2]]
  )
})
