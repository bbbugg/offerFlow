'use client'

import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  { key: 'dashboard', label: '仪表盘', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { key: 'board', label: '看板', icon: 'M12 17V7m0 10a2 2 0 01-2 2H8a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M12 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7' },
  { key: 'positions', label: '岗位', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { key: 'schedule', label: '日程', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'insights', label: '洞察', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'settings', label: '设置', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (key) => pathname === '/' + key || pathname.startsWith('/' + key + '/')

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-theme-border bg-offer-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden">
      <div className="flex h-16 w-full items-center justify-start overflow-x-auto overscroll-x-contain">
        {navItems.map((item) => {
          const active = isActive(item.key)
          return (
            <button
              key={item.key}
              onClick={() => router.push('/' + item.key)}
              className={`bottom-nav-btn flex h-full min-w-[52px] flex-1 flex-col items-center justify-center gap-1 px-1 ${
                active ? 'text-offer-primary' : 'text-offer-muted'
              } cursor-pointer`}
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
  )
}
