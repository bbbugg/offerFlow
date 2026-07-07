export const ROUND_ORDER = ['一面', '二面', '三面', '终面']
export const STATUS_ROUND_MAP = { '一面中': '一面', '二面中': '二面', '三面中': '三面', '终面中': '终面' }
export const INTERVIEW_STATUS_ORDER = ['一面中', '二面中', '三面中', '终面中']

function getRoundStatusIndex(round) {
  const status = Object.entries(STATUS_ROUND_MAP).find(([, label]) => label === round.round)?.[0]
  return INTERVIEW_STATUS_ORDER.indexOf(status)
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

  return targetIndex <= progressIndex + 1
}
