'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const handlingUnauthorizedRef = useRef(false)

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      handlingUnauthorizedRef.current = false
      setUser(data.user || null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '登录失败')
    handlingUnauthorizedRef.current = false
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '注册失败')
    handlingUnauthorizedRef.current = false
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    const currentUserId = user?.id
    setUser(null)

    if (currentUserId) {
      try {
        localStorage.removeItem(`offerFlow_jobs:${currentUserId}`)
        localStorage.removeItem(`offerFlow_tasks:${currentUserId}`)
      } catch (err) {
        console.error('清除本地数据缓存失败', err)
      }
    }

    const res = await fetch('/api/auth/logout', { method: 'POST' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || '退出失败')
    }
    // Reset SplashScreen so it shows again on next auth visit
    try {
      sessionStorage.removeItem('offerflow_splash_shown')
      delete document.documentElement.dataset.offerflowSplashShown
    } catch (err) {
      console.error('重置欢迎页状态失败', err)
    }
  }, [user])

  const handleUnauthorized = useCallback(() => {
    if (handlingUnauthorizedRef.current) return
    handlingUnauthorizedRef.current = true

    const callbackUrl = `${window.location.pathname}${window.location.search}`
    setUser(null)
    router.replace(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }, [router])

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    handleUnauthorized,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
