'use client'

import { useEffect, useState, use } from 'react'
import { useTheme } from '@/store/ThemeContext'
import Dashboard from '@/views/Dashboard'
import Board from '@/views/Board'
import Positions from '@/views/Positions'
import Schedule from '@/views/Schedule'
import Insights from '@/views/Insights'

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
      <div className="flex h-screen w-screen items-center justify-center bg-[#0D0E12] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
          <p className="text-sm text-offer-muted">正在加载公开空间...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0D0E12] text-white p-4">
        <div className="card-modern max-w-md w-full p-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-white font-semibold text-lg mb-2">无法查看面板</h2>
          <p className="text-offer-muted text-sm mb-6">{error}</p>
        </div>
      </div>
    )
  }

  // Active view content mapper
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard jobs={jobs} tasks={tasks} isReadOnly={true} />
      case 'board':
        return <Board jobs={jobs} isReadOnly={true} />
      case 'positions':
        return <Positions jobs={jobs} isReadOnly={true} />
      case 'schedule':
        return <Schedule jobs={jobs} tasks={tasks} isReadOnly={true} />
      case 'insights':
        return <Insights jobs={jobs} isReadOnly={true} />
      default:
        return <Dashboard jobs={jobs} tasks={tasks} isReadOnly={true} />
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-offer-dark transition-colors duration-500 light-ambient-container overflow-hidden">
      {/* Background glow effects */}
      <div className="app-glow-tl" />
      <div className="app-glow-br" />

      {/* Share Topbar Navbar */}
      <header className="h-16 shrink-0 border-b border-theme-border bg-offer-card px-4 md:px-6 flex items-center justify-between relative z-10">
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-offer-primary to-offer-accent flex items-center justify-center text-white font-bold text-sm">
            O
          </div>
          <span className="text-lg font-bold tracking-tight text-theme-text inline-flex items-center gap-2">
            OfferFlow
            <span className="text-[10px] text-purple-400 border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 rounded-full font-medium">只读分享</span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden sm:inline text-xs text-offer-muted">
            正在查看 <strong className="text-theme-text font-semibold">{username}</strong> 的求职进度
          </span>
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200
              dark:border-white/25 dark:bg-white/[0.12] dark:text-white/80 dark:shadow-lg dark:shadow-black/20
              dark:hover:bg-white/[0.2] dark:hover:text-white dark:hover:scale-105
              border-slate-300 bg-white text-slate-600 shadow-sm
              hover:border-slate-400 hover:text-slate-800 hover:shadow-md
              active:scale-95 focus-visible:outline-none"
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
        </div>
      </header>

      {/* Main body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Share Sidebar */}
        <aside className="hidden lg:flex self-start my-4 ml-4 h-[calc(100vh-5.5rem)] w-[300px] rounded-[28px] py-6 px-5 bg-white/80 backdrop-blur-xl border border-slate-200/70 shadow-sm dark:bg-offer-card dark:border-white/[0.06] overflow-visible flex-col shrink-0">
          <nav className="relative z-10 ml-4 flex flex-col gap-2.5 flex-1 pt-3">
            {menuItems.map((item) => {
              const active = activeTab === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`
                    group relative flex w-full items-center gap-3 rounded-2xl py-3 pl-5 pr-4 text-[17px] font-medium transition-all duration-200
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
          {menuItems.map((item) => {
            const active = activeTab === item.key
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`bottom-nav-btn flex h-full min-w-[52px] flex-1 flex-col items-center justify-center gap-1 px-1 ${
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
    </div>
  )
}
