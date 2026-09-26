'use client'

import { useEffect, useMemo, useRef } from 'react'
import {
  ALL_RECRUITMENT_BATCHES,
  RECRUITMENT_BATCHES,
  normalizeRecruitmentBatch,
} from '../lib/recruitmentBatch'

const EMPTY_JOBS = Object.freeze([])

export default function RecruitmentBatchSwitcher({
  jobs = EMPTY_JOBS,
  batches = RECRUITMENT_BATCHES,
  value,
  onChange,
}) {
  const scrollContainerRef = useRef(null)
  const batchButtonRefs = useRef({})
  const counts = useMemo(() => jobs.reduce((result, job) => {
    const batch = normalizeRecruitmentBatch(job.recruitmentBatch)
    result[batch] = (result[batch] || 0) + 1
    return result
  }, {}), [jobs])
  const batchOptions = useMemo(() => [ALL_RECRUITMENT_BATCHES, ...batches], [batches])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const container = scrollContainerRef.current
      const button = batchButtonRefs.current[value]
      if (!container || !button) return

      const containerRect = container.getBoundingClientRect()
      const buttonRect = button.getBoundingClientRect()
      const edgePadding = 12

      if (buttonRect.left < containerRect.left + edgePadding) {
        container.scrollBy({ left: buttonRect.left - containerRect.left - edgePadding, behavior: 'smooth' })
      } else if (buttonRect.right > containerRect.right - edgePadding) {
        container.scrollBy({ left: buttonRect.right - containerRect.right + edgePadding, behavior: 'smooth' })
      }
    })

    return () => cancelAnimationFrame(frame)
  }, [batchOptions, value])

  return (
    <div className="relative z-10 shrink-0 border-b border-theme-border bg-offer-card/95 shadow-[0_5px_18px_rgba(15,23,42,0.04)] backdrop-blur-xl dark:shadow-[0_5px_18px_rgba(0,0,0,0.12)]">
      <div ref={scrollContainerRef} className="flex h-10 overflow-x-auto overscroll-x-contain px-3 [scrollbar-width:none] sm:px-4 md:px-6 [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex w-max shrink-0 items-center gap-2 py-1">
          <div className="flex shrink-0 items-center gap-2 pr-1 text-xs font-semibold text-theme-muted">
            <svg className="h-4 w-4 text-offer-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 7V4m12 3V4M5 10h14M7 20h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v11a2 2 0 002 2z" />
            </svg>
            投递批次
          </div>
          <div className="flex items-center gap-1.5">
          {batchOptions.map((batch) => {
            const active = value === batch
            const count = batch === ALL_RECRUITMENT_BATCHES ? jobs.length : (counts[batch] || 0)
            return (
              <button
                key={batch}
                ref={(node) => { batchButtonRefs.current[batch] = node }}
                type="button"
                aria-pressed={active}
                aria-label={`查看${batch}批次岗位，共 ${count} 个`}
                onClick={() => onChange(batch)}
                className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all duration-200 sm:px-3.5 ${
                  active
                    ? 'border-[#9A86D8] bg-[#866ECB] text-white shadow-sm shadow-[#5F4AA8]/20 dark:bg-[#866ECC]'
                    : 'border-theme-border bg-theme-card text-theme-secondary hover:border-purple-400/35 hover:bg-theme-hover hover:text-theme-text'
                }`}
              >
                <span>{batch}</span>
                <span className={`min-w-4 rounded-full px-1 text-center text-[10px] leading-4 ${active ? 'bg-black/10 text-white' : 'bg-theme-hover text-slate-700 dark:text-white/80'}`}>
                  {count}
                </span>
              </button>
            )
          })}
          </div>
        </div>
      </div>
    </div>
  )
}
