'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark'
  try {
    const saved = localStorage.getItem('app-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {}
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
  return 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setTheme(getInitialTheme())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem('app-theme', theme) } catch {}
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [hydrated, theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
