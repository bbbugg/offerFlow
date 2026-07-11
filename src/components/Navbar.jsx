'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '../store/ThemeContext'
import { useAuth } from '../store/AuthContext'
import { useApp } from '../store/AppContext'
import ConfirmDialog from './ConfirmDialog'
import JobDetailModal from './JobDetailModal'
import JobModal from './JobModal'
import TaskPopover from './TaskPopover'
import TaskModal from './TaskModal'
import { addDaysToDateString, formatBeijingDate } from '../lib/dateUtils'

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const { user, logout } = useAuth()
  const { addToast, tasks, jobs, deleteJob } = useApp()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [detailJobId, setDetailJobId] = useState(null)
  const [editingJob, setEditingJob] = useState(null)
  const [jobModalOpen, setJobModalOpen] = useState(false)
  const [deletingJob, setDeletingJob] = useState(null)
  const searchContainerRef = useRef(null)
  const menuRef = useRef(null)
  const avatarRef = useRef(null)
  const bellRef = useRef(null)

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const lowerQuery = searchQuery.toLowerCase()
    const match = (s) => (s || '').toLowerCase().includes(lowerQuery)
    return jobs.filter((job) =>
      match(job.companyName) || match(job.jobTitle) || match(job.city) || match(job.channel)
    )
  }, [searchQuery, jobs])

  // Close search results on click outside / Escape
  useEffect(() => {
    if (!showSearchResults) return
    const handleClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchResults(false)
      }
    }
    const handleEsc = (e) => {
      if (e.key === 'Escape') setShowSearchResults(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [showSearchResults])

  // Close menu on click outside / Escape
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        avatarRef.current && !avatarRef.current.contains(e.target)
      ) {
        setMenuOpen(false)
      }
    }
    const handleEsc = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [menuOpen])

  const hasUpcomingTasks = useMemo(() => {
    const today = formatBeijingDate()
    const endStr = addDaysToDateString(today, 3)
    return tasks.some((t) => !t.done && t.date >= today && t.date <= endStr)
  }, [tasks])

  // Close popover on click outside / Escape
  useEffect(() => {
    if (!popoverOpen) return
    const handleClick = (e) => {
      if (
        bellRef.current && !bellRef.current.contains(e.target) &&
        (!e.target.closest || !e.target.closest('[data-popover-content]'))
      ) {
        setPopoverOpen(false)
      }
    }
    const handleEsc = (e) => {
      if (e.key === 'Escape') setPopoverOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [popoverOpen])

  const handleSelectSearchResult = (jobId) => {
    setShowSearchResults(false)
    setDetailJobId(jobId)
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    addToast('已退出登录', 'success')
    try {
      await logout()
    } catch {
      // Fallback: navigate even if API fails
    }
    // Brief delay so the toast renders before redirect
    setTimeout(() => router.push('/auth/login'), 400)
  }

  const handleNotification = () => {
    setPopoverOpen((prev) => !prev)
  }

  const openTask = (task) => {
    setPopoverOpen(false)
    setEditingTask(task)
    setTaskModalOpen(true)
  }

  const openJob = (jobId) => {
    setPopoverOpen(false)
    setDetailJobId(jobId)
  }

  const handleEditFromDetail = (job) => {
    setEditingJob(job)
    setJobModalOpen(true)
  }

  const confirmDeleteJob = async () => {
    if (!deletingJob) return
    await deleteJob(deletingJob.id)
    setDetailJobId(null)
    setDeletingJob(null)
    addToast('岗位已删除', 'success')
  }

  const avatarLetter = user?.username ? user.username[0].toUpperCase() : 'U'

  return (
    <header className="h-16 shrink-0 border-b border-theme-border bg-offer-card px-4 md:px-6 flex items-center justify-between">
      {/* Left: Logo */}
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-offer-primary to-offer-accent flex items-center justify-center text-white font-bold text-sm">
          O
        </div>
        <span className="hidden text-lg font-bold tracking-tight text-theme-text min-[400px]:inline">OfferFlow</span>
      </div>

      {/* Center: Search */}
      <div className="mx-2 flex-1 sm:mx-4 sm:max-w-md md:mx-6">
        <div className="relative" ref={searchContainerRef}>
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="搜索公司、岗位、城市、渠道..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowSearchResults(true)
            }}
            onFocus={() => setShowSearchResults(true)}
            className="min-h-[40px] w-full rounded-xl border border-theme-border bg-theme-card py-2 pl-9 pr-3 text-sm text-theme-text placeholder:text-theme-muted outline-none transition-all duration-200 focus:border-offer-primary/70 focus:ring-2 focus:ring-offer-primary/20"
          />

          {/* Search Dropdown */}
          {showSearchResults && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 animate-fade-in origin-top">
              <div className="rounded-xl bg-white dark:bg-[#13151A] border border-slate-200 dark:border-white/[0.08] shadow-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] max-h-[300px] overflow-auto">
                {searchResults.length > 0 ? (
                  <ul className="py-2 min-w-min">
                    {searchResults.map(job => (
                      <li key={job.id}>
                        <button
                          onClick={() => handleSelectSearchResult(job.id)}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors flex flex-col gap-0.5"
                        >
                          <span className="text-sm font-medium text-slate-900 dark:text-white whitespace-nowrap">
                            {job.companyName}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-white/45 whitespace-nowrap">
                            {job.jobTitle}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500 dark:text-white/45 text-center whitespace-nowrap">
                    没有找到匹配的岗位
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <button
          onClick={toggleTheme}
          className="h-9 w-9 rounded-full md:h-10 md:w-10 flex items-center justify-center transition-all duration-200
            dark:border-white/25 dark:bg-white/[0.12] dark:text-white/80 dark:shadow-lg dark:shadow-black/20
            dark:hover:bg-white/[0.2] dark:hover:text-white dark:hover:scale-105
            border-slate-300 bg-white text-slate-600 shadow-sm
            hover:border-slate-400 hover:text-slate-800 hover:shadow-md
            active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
          aria-label={isDark ? '切换亮色模式' : '切换暗色模式'}
          title={isDark ? '切换亮色模式' : '切换暗色模式'}
        >
          {isDark ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <div className="relative">
          <button
            ref={bellRef}
            onClick={handleNotification}
            className="w-9 h-9 rounded-lg bg-theme-icon-btn border border-theme-border flex items-center justify-center text-theme-muted hover:text-theme-text hover:border-offer-primary transition-all relative"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {hasUpcomingTasks && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </button>

          <TaskPopover
            open={popoverOpen}
            tasks={tasks}
            jobs={jobs}
            onTaskClick={openTask}
            onJobClick={openJob}
          />
        </div>

        {/* User avatar + dropdown */}
        <div className="relative">
          <button
            ref={avatarRef}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-offer-primary to-offer-accent flex items-center justify-center text-white text-sm font-medium hover:shadow-lg hover:shadow-offer-primary/30 transition-all cursor-pointer"
          >
            {avatarLetter}
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 top-full mt-2 w-56 z-50 animate-fade-in origin-top-right"
            >
              <div className="rounded-xl bg-white dark:bg-[#13151A] border border-slate-200 dark:border-white/[0.08] shadow-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden">
                {/* User info header */}
                <div className="px-4 py-3.5 border-b border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-offer-primary to-offer-accent flex items-center justify-center text-white text-sm font-medium shrink-0">
                      {avatarLetter}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {user?.username || '用户'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-white/45 truncate mt-0.5">
                        已登录
                      </p>
                    </div>
                  </div>
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-150"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <TaskModal
        open={taskModalOpen}
        task={editingTask}
        onClose={() => { setTaskModalOpen(false); setEditingTask(null) }}
      />
      <JobDetailModal
        open={!!detailJobId}
        jobId={detailJobId}
        onClose={() => setDetailJobId(null)}
        onEdit={handleEditFromDetail}
        onDelete={(job) => setDeletingJob(job)}
      />
      <JobModal
        open={jobModalOpen}
        job={editingJob}
        onClose={() => { setJobModalOpen(false); setEditingJob(null) }}
      />
      <ConfirmDialog
        open={!!deletingJob}
        title="确认删除"
        message={`确定要删除「${deletingJob?.companyName || ''} - ${deletingJob?.jobTitle || ''}」这条岗位记录吗？此操作不可恢复。`}
        onConfirm={confirmDeleteJob}
        onCancel={() => setDeletingJob(null)}
      />
    </header>
  )
}
