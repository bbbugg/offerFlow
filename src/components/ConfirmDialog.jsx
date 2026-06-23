'use client'
import { useEffect } from 'react'
import GlowCard from './GlowCard'

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-overlay" onClick={onCancel}>
      <div className="modal-panel danger border rounded-2xl w-full max-w-sm mx-4 shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
        <GlowCard style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, '--glow-color': 'rgba(255,80,80,0.08)' }} className="rounded-[22px]">
          <div className="rounded-[22px] bg-white/90 p-5 backdrop-blur-xl dark:bg-transparent dark:backdrop-filter-none md:p-6">
            <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-2">{title}</h3>
            <p className="text-slate-600 dark:text-white/55 text-sm mb-6">{message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-500 transition-all"
              >
                确认删除
              </button>
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  )
}
