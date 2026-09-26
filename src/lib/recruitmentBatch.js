export const ALL_RECRUITMENT_BATCHES = '全部'
export const DEFAULT_RECRUITMENT_BATCH = '其他'

export const RECRUITMENT_BATCHES = Object.freeze([
  '实习',
  '提前批',
  '秋招',
  '春招',
  '夏招',
  '补录',
  '社招',
  '日常',
  DEFAULT_RECRUITMENT_BATCH,
])

export function normalizeRecruitmentBatch(value) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return RECRUITMENT_BATCHES.includes(normalized) ? normalized : DEFAULT_RECRUITMENT_BATCH
}

export function normalizeRecruitmentBatchFilter(value) {
  return value === ALL_RECRUITMENT_BATCHES
    ? ALL_RECRUITMENT_BATCHES
    : normalizeRecruitmentBatch(value)
}

export function matchesRecruitmentBatch(job, selectedBatch) {
  return selectedBatch === ALL_RECRUITMENT_BATCHES
    || normalizeRecruitmentBatch(job?.recruitmentBatch) === selectedBatch
}
