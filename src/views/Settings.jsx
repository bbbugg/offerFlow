'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/AuthContext'

export default function Settings() {
  const router = useRouter()
  const { handleUnauthorized } = useAuth()
  const [shareToken, setShareToken] = useState(null)
  const [shareSchedule, setShareSchedule] = useState(true)
  const [shareUsername, setShareUsername] = useState(true)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [scopeLoading, setScopeLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchShareToken() {
      try {
        const res = await fetch('/api/share/token')
        if (res.status === 401) {
          handleUnauthorized()
          return
        }
        if (!res.ok) throw new Error('分享设置加载失败，请刷新页面')
        const data = await res.json()
        setShareToken(data.shareToken)
        if (data.shareSettings) {
          if (typeof data.shareSettings.shareSchedule === 'boolean') setShareSchedule(data.shareSettings.shareSchedule)
          if (typeof data.shareSettings.shareUsername === 'boolean') setShareUsername(data.shareSettings.shareUsername)
        }
      } catch (err) {
        console.error('获取分享状态失败', err)
        setError('分享设置加载失败，请刷新页面')
      } finally {
        setLoading(false)
      }
    }
    fetchShareToken()
  }, [handleUnauthorized])

  const handleCreateShare = async () => {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch('/api/share/token', { method: 'POST' })
      if (res.status === 401) {
        handleUnauthorized()
        return
      }
      if (!res.ok) throw new Error('生成分享链接失败')
      const data = await res.json()
      setShareToken(data.shareToken)
      if (data.shareSettings) {
        if (typeof data.shareSettings.shareSchedule === 'boolean') setShareSchedule(data.shareSettings.shareSchedule)
        if (typeof data.shareSettings.shareUsername === 'boolean') setShareUsername(data.shareSettings.shareUsername)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleScope = async (key, newValue) => {
    if (scopeLoading) return

    setError('')
    const previousSettings = { shareSchedule, shareUsername }
    const nextSettings = { ...previousSettings, [key]: newValue }
    if (key === 'shareSchedule') setShareSchedule(newValue)
    if (key === 'shareUsername') setShareUsername(newValue)
    setScopeLoading(true)

    try {
      const res = await fetch('/api/share/token', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareSettings: nextSettings })
      })
      if (res.status === 401) {
        handleUnauthorized()
        return
      }
      if (!res.ok) throw new Error('更新分享范围失败')
      const data = await res.json()
      if (data.shareSettings) {
        if (typeof data.shareSettings.shareSchedule === 'boolean') setShareSchedule(data.shareSettings.shareSchedule)
        if (typeof data.shareSettings.shareUsername === 'boolean') setShareUsername(data.shareSettings.shareUsername)
      }
    } catch (err) {
      setError(err.message)
      setShareSchedule(previousSettings.shareSchedule)
      setShareUsername(previousSettings.shareUsername)
    } finally {
      setScopeLoading(false)
    }
  }

  const handleDeleteShare = async () => {
    if (!confirm('确认关闭公开分享链接吗？关闭后以前的链接将彻底失效。')) return
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch('/api/share/token', { method: 'DELETE' })
      if (res.status === 401) {
        handleUnauthorized()
        return
      }
      if (!res.ok) throw new Error('关闭分享链接失败')
      setShareToken(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!shareToken) return
    const shareUrl = `${window.location.origin}/share/${shareToken}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败', err)
    }
  }

  const shareUrl = shareToken && typeof window !== 'undefined'
    ? `${window.location.origin}/share/${shareToken}`
    : ''

  return (
    <div className="min-w-0 max-w-3xl py-2 md:py-0">
      <h1 className="text-2xl font-bold text-white mb-1">设置</h1>
      <p className="text-offer-muted text-sm mb-6">管理你的账户和应用设置</p>

      <div className="space-y-6">
        {/* 看板公开分享设置 */}
        <div className="card-modern p-6 md:p-8">
          <h2 className="text-white font-semibold text-lg mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 10.742l4.636-2.318M8.684 13.258l4.636 2.318M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            看板公开分享
          </h2>
          <p className="text-offer-muted text-sm mb-6 max-w-2xl leading-relaxed">
            开启公开分享后，系统会生成一个专用的随机链接。任何人都可以通过该链接<strong>只读查看</strong>你的求职岗位看板，无法进行增删改操作，不需要输入用户名和密码。你可以随时在此关闭（删除）该链接。
          </p>

          {loading ? (
            <div className="flex items-center gap-2 text-offer-muted text-sm py-4">
              <div className="h-4 w-4 animate-spin rounded-full border border-purple-400 border-t-transparent" />
              正在载入配置...
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="text-sm text-red-400 bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              {shareToken ? (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs text-offer-muted block mb-1.5 font-medium">公开分享链接 (有效期无限)</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        readOnly
                        value={shareUrl}
                        className="flex-1 min-h-[40px] rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white select-all outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleCopy}
                          className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.03] dark:hover:bg-white/10 text-sm font-medium transition-colors shrink-0 flex items-center justify-center min-w-[90px] cursor-pointer"
                        >
                          {copied ? '已复制！' : '复制链接'}
                        </button>
                        <button
                          onClick={handleDeleteShare}
                          disabled={actionLoading}
                          className="min-h-[40px] px-4 rounded-xl text-sm font-medium border border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all shrink-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {actionLoading ? '正在关闭...' : '关闭分享'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 分享范围配置 */}
                  <div className="pt-3 border-t border-white/10">
                    <label className="text-xs text-white/70 block mb-3 font-semibold tracking-wide">分享范围设置</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={shareSchedule}
                          disabled={scopeLoading}
                          onChange={(e) => handleToggleScope('shareSchedule', e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-white/20 text-purple-600 focus:ring-purple-500/20 focus:ring-offset-0 bg-white/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">日程待办显示</span>
                          <span className="text-xs text-offer-muted mt-0.5">包含日程待办独立页面及首页仪表盘的待办区域</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={shareUsername}
                          disabled={scopeLoading}
                          onChange={(e) => handleToggleScope('shareUsername', e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-white/20 text-purple-600 focus:ring-purple-500/20 focus:ring-offset-0 bg-white/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">用户名分享</span>
                          <span className="text-xs text-offer-muted mt-0.5">控制公开分享页面右上角的用户名提示语显示</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="text-xs text-offer-muted flex items-center gap-1.5 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    当前分享链接处于启用状态，任何持有该链接的用户均可免密只读查看所选范围。
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    onClick={handleCreateShare}
                    disabled={actionLoading}
                    className="btn-gradient px-6 py-2.5 rounded-xl text-white font-medium text-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                  >
                    {actionLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        正在启用...
                      </>
                    ) : (
                      '开启公开分享'
                    )}
                  </button>
                  <p className="text-xs text-offer-muted mt-3">
                    启用后将会为您的账号生成一个完全随机的 64 位哈希链接，确保极佳的隐私和隔离。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card-modern px-5 py-4">
          <a
            href="https://github.com/bbbugg/offerFlow"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 transition-colors hover:text-purple-600 dark:text-white dark:hover:text-purple-300"
          >
            <svg className="h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.014-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.071 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.349-1.087.635-1.337-2.221-.253-4.555-1.111-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.748-1.025 2.748-1.025.545 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.337 4.687-4.566 4.935.359.309.679.92.679 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.579.688.481A10.001 10.001 0 0 0 12 2Z" />
            </svg>
            GitHub 仓库
            <svg className="h-3.5 w-3.5 text-offer-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h4m0 0v4m0-4-9 9M6 8v10h10" />
            </svg>
          </a>
        </div>

      </div>
    </div>
  )
}
