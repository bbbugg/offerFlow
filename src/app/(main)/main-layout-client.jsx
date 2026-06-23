'use client'

import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import Toast from '@/components/Toast'
import { useTheme } from '@/store/ThemeContext'
import { useApp } from '@/store/AppContext'

export default function MainLayoutClient({ children }) {
  const { theme } = useTheme()
  const { dataLoading } = useApp()
  const isDark = theme === 'dark'

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
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className={`min-w-0 flex-1 overflow-y-auto p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] transition-colors duration-500 page-content md:p-6 lg:pb-6 ${!isDark ? 'bg-theme-bg' : ''}`}>
          {children}
        </main>
      </div>
      <BottomNav />
      <Toast />
    </div>
  )
}
