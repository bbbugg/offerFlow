'use client'

import { useEffect, useState, use, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useTheme } from '@/store/ThemeContext'
import Dashboard from '@/views/Dashboard'
import Board from '@/views/Board'
import Positions from '@/views/Positions'
import Schedule from '@/views/Schedule'
import Insights from '@/views/Insights'
import JobDetailModal from '@/components/JobDetailModal'
import SearchOptionsPopover, { DEFAULT_SEARCH_SCOPE } from '@/components/SearchOptionsPopover'

const menuItems = [
  { key: 'dashboard', label: '仪表盘', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { key: 'board', label: '投递看板', icon: 'M12 17V7m0 10a2 2 0 01-2 2H8a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M12 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7' },
  { key: 'positions', label: '岗位库', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { key: 'schedule', label: '日程待办', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'insights', label: '数据洞察', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
]

export default function SharePage({ params: paramsPromise }) {
  const params = use(paramsPromise)
  const token = params.token
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const [activeTab, setActiveTab] = useState('dashboard')
  const [jobs, setJobs] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [username, setUsername] = useState('')
  const [shareSchedule, setShareSchedule] = useState(true)
  const [shareUsername, setShareUsername] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchScope, setSearchScope] = useState(DEFAULT_SEARCH_SCOPE)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [detailJobId, setDetailJobId] = useState(null)

  const searchContainerRef = useRef(null)

  const visibleMenuItems = useMemo(() => {
    if (!shareSchedule) {
      return menuItems.filter(item => item.key !== 'schedule')
    }
    return menuItems
  }, [shareSchedule])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const lowerQuery = searchQuery.toLowerCase()
    const match = (s) => (s || '').toLowerCase().includes(lowerQuery)
    return jobs.filter((job) => {
      const matchCompany = searchScope.includes('companyName') && match(job.companyName)
      const matchJobTitle = searchScope.includes('jobTitle') && match(job.jobTitle)
      const matchCity = searchScope.includes('city') && match(job.city)
      const matchChannel = searchScope.includes('channel') && match(job.channel)
      return matchCompany || matchJobTitle || matchCity || matchChannel
    })
  }, [searchQuery, jobs, searchScope])

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

  const handleSelectSearchResult = (jobId) => {
    setShowSearchResults(false)
    setDetailJobId(jobId)
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/share/board?token=${token}`)
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('分享链接已失效或不存在')
          }
          throw new Error('获取数据失败')
        }
        const data = await res.json()
        setJobs(data.jobs || [])
        setTasks(data.tasks || [])
        setUsername(data.username || '')
        const settings = data.shareSettings || {}
        setShareSchedule(settings.shareSchedule ?? true)
        setShareUsername(settings.shareUsername ?? true)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [token])

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center transition-colors duration-500 bg-slate-50 dark:bg-[#0D0E12] text-slate-900 dark:text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <p className="text-sm text-slate-500 dark:text-offer-muted">正在加载公开空间...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4 transition-colors duration-500 bg-slate-50 dark:bg-[#0D0E12] text-slate-900 dark:text-white">
        <div className="card-modern max-w-md w-full p-8 text-center flex flex-col items-center border transition-all duration-500 border-slate-200 dark:border-white/10 bg-white dark:bg-[#16171d] shadow-lg shadow-slate-100 dark:shadow-none">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="font-semibold text-lg mb-2 text-slate-900 dark:text-white">无法查看面板</h2>
          <p className="text-sm mb-6 text-slate-500 dark:text-offer-muted">{error}</p>
        </div>
      </div>
    )
  }

  // Active view content mapper
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard jobs={jobs} tasks={tasks} isReadOnly={true} shareSchedule={shareSchedule} />
      case 'board':
        return <Board jobs={jobs} isReadOnly={true} />
      case 'positions':
        return <Positions jobs={jobs} isReadOnly={true} />
      case 'schedule':
        return shareSchedule
          ? <Schedule jobs={jobs} tasks={tasks} isReadOnly={true} />
          : <Dashboard jobs={jobs} tasks={tasks} isReadOnly={true} shareSchedule={shareSchedule} />
      case 'insights':
        return <Insights jobs={jobs} isReadOnly={true} />
      default:
        return <Dashboard jobs={jobs} tasks={tasks} isReadOnly={true} shareSchedule={shareSchedule} />
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-offer-dark transition-colors duration-500 light-ambient-container overflow-hidden">
      {/* Background glow effects */}
      <div className="app-glow-tl" />
      <div className="app-glow-br" />

      {/* Share Topbar Navbar */}
      <header className="h-16 shrink-0 border-b border-theme-border bg-offer-card px-3 sm:px-4 md:px-6 flex items-center justify-between relative z-20">
        <Link href="/" className="flex shrink-0 items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-offer-primary to-offer-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
            O
          </div>
          <span className="hidden text-lg font-bold tracking-tight text-theme-text md:inline-flex items-center gap-2">
            OfferFlow
            <span className="text-[10px] text-purple-400 border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 rounded-full font-medium">只读分享</span>
          </span>
          <span className="text-[10px] text-purple-400 border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 rounded-full font-medium md:hidden">只读</span>
        </Link>

        {/* 中间：搜索栏 */}
        <div className="mx-1.5 flex-1 sm:mx-4 sm:max-w-md md:mx-6 flex items-center gap-1.5 sm:gap-2">
          <div className="relative flex-1" ref={searchContainerRef}>
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
              placeholder="搜索公司、岗位、城市..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSearchResults(true)
              }}
              onFocus={() => setShowSearchResults(true)}
              className="min-h-[38px] sm:min-h-[40px] w-full rounded-xl border border-theme-border bg-theme-card py-1.5 sm:py-2 pl-8 sm:pl-9 pr-2.5 sm:pr-3 text-xs sm:text-sm text-theme-text placeholder:text-theme-muted outline-none transition-all duration-200 focus:border-offer-primary/70 focus:ring-2 focus:ring-offer-primary/20"
            />

            {/* 搜索下拉框 */}
            {showSearchResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 animate-fade-in origin-top">
                <div className="rounded-xl bg-white dark:bg-[#1C1F26] border border-slate-200 dark:border-white/[0.18] shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)] max-h-[300px] overflow-auto">
                  {searchResults.length > 0 ? (
                    <ul className="py-2 min-w-min">
                      {searchResults.map(job => (
                        <li key={job.id}>
                          <button
                            onClick={() => handleSelectSearchResult(job.id)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors flex flex-col gap-0.5 cursor-pointer"
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

          {/* 搜索选项按钮与弹出面板 */}
          <SearchOptionsPopover
            searchScope={searchScope}
            onScopeChange={setSearchScope}
            onClear={() => setSearchQuery('')}
            hasQuery={!!searchQuery.trim()}
          />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {shareUsername && username && (
            <span className="hidden sm:inline text-xs text-offer-muted">
              正在查看 <strong className="text-theme-text font-semibold">{username}</strong> 的求职进度
            </span>
          )}
          <button
            onClick={toggleTheme}
            className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
              dark:border-white/25 dark:bg-white/[0.12] dark:text-white/80 dark:shadow-lg dark:shadow-black/20
              dark:hover:bg-white/[0.2] dark:hover:text-white dark:hover:scale-105
              border-slate-300 bg-white text-slate-600 shadow-sm
              hover:border-slate-400 hover:text-slate-800 hover:shadow-md
              active:scale-95 focus-visible:outline-none"
            aria-label={isDark ? '切换亮色模式' : '切换暗色模式'}
            title={isDark ? '切换亮色模式' : '切换暗色模式'}
          >
            {isDark ? (
              <svg className="h-4.5 w-4.5 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-4.5 w-4.5 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Share Sidebar */}
        <aside className="hidden lg:flex self-start my-4 ml-4 h-[calc(100vh-5.5rem)] w-[300px] rounded-[28px] py-6 px-5 bg-white/80 backdrop-blur-xl border border-slate-200/70 shadow-sm dark:bg-offer-card dark:border-white/[0.06] overflow-visible flex-col shrink-0">
          <nav className="relative z-10 ml-4 flex flex-col gap-2.5 flex-1 pt-3">
            {visibleMenuItems.map((item) => {
              const active = activeTab === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={` cursor-pointer group relative flex w-full items-center gap-3 rounded-2xl py-3 pl-5 pr-4 text-[17px] font-medium transition-all duration-200
                    ${active
                      ? 'text-[oklch(0.21_0.04_278)] bg-[oklch(0.21_0.04_278/0.10)] font-semibold scale-[1.02] shadow-sm dark:text-[#A78BFA] dark:bg-[rgba(167,139,250,0.12)]'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100 dark:text-white/68 dark:hover:text-white/80 dark:hover:bg-white/10'
                    }
                  `}
                >
                  {active && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 w-[4px] h-6 rounded-full bg-[oklch(0.21_0.04_278)] dark:bg-[#A78BFA]" />
                  )}

                  <svg
                    className={`relative z-10 w-5 h-5 shrink-0 transition-colors duration-200 ${
                      active
                        ? 'text-[oklch(0.21_0.04_278)] dark:text-[#A78BFA]'
                        : 'text-slate-400 group-hover:text-slate-700 dark:text-white/55 dark:group-hover:text-white'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                  <span className="relative z-10 truncate">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Dynamic Content Frame */}
        <main className={`min-w-0 flex-1 overflow-y-auto p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] transition-colors duration-500 page-content md:p-6 lg:pb-6 ${!isDark ? 'bg-theme-bg' : ''}`}>
          {renderContent()}
        </main>
      </div>

      {/* Share Bottom Navbar for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-theme-border bg-offer-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden">
        <div className="flex h-16 w-full items-center justify-start overflow-x-auto overscroll-x-contain">
          {visibleMenuItems.map((item) => {
            const active = activeTab === item.key
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`cursor-pointer bottom-nav-btn flex h-full min-w-[52px] flex-1 flex-col items-center justify-center gap-1 px-1 ${
                  active ? 'text-offer-primary' : 'text-offer-muted'
                }`}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* 用于搜索结果展示的岗位详情模态框 */}
      <JobDetailModal
        open={!!detailJobId}
        jobId={detailJobId}
        onClose={() => setDetailJobId(null)}
        jobs={jobs}
        isReadOnly={true}
      />
    </div>
  )
}
