'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useTheme } from '../store/ThemeContext'

export default function SplashScreen({ entered, onEnter }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const enteredRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  const [shouldRender, setShouldRender] = useState(() => !entered)

  // Freeze exit class on first entry so theme toggles don't replay the animation
  const exitClassRef = useRef(null)
  if (entered && shouldRender && !exitClassRef.current) {
    exitClassRef.current = isDark
      ? 'splash-exit-dark pointer-events-none'
      : '-translate-y-full opacity-0 pointer-events-none'
  }

  const handleEnter = useCallback(() => {
    if (enteredRef.current) return
    enteredRef.current = true
    onEnter()
  }, [onEnter])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!entered) {
      setShouldRender(true)
      return
    }

    if (!shouldRender) return

    const timeout = window.setTimeout(() => {
      setShouldRender(false)
    }, isDark ? 1400 : 1000)

    return () => window.clearTimeout(timeout)
  }, [entered, isDark, shouldRender])

  useEffect(() => {
    if (entered || !shouldRender) return

    const handleWheel = (e) => {
      if (e.deltaY > 10) handleEnter()
    }
    let touchStartY = 0
    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY
    }
    const handleTouchEnd = (e) => {
      const diff = touchStartY - e.changedTouches[0].clientY
      if (diff > 40) handleEnter()
    }
    window.addEventListener('wheel', handleWheel, { passive: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [entered, handleEnter, shouldRender])

  if (!shouldRender) return null

  return (
    <div
      data-offerflow-splash
      className={`
        fixed inset-0 z-50 flex h-screen w-screen flex-col items-center justify-center overflow-hidden
        bg-cover bg-center bg-no-repeat
        ${isDark ? '' : 'transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]'}
        ${entered
          ? (exitClassRef.current || 'pointer-events-none')
          : 'translate-y-0 opacity-100'
        }
      `}
      style={{ backgroundImage: "url('/images/offerflow-bg.jpg')" }}
    >
      {/* Subtle dark overlay — improves text readability without crushing background detail */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/25 to-black/45" />

      {/* Title group — positioned at 75% from top, fully clear of background art text */}
      <div className="absolute left-1/2 top-[75%] z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center px-6 text-center">
        {/* Main title: white with shadow for readability over dark background */}
        <h1
          className="text-center text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl"
          style={{
            fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
            color: '#FFFFFF',
            textShadow: '0 2px 10px rgba(0,0,30,0.8)',
            transition: 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          OfferFlow
        </h1>

        {/* Subtitle */}
        <p
          className="mt-3 text-center text-base font-normal leading-relaxed text-white/90"
          style={{
            textShadow: '0 1px 6px rgba(0,0,30,0.7)',
            transition: 'opacity 0.8s ease 0.2s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.2s',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          把求职从焦虑，变成可管理的流程。
        </p>
      </div>

      {/* Bottom enter hint */}
      <button
        onClick={handleEnter}
        className="absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 cursor-pointer flex-col items-center text-white/70 transition-colors hover:text-white"
        style={{
          transition: 'opacity 0.8s ease 0.4s',
          opacity: mounted ? 1 : 0,
        }}
      >
        <span className="text-xs font-normal tracking-wide">向下滑动以进入</span>
        <svg
          className="mt-2 h-6 w-6 text-white/75 animate-splash-arrow"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>
    </div>
  )
}
