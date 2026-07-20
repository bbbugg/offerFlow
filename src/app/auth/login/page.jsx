'use client'

import { Suspense } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/store/AuthContext'
import GlowCard from '@/components/GlowCard'

function LoginForm() {
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (tab === 'register') {
        if (password !== confirmPassword) {
          setError('两次密码输入不一致')
          setLoading(false)
          return
        }
        await register(username, password)
      } else {
        await login(username, password)
      }
      router.push(callbackUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (t) => {
    setTab(t)
    setError('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <GlowCard className="w-full max-w-[420px] [--glow-bg:rgba(255,255,255,0.88)] dark:[--glow-bg:rgba(20,20,25,0.65)] bg-white/80 backdrop-blur-xl dark:bg-[rgba(20,20,25,0.65)] border border-slate-200/70 dark:border-white/[0.08] shadow-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-2xl p-8 sm:p-10">
        <div className="glow-content">
          {/* Brand logo */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7E57C2] to-[#9575DE] flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg shadow-purple-500/20">
              O
            </div>
            <h1 className="text-xl font-semibold text-theme-text">欢迎回来</h1>
            <p className="text-sm text-theme-secondary mt-1.5">
              {tab === 'login' ? '登录你的 OfferFlow 账号' : '创建一个新账号开始使用'}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex mb-7 rounded-xl bg-slate-100 dark:bg-white/[0.06] p-1 border border-slate-200/60 dark:border-white/[0.06] relative">
            <div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-white dark:bg-[rgba(126,87,194,0.2)] shadow-sm dark:shadow-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ left: tab === 'login' ? '4px' : 'calc(50% + 0px)' }}
            />
            <button
              onClick={() => switchTab('login')}
              className={`cursor-pointer relative z-10 flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                tab === 'login'
                  ? 'text-[#7E57C2] dark:text-white'
                  : 'text-slate-500 dark:text-white/55 hover:text-slate-700 dark:hover:text-white/80'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`cursor-pointer relative z-10 flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                tab === 'register'
                  ? 'text-[#7E57C2] dark:text-white'
                  : 'text-slate-500 dark:text-white/55 hover:text-slate-700 dark:hover:text-white/80'
              }`}
            >
              注册
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400 flex items-start gap-2.5">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">用户名</label>
              <input
                type="text"
                placeholder="输入你的用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/35 outline-none transition-all duration-200
                  focus:border-[#7E57C2]/50 dark:focus:border-[rgba(167,139,250,0.5)]
                  focus:ring-2 focus:ring-[#7E57C2]/15 dark:focus:ring-[rgba(167,139,250,0.15)]
                  hover:border-slate-300 dark:hover:border-white/20"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">密码</label>
              <input
                type="password"
                placeholder={tab === 'register' ? '至少 6 位密码' : '输入你的密码'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/35 outline-none transition-all duration-200
                  focus:border-[#7E57C2]/50 dark:focus:border-[rgba(167,139,250,0.5)]
                  focus:ring-2 focus:ring-[#7E57C2]/15 dark:focus:ring-[rgba(167,139,250,0.15)]
                  hover:border-slate-300 dark:hover:border-white/20"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>

            {tab === 'register' && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-theme-text mb-1.5">确认密码</label>
                <input
                  type="password"
                  placeholder="再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/35 outline-none transition-all duration-200
                    focus:border-[#7E57C2]/50 dark:focus:border-[rgba(167,139,250,0.5)]
                    focus:ring-2 focus:ring-[#7E57C2]/15 dark:focus:ring-[rgba(167,139,250,0.15)]
                    hover:border-slate-300 dark:hover:border-white/20"
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer relative overflow-hidden group"
            >
              <span className="relative z-10">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    处理中...
                  </span>
                ) : tab === 'login' ? '登录' : '注册'}
              </span>
              {/* Button hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'radial-gradient(200px circle at 50% 50%, rgba(255,255,255,0.15), transparent 60%)' }}
              />
            </button>
          </form>

          {/* Footer hint */}
          <p className="mt-6 text-center text-xs text-theme-muted">
            {tab === 'login' ? (
              <>还没有账号？ <button onClick={() => switchTab('register')} className="text-[#7E57C2] dark:text-[#A78BFA] hover:underline font-medium cursor-pointer">立即注册</button></>
            ) : (
              <>已有账号？ <button onClick={() => switchTab('login')} className="text-[#7E57C2] dark:text-[#A78BFA] hover:underline font-medium cursor-pointer">立即登录</button></>
            )}
          </p>
        </div>
      </GlowCard>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-theme-muted">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">加载中...</span>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
