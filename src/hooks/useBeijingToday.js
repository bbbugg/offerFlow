'use client'

import { useEffect, useState } from 'react'
import { formatBeijingDate, getMillisecondsUntilNextBeijingDay } from '../lib/dateUtils'

export default function useBeijingToday() {
  const [today, setToday] = useState(() => formatBeijingDate())

  useEffect(() => {
    let timeoutId

    const scheduleNextDay = () => {
      setToday(formatBeijingDate())
      timeoutId = window.setTimeout(scheduleNextDay, getMillisecondsUntilNextBeijingDay() + 1000)
    }

    scheduleNextDay()
    return () => window.clearTimeout(timeoutId)
  }, [])

  return today
}
