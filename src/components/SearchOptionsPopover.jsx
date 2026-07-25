'use client'
import { useState, useRef, useEffect } from 'react'

export const SEARCH_SCOPE_OPTIONS = [
  { id: 'companyName', label: '公司名' },
  { id: 'jobTitle', label: '岗位' },
  { id: 'city', label: '地点' },
  { id: 'channel', label: '渠道' },
]

export const DEFAULT_SEARCH_SCOPE = ['companyName', 'jobTitle', 'city', 'channel']

export default function SearchOptionsPopover({
  searchScope = DEFAULT_SEARCH_SCOPE,
  onScopeChange,
  onClear,
  hasQuery = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef(null)
  const buttonRef = useRef(null)

  // 监听点击外部和 Esc 键关闭
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen])

  const toggleScope = (scopeId) => {
    let newScope
    if (searchScope.includes(scopeId)) {
      newScope = searchScope.filter((id) => id !== scopeId)
    } else {
      newScope = [...searchScope, scopeId]
    }
    if (onScopeChange) {
      onScopeChange(newScope)
    }
  }

  const handleToggleAll = () => {
    if (!onScopeChange) return
    if (isAllSelected) {
      onScopeChange([])
    } else {
      onScopeChange(DEFAULT_SEARCH_SCOPE)
    }
  }

  const isAllSelected = searchScope.length === SEARCH_SCOPE_OPTIONS.length

  return (
    <div className="relative inline-flex items-center">
      {/* 搜索选项触发按钮 */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex min-h-[40px] items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-all duration-200 cursor-pointer select-none ${
          isOpen || searchScope.length < SEARCH_SCOPE_OPTIONS.length
            ? 'border-offer-primary/60 bg-offer-primary/10 text-offer-primary shadow-sm'
            : 'border-theme-border bg-theme-card text-theme-secondary hover:border-offer-primary/40 hover:text-theme-text'
        }`}
        title="搜索选项与范围"
        aria-label="搜索选项"
      >
        {/* 1. SVG 选项图标：< xl 屏宽且非默认选项时隐藏，其它情况显示 */}
        <svg
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            !isAllSelected ? 'hidden xl:block' : 'block'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>

        {/* 2. < xl 屏宽且非默认选项时直接替代 Icon 与文字展示的数字图标 */}
        {!isAllSelected && (
          <span
            style={{ color: '#ffffff' }}
            className="flex xl:hidden h-4.5 w-4.5 items-center justify-center rounded-full bg-offer-primary text-[10px] font-bold !text-white shrink-0"
          >
            {searchScope.length}
          </span>
        )}

        {/* 3. 仅在 xl 及以上超大屏展示 "选项" 文本 */}
        <span className="hidden xl:inline">选项</span>

        {/* 4. xl 及以上超大屏挂在文字右侧的数字 badge */}
        {!isAllSelected && (
          <span
            style={{ color: '#ffffff' }}
            className="hidden xl:flex h-4 w-4 items-center justify-center rounded-full bg-offer-primary text-[10px] font-bold !text-white shrink-0"
          >
            {searchScope.length}
          </span>
        )}
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="fixed left-4 right-4 top-16 z-[60] mt-2 w-auto animate-fade-in origin-top rounded-xl border border-slate-200 dark:border-white/[0.18] bg-white dark:bg-[#1C1F26] p-3.5 shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-64 sm:origin-top-right"
        >
          {/* 面板头部：标题与清空/全选 */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-white/[0.08]">
            <span className="text-xs font-semibold tracking-wider text-slate-500 dark:text-white/60 uppercase">
              搜索选项
            </span>
            <div className="flex items-center gap-2">
              {hasQuery && (
                <button
                  type="button"
                  onClick={() => {
                    if (onClear) onClear()
                  }}
                  className="flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer select-none no-underline"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  清空
                </button>
              )}
              <button
                type="button"
                onClick={handleToggleAll}
                className="rounded-lg border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 px-2 py-1 text-xs font-medium text-offer-primary hover:bg-purple-100 dark:hover:bg-purple-500/20 active:scale-95 transition-all cursor-pointer select-none no-underline"
              >
                {isAllSelected ? '反选' : '全选'}
              </button>
            </div>
          </div>

          {/* 选项内容：勾选按钮（搜索范围） */}
          <div className="pt-2.5">
            <div className="mb-1.5 text-[11px] font-medium text-slate-400 dark:text-white/40">
              匹配范围
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SEARCH_SCOPE_OPTIONS.map((opt) => {
                const checked = searchScope.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleScope(opt.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-150 cursor-pointer select-none text-left ${
                      checked
                        ? 'border-purple-500/50 bg-purple-500/[0.15] text-slate-900 dark:text-white font-semibold shadow-xs'
                        : 'border-slate-200 dark:border-white/[0.12] bg-slate-50/60 dark:bg-white/[0.03] text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      tabIndex={-1}
                      className="pointer-events-none h-3.5 w-3.5 rounded border-slate-300 dark:border-white/20 text-offer-primary focus:ring-0 accent-[#7E57C2]"
                    />
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
