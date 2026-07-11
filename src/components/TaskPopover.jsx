'use client'
import { useMemo } from 'react'
import { addDaysToDateString, formatBeijingDate } from '../lib/dateUtils'

const TYPE_BG = {
  '面试': 'bg-blue-50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  'OA / 笔试': 'bg-cyan-50 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30',
  'Deadline': 'bg-red-50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
  'Follow-up': 'bg-green-50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30',
  '准备任务': 'bg-purple-50 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
  '其他': 'bg-gray-100 text-gray-700 dark:text-white/45 border-gray-200 dark:border-white/10',
}

function formatShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function TaskPopover({ open, tasks, jobs, onTaskClick, onJobClick }) {
  const jobMap = useMemo(() => {
    const map = {}
    jobs.forEach((j) => { map[j.id] = j })
    return map
  }, [jobs])

  const dayList = useMemo(() => {
    const today = formatBeijingDate()
    const days = []
    for (let i = 0; i <= 3; i++) {
      const dateStr = addDaysToDateString(today, i)
      const label = i === 0 ? '今天' : i === 1 ? '明天' : i === 2 ? '后天' : '3 天后'
      days.push({ dateStr, label })
    }
    return days
  }, [])

  const grouped = useMemo(() => {
    return dayList.map(({ dateStr, label }) => ({
      dateStr,
      label,
      tasks: tasks
        .filter((t) => !t.done && t.date === dateStr)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
    }))
  }, [tasks, dayList])

  const hasAny = grouped.some((g) => g.tasks.length > 0)

  if (!open) return null

  return (
    <div data-popover-content className="fixed left-4 right-4 top-16 z-50 mt-2 w-auto origin-top-right animate-fade-in md:absolute md:left-auto md:right-0 md:top-full md:w-[380px]">
      <div className="rounded-xl bg-white dark:bg-[#13151A] border border-slate-200 dark:border-white/[0.08] shadow-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-offer-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-slate-900 dark:text-white">近期待办</span>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[360px] overflow-y-auto py-1">
          {hasAny ? (
            grouped.map(({ dateStr, label, tasks: dayTasks }) => (
              <div key={dateStr}>
                <div className="px-4 py-2">
                  <span className="text-xs font-medium text-offer-muted">
                    {label} <span className="text-offer-muted/50">{formatShort(dateStr)}</span>
                  </span>
                </div>
                {dayTasks.length > 0 ? (
                  <div className="px-2 pb-1">
                    {dayTasks.map((t) => {
                      const job = t.jobId ? jobMap[t.jobId] : null
                      return (
                        <div
                          key={t.id}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
                        >
                          {/* Status indicator */}
                          <div
                            className={`w-4 h-4 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                              t.done
                                ? 'border-offer-primary bg-offer-primary'
                                : 'border-offer-muted/50'
                            }`}
                          >
                            {t.done && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          {/* Content */}
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => onTaskClick?.(t)}
                          >
                            <p
                              className={`text-sm truncate ${
                                t.done
                                  ? 'text-offer-muted line-through'
                                  : 'text-slate-900 transition-colors hover:text-offer-primary dark:text-white'
                              }`}
                            >
                              {t.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {t.startTime && (
                                <span className="text-xs text-offer-muted">
                                  {t.startTime}{t.endTime ? `-${t.endTime}` : ''}
                                </span>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${TYPE_BG[t.type] || 'bg-gray-100 dark:bg-white/10 text-offer-muted border-gray-200 dark:border-white/10'}`}>
                                {t.type}
                              </span>
                              {job && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onJobClick?.(job.id)
                                  }}
                                  className="max-w-[140px] cursor-pointer truncate text-xs text-offer-accent/70 transition-colors hover:text-offer-primary hover:underline"
                                  title={job.companyName}
                                >
                                  {job.companyName}
                                </button>
                              )}
                            </div>
                            <span className={`text-[10px] mt-0.5 inline-block ${t.done ? 'text-green-500' : 'text-offer-muted/60'}`}>
                              {t.done ? '已完成' : '未开始'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-offer-muted/40 px-4 pb-3">暂无待办</p>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center py-10 px-4">
              <svg className="w-10 h-10 text-offer-muted/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-offer-muted">未来三天暂无日程安排</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
