import { RECRUITMENT_BATCHES, normalizeRecruitmentBatch } from './recruitmentBatch.js'

export const JOB_SHARE_FIELDS = Object.freeze([
  { setting: 'shareJobProgress', field: 'status', hiddenValue: '感兴趣' },
  { setting: 'shareJobSalaryRange', field: 'salaryRange', hiddenValue: '' },
  { setting: 'shareJobWorkMode', field: 'workMode', hiddenValue: '' },
  { setting: 'shareJobChannel', field: 'channel', hiddenValue: '' },
  { setting: 'shareJobPriority', field: 'priority', hiddenValue: '' },
  { setting: 'shareJobProgress', field: 'appliedDate', hiddenValue: '' },
  { setting: 'shareJobLink', field: 'jobLink', hiddenValue: '' },
  { setting: 'shareJobJdText', field: 'jdText', hiddenValue: '' },
  { setting: 'shareJobContact', field: 'contactName', hiddenValue: '' },
  { setting: 'shareJobContact', field: 'contactInfo', hiddenValue: '' },
  { setting: 'shareJobNextAction', field: 'nextAction', hiddenValue: '' },
  { setting: 'shareJobNotes', field: 'notes', hiddenValue: '' },
  { setting: 'shareJobProgress', field: 'endReason', hiddenValue: '' },
  { setting: 'shareJobProgress', field: 'interviewRounds', hiddenValue: [] },
  { setting: 'shareJobProgress', field: 'timeline', hiddenValue: [] },
  { setting: 'shareJobProgress', field: 'createdAt', hiddenValue: null },
  { setting: 'shareJobProgress', field: 'updatedAt', hiddenValue: null }
])

export const DEFAULT_SHARE_SETTINGS = Object.freeze({
  shareSchedule: true,
  shareUsername: true,
  sharedRecruitmentBatches: Object.freeze([...RECRUITMENT_BATCHES]),
  ...Object.fromEntries(JOB_SHARE_FIELDS.map(({ setting }) => [setting, true]))
})

export function parseShareSettings(raw) {
  const settings = Object.fromEntries(
    Object.entries(DEFAULT_SHARE_SETTINGS)
      .filter(([key]) => key !== 'sharedRecruitmentBatches')
      .map(([key, defaultValue]) => [
        key,
        typeof raw?.[key] === 'boolean' ? raw[key] : defaultValue
      ])
  )
  settings.sharedRecruitmentBatches = Array.isArray(raw?.sharedRecruitmentBatches)
    ? RECRUITMENT_BATCHES.filter((batch) => raw.sharedRecruitmentBatches.includes(batch))
    : [...RECRUITMENT_BATCHES]
  return settings
}

export function validateShareSettings(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const allowedKeys = Object.keys(DEFAULT_SHARE_SETTINGS)
  const booleanKeys = allowedKeys.filter((key) => key !== 'sharedRecruitmentBatches')
  const keys = Object.keys(raw)
  if (
    keys.length !== allowedKeys.length ||
    !booleanKeys.every((key) => typeof raw[key] === 'boolean') ||
    !Array.isArray(raw.sharedRecruitmentBatches) ||
    !raw.sharedRecruitmentBatches.every((batch) => RECRUITMENT_BATCHES.includes(batch)) ||
    !keys.every((key) => allowedKeys.includes(key))
  ) {
    return null
  }

  return parseShareSettings(raw)
}

export function sanitizeSharedJob(job, settings) {
  const sanitizedJob = {
    id: job.id,
    companyName: job.companyName,
    jobTitle: job.jobTitle,
    city: job.city,
    recruitmentBatch: normalizeRecruitmentBatch(job.recruitmentBatch)
  }

  for (const { setting, field, hiddenValue } of JOB_SHARE_FIELDS) {
    sanitizedJob[field] = settings[setting]
      ? job[field]
      : Array.isArray(hiddenValue) ? [] : hiddenValue
  }

  return sanitizedJob
}

export function filterTasksForSharedJobs(tasks, sharedJobs) {
  const sharedJobIds = new Set(sharedJobs.map((job) => job.id))
  return tasks.filter((task) => !task.jobId || sharedJobIds.has(task.jobId))
}

export function filterJobsForSharedBatches(jobs, sharedRecruitmentBatches) {
  const allowedBatches = new Set(sharedRecruitmentBatches)
  return jobs.filter((job) => allowedBatches.has(normalizeRecruitmentBatch(job.recruitmentBatch)))
}
