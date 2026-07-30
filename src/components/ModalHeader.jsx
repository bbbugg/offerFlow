'use client'
export default function ModalHeader({ title, onClose, children }) {
  return (
    <div className="relative flex w-full items-center justify-center px-5 py-4 border-b border-slate-200 dark:border-white/10 shrink-0">
      {children ? (
        <div className="mx-auto flex w-full min-w-0 max-w-[calc(100%-4rem)] items-center justify-center gap-2 text-center">
          {children}
        </div>
      ) : (
        <h2 className="mx-auto max-w-[calc(100%-4rem)] truncate text-center text-lg font-semibold leading-normal text-slate-950 dark:text-white">
          {title}
        </h2>
      )}
      <button
        onClick={onClose}
        className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-all cursor-pointer focus:outline-none focus:ring-0 select-none"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
