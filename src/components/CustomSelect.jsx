'use client'
import { useEffect, useRef, useState } from 'react'

function scrollAfterViewportSettles(scroll) {
  const viewport = window.visualViewport
  let settleTimer
  let viewportChanged = false
  let lastHeight = viewport?.height
  let lastOffsetTop = viewport?.offsetTop

  const cleanup = () => {
    clearTimeout(fallbackTimer)
    clearTimeout(settleTimer)
    clearTimeout(maxWaitTimer)
    viewport?.removeEventListener('resize', handleViewportChange)
    viewport?.removeEventListener('scroll', handleViewportChange)
  }

  const handleViewportChange = () => {
    const heightChanged = Math.abs((viewport?.height ?? 0) - (lastHeight ?? 0)) > 0.5
    const offsetChanged = Math.abs((viewport?.offsetTop ?? 0) - (lastOffsetTop ?? 0)) > 0.5
    if (!heightChanged && !offsetChanged) return

    viewportChanged = true
    lastHeight = viewport?.height
    lastOffsetTop = viewport?.offsetTop
    clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      cleanup()
      scroll()
    }, 160)
  }

  viewport?.addEventListener('resize', handleViewportChange)
  viewport?.addEventListener('scroll', handleViewportChange)

  const fallbackTimer = setTimeout(() => {
    if (!viewportChanged) scroll()
  }, 180)

  const maxWaitTimer = setTimeout(() => {
    cleanup()
    if (viewportChanged) scroll()
  }, 1200)

  return cleanup
}

function normalizeOption(option) {
  if (typeof option === 'string') return { value: option, label: option, disabled: false }
  return {
    value: option.value,
    label: option.label ?? option.value,
    disabled: !!option.disabled,
  }
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = '请选择',
  disabled = false,
  className = '',
  searchable = false,
  autoFocusSearch = false,
  searchPlaceholder = '搜索...',
}) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const rootRef = useRef(null)
  const searchInputRef = useRef(null)
  const dropdownRef = useRef(null)
  const viewportScrollCleanupRef = useRef(null)

  const normalized = options.map(normalizeOption)
  const selected = normalized.find((option) => option.value === value)
  const display = selected ? (selected.value === '' ? placeholder : selected.label) : placeholder

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      return
    }

    const scrollToDropdownBottom = () => {
      const target = dropdownRef.current || rootRef.current
      target?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }

    viewportScrollCleanupRef.current?.()
    viewportScrollCleanupRef.current = scrollAfterViewportSettles(scrollToDropdownBottom)

    let focusTimer
    if (searchable && autoFocusSearch) {
      focusTimer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }

    let startX = 0
    let startY = 0
    let isPointerDownOutside = false

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        isPointerDownOutside = true
        startX = event.clientX
        startY = event.clientY
      } else {
        isPointerDownOutside = false
      }
    }

    const handlePointerUp = (event) => {
      if (isPointerDownOutside) {
        const moveX = Math.abs(event.clientX - startX)
        const moveY = Math.abs(event.clientY - startY)
        // 只有当移动距离小于 10px 时才视作真正的“外部点击”，防止滑动面板时误收起下拉框
        if (moveX < 10 && moveY < 10) {
          setOpen(false)
        }
      }
      isPointerDownOutside = false
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(focusTimer)
      viewportScrollCleanupRef.current?.()
      viewportScrollCleanupRef.current = null
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, searchable, autoFocusSearch])

  const selectOption = (option) => {
    if (option.disabled) return
    onChange(option.value)
    setOpen(false)
  }

  const filteredOptions = normalized.filter((option) => {
    if (!searchable || !searchQuery.trim()) return true
    const query = searchQuery.trim().toLowerCase()
    return option.label.toLowerCase().includes(query)
  })

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
        className="cursor-pointer flex min-h-[40px] w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-left text-sm font-medium text-slate-900 outline-none transition-all duration-200 hover:bg-slate-50 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:bg-white/[0.06]"
      >
        <span className="min-w-0 truncate">{display}</span>
        <svg className={`h-4 w-4 shrink-0 text-slate-500 transition-transform dark:text-white/45 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div ref={dropdownRef} className="absolute left-0 right-0 top-full z-[80] mt-1 max-h-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15 dark:border-white/[0.18] dark:bg-[#1C1F26] dark:shadow-[0_8px_32px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)] flex flex-col">
          {searchable && (
            <div className="p-2 border-b border-slate-200 dark:border-white/10 shrink-0">
              <div className="relative flex items-center">
                <svg className="w-4 h-4 absolute left-2.5 text-slate-400 dark:text-white/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    viewportScrollCleanupRef.current?.()
                    viewportScrollCleanupRef.current = scrollAfterViewportSettles(() => {
                      dropdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
                    })
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 border border-transparent focus:border-purple-400/50 focus:bg-white dark:focus:bg-white/[0.1] outline-none transition-all"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSearchQuery('')
                    }}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white/80 p-0.5 text-xs rounded cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="max-h-52 overflow-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 dark:text-white/40 text-center whitespace-nowrap">
                无匹配选项
              </div>
            ) : (
              <div className="min-w-full w-max flex flex-col">
                {filteredOptions.map((option) => {
                  const isSelected = option.value === value
                  return (
                    <button
                      key={option.value || 'empty'}
                      type="button"
                      disabled={option.disabled}
                      onClick={() => selectOption(option)}
                      className={`block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        option.disabled
                          ? 'cursor-not-allowed text-slate-400 dark:text-white/25'
                          : isSelected
                            ? 'cursor-pointer bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-white'
                            : 'cursor-pointer text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-white/80 dark:hover:bg-white/[0.07] dark:hover:text-white'
                      }`}
                    >
                      {option.value === '' ? placeholder : option.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
