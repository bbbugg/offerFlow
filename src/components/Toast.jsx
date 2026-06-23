'use client'
import { useApp } from '../store/AppContext'

export default function Toast() {
  const { toasts } = useApp()

  if (toasts.length === 0) return null

  return (
    <div className="fixed left-4 right-4 top-4 z-50 flex flex-col gap-2 md:left-auto">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-xl text-sm font-medium shadow-lg backdrop-blur-sm animate-slide-in border ${
            t.type === 'success'
              ? 'bg-emerald-600/80 text-white border-emerald-500/20'
              : t.type === 'error'
              ? 'bg-red-600/80 text-white border-red-500/20'
              : 'bg-gray-900/80 text-gray-100 border-white/10'
          }`}
        >
          <div className="flex items-center gap-2">
            {t.type === 'success' && (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {t.type === 'error' && (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {t.message}
          </div>
        </div>
      ))}
    </div>
  )
}
