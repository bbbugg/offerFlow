'use client'

export default function BackToTopButton() {
  function handleClick(event) {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    event.currentTarget.closest('main')?.scrollTo({ top: 0, behavior })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn-secondary fixed right-5 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-10 min-h-11 cursor-pointer gap-1.5 !bg-offer-card px-3 text-sm shadow-md lg:right-8 lg:bottom-6 dark:border-white/[0.18]!"
    >
      <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5h14M12 19V9m-4 4 4-4 4 4" />
      </svg>
      回到顶部
    </button>
  )
}
