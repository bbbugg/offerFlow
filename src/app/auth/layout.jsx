'use client'

import { useState, useEffect, useCallback } from 'react'
import SplashScreen from '@/components/SplashScreen'

export default function AuthLayout({ children }) {
  const [splashDone, setSplashDone] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem('offerflow_splash_shown') === 'true') {
        setSplashDone(true)
      }
    } catch {
    }
  }, [])

  const handleEnter = useCallback(() => {
    sessionStorage.setItem('offerflow_splash_shown', 'true')
    document.documentElement.dataset.offerflowSplashShown = 'true'
    setSplashDone(true)
  }, [])

  return (
    <div
      data-offerflow-auth-shell
      className={`relative min-h-screen flex items-center justify-center bg-offer-dark light-ambient-container ${splashDone ? 'overflow-x-hidden' : 'overflow-hidden'}`}
    >
      {/* Ambient glow — top-left purple */}
      <div className="pointer-events-none fixed -top-[280px] -left-[160px] w-[700px] h-[700px] opacity-80 dark:opacity-100"
        style={{ background: 'radial-gradient(circle, rgba(126,87,194,0.12) 0%, transparent 65%)' }}
      />
      {/* Ambient glow — bottom-right cyan */}
      <div className="pointer-events-none fixed -bottom-[240px] -right-[200px] w-[600px] h-[600px] opacity-60 dark:opacity-100"
        style={{ background: 'radial-gradient(circle, rgba(34,200,230,0.08) 0%, transparent 65%)' }}
      />
      {/* Subtle center ambient */}
      <div className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-30 dark:opacity-40"
        style={{ background: 'radial-gradient(circle, rgba(126,87,194,0.05) 0%, transparent 60%)' }}
      />

      {/* Splash Screen */}
      <SplashScreen entered={splashDone} onEnter={handleEnter} />

      {/* Auth content with fade-in */}
      <div
        data-offerflow-auth-content
        className={`
          w-full transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${splashDone ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
        `}
      >
        {children}
      </div>
    </div>
  )
}
