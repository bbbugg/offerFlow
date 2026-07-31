const DAY_MS = 24 * 60 * 60 * 1000
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatBeijingDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return `${values.year}-${values.month}-${values.day}`
}

export function normalizeBeijingDate(value) {
  const text = String(value || '').trim()
  if (!text) return ''

  const match = text.match(DATE_ONLY_RE)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(Date.UTC(year, month - 1, day))

    if (
      date.getUTCFullYear() !== year
      || date.getUTCMonth() + 1 !== month
      || date.getUTCDate() !== day
    ) {
      return ''
    }

    return `${match[1]}-${match[2]}-${match[3]}`
  }

  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? '' : formatBeijingDate(date)
}

export function addDaysToDateString(value, days) {
  const normalized = normalizeBeijingDate(value)
  const match = normalized.match(DATE_ONLY_RE)
  if (!match) return ''

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days))
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseBeijingDate(value) {
  const normalized = normalizeBeijingDate(value)
  if (!normalized) return null

  const [year, month, day] = normalized.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function getElapsedBeijingDays(value, now = new Date()) {
  const date = parseBeijingDate(value)
  if (!date) return null

  const today = parseBeijingDate(formatBeijingDate(now))
  const diff = Math.floor((today.getTime() - date.getTime()) / DAY_MS)

  return Math.max(0, diff)
}

export function getBeijingWeekStart(now = new Date()) {
  const today = formatBeijingDate(now)
  const weekday = parseBeijingDate(today).getUTCDay()
  return addDaysToDateString(today, weekday === 0 ? -6 : 1 - weekday)
}

export function getMillisecondsUntilNextBeijingDay(now = new Date()) {
  const tomorrow = addDaysToDateString(formatBeijingDate(now), 1)
  return Math.max(1000, new Date(`${tomorrow}T00:00:00+08:00`).getTime() - now.getTime())
}
