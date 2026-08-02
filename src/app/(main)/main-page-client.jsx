'use client'

import { useCallback, useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import Dashboard from '@/views/Dashboard'
import Board from '@/views/Board'
import Positions from '@/views/Positions'
import Schedule from '@/views/Schedule'
import Insights from '@/views/Insights'
import Settings from '@/views/Settings'
import { useTheme } from '@/store/ThemeContext'
import { useApp } from '@/store/AppContext'
import { normalizeMainView } from '@/lib/mainViews'

const VIEW_COMPONENTS = {
  dashboard: Dashboard,
  board: Board,
  positions: Positions,
  schedule: Schedule,
  insights: Insights,
  settings: Settings,
}

function getViewFromUrl() {
  return normalizeMainView(new URLSearchParams(window.location.search).get('view'))
}

export default function MainPageClient({ initialView }) {
  const { theme } = useTheme()
  const { dataLoading } = useApp()
  const [activeView, setActiveView] = useState(initialView)
  const isDark = theme === 'dark'
  const ActiveView = VIEW_COMPONENTS[activeView]

  useEffect(() => {
    const handlePopState = () => setActiveView(getViewFromUrl())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const changeView = useCallback((view) => {
    const nextView = normalizeMainView(view)
    if (nextView === activeView) return

    const url = new URL(window.location.href)
    url.searchParams.set('view', nextView)
    window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`)
    setActiveView(nextView)
  }, [activeView])

  if (dataLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-offer-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-theme-secondary text-sm">加载数据中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-offer-dark transition-colors duration-500 light-ambient-container">
      <div className="app-glow-tl" />
      <div className="app-glow-br" />
      <Navbar onViewChange={changeView} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView={activeView} onViewChange={changeView} />
        <main className={`min-w-0 flex-1 overflow-y-auto p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] transition-colors duration-500 page-content md:p-6 lg:pb-6 ${!isDark ? 'bg-theme-bg' : ''}`}>
          <ActiveView />
        </main>
      </div>
      <BottomNav activeView={activeView} onViewChange={changeView} />
    </div>
  )
}
