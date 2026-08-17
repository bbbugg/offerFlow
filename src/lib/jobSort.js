function getTimestamp(value) {
  const timestamp = new Date(value || 0).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export function getLatestTimelineTimestamp(job) {
  const timeline = Array.isArray(job?.timeline) ? job.timeline : []
  const latestEvent = timeline.at(-1)
  const createdAtTimestamp = getTimestamp(latestEvent?.createdAt)
  if (createdAtTimestamp) return createdAtTimestamp

  const date = String(latestEvent?.date || '')
  const dateTimestamp = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? getTimestamp(`${date}T00:00:00+08:00`)
    : 0
  if (dateTimestamp) return dateTimestamp

  return getTimestamp(job?.createdAt)
}

export function compareJobsByLatestTimeline(a, b) {
  const timelineOrder = getLatestTimelineTimestamp(b) - getLatestTimelineTimestamp(a)
  if (timelineOrder) return timelineOrder

  const createdAtOrder = getTimestamp(b?.createdAt) - getTimestamp(a?.createdAt)
  if (createdAtOrder) return createdAtOrder

  return String(a?.id || '').localeCompare(String(b?.id || ''))
}
