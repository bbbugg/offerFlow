'use client'

const menuItems = [
  { key: 'dashboard', label: '仪表盘', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { key: 'board', label: '投递看板', icon: 'M12 17V7m0 10a2 2 0 01-2 2H8a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M12 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7' },
  { key: 'positions', label: '岗位库', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { key: 'schedule', label: '日程待办', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'insights', label: '数据洞察', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'settings', label: '系统设置', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

export default function Sidebar({ activeView, onViewChange }) {
  return (
    <aside className="hidden lg:flex self-start my-4 ml-4 h-[calc(100vh-5.5rem)] w-[300px] rounded-[28px] py-6 px-5 bg-white/80 backdrop-blur-xl border border-slate-200/70 shadow-sm dark:bg-offer-card dark:border-white/[0.06] overflow-visible flex-col shrink-0">
      <nav className="relative z-10 ml-4 flex flex-col gap-2.5 flex-1 pt-3">
        {menuItems.map((item) => {
          const active = activeView === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onViewChange(item.key)}
              aria-current={active ? 'page' : undefined}
              className={`
                group relative flex w-full items-center gap-3 rounded-2xl py-3 pl-5 pr-4 text-[17px] font-medium transition-all duration-200 focus:outline-none focus:ring-0 select-none
                ${active
                  ? 'text-[oklch(0.21_0.04_278)] bg-[oklch(0.21_0.04_278/0.10)] font-semibold scale-[1.02] shadow-sm dark:text-[#A78BFA] dark:bg-[rgba(167,139,250,0.12)]'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100 dark:text-white/68 dark:hover:text-white/80 dark:hover:bg-white/10'
                }
               cursor-pointer`}
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
  )
}
