import { formatBeijingDate } from './dateUtils'

export const JOB_STATUSES = ['感兴趣', '已投递', 'OA / 笔试', '一面中', '二面中', '三面中', '终面中', 'Offer', '已结束']
export const APPLIED_STATUSES = ['已投递', 'OA / 笔试', '一面中', '二面中', '三面中', '终面中', 'Offer', '已结束']
export const ROUND_ORDER = ['一面', '二面', '三面', '终面']
export const STATUS_ROUND_MAP = { '一面中': '一面', '二面中': '二面', '三面中': '三面', '终面中': '终面' }
export const INTERVIEW_STATUS_ORDER = ['一面中', '二面中', '三面中', '终面中']
const CANCELED_END_REASONS = new Set(['岗位关闭', '自己放弃', '流程太慢', '薪资不匹配', '地点不合适'])

function todayStr() {
  return formatBeijingDate()
}

export function statusImpliesApplied(status) {
  return APPLIED_STATUSES.includes(status)
}

function createInterviewRound(round, status) {
  return {
    id: crypto.randomUUID(),
    round,
    status,
    date: todayStr(),
    result: '',
    notes: '',
  }
}

function getRoundStatusIndex(round) {
  const status = Object.entries(STATUS_ROUND_MAP).find(([, label]) => label === round.round)?.[0]
  return INTERVIEW_STATUS_ORDER.indexOf(status)
}

function sortInterviewRounds(rounds) {
  return rounds.sort((a, b) => {
    const ai = ROUND_ORDER.indexOf(a.round)
    const bi = ROUND_ORDER.indexOf(b.round)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

function getClosedRoundStatus(job) {
  return CANCELED_END_REASONS.has(job?.endReason) ? '已取消' : '未通过'
}

function getNonInterviewRoundStatus(job, targetStatus) {
  if (targetStatus === '已结束') return getClosedRoundStatus(job)
  return '已通过'
}

export function getInterviewProgressIndex(job) {
  const currentIndex = INTERVIEW_STATUS_ORDER.indexOf(job?.status)
  const rounds = Array.isArray(job?.interviewRounds) ? job.interviewRounds : []
  const roundIndex = rounds.reduce((highest, round) => {
    return Math.max(highest, getRoundStatusIndex(round))
  }, -1)

  return Math.max(currentIndex, roundIndex)
}

export function canSelectInterviewStatus(job, targetStatus) {
  const targetIndex = INTERVIEW_STATUS_ORDER.indexOf(targetStatus)
  if (targetIndex === -1) return true

  const progressIndex = getInterviewProgressIndex(job)
  if (targetIndex < progressIndex) return false

  const targetRoundLabel = STATUS_ROUND_MAP[targetStatus]
  const rounds = Array.isArray(job?.interviewRounds) ? job.interviewRounds : []
  const targetRound = rounds.find((round) => round.round === targetRoundLabel)

  if (targetRound && targetRound.status && targetRound.status !== '进行中' && job?.status !== targetStatus) {
    return false
  }

  return targetIndex <= progressIndex + 1
}

export function canSelectJobStatus(job, targetStatus) {
  if (statusImpliesApplied(job?.status) && targetStatus === '感兴趣') return false
  return canSelectInterviewStatus(job, targetStatus)
}

export function syncInterviewRoundsForStatus(job, targetStatus = job?.status) {
  const targetRound = STATUS_ROUND_MAP[targetStatus]
  const rounds = Array.isArray(job?.interviewRounds)
    ? job.interviewRounds.map((round) => ({ ...round }))
    : []

  if (!targetRound) {
    rounds.forEach((round) => {
      if (!round.status || round.status === '进行中') {
        round.status = getNonInterviewRoundStatus(job, targetStatus)
      }
    })
    return sortInterviewRounds(rounds)
  }

  const targetIndex = ROUND_ORDER.indexOf(targetRound)
  for (let i = 0; i <= targetIndex; i++) {
    const roundLabel = ROUND_ORDER[i]
    const expectedStatus = i < targetIndex ? '已通过' : '进行中'
    const existing = rounds.find((round) => round.round === roundLabel)

    if (!existing) {
      rounds.push(createInterviewRound(roundLabel, expectedStatus))
    } else if (i < targetIndex && (!existing.status || existing.status === '进行中')) {
      existing.status = '已通过'
    } else if (i === targetIndex && !existing.status) {
      existing.status = '进行中'
    }
  }

  return sortInterviewRounds(rounds)
}
