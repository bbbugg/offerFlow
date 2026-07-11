'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Settings() {
  const router = useRouter()
  const [shareToken, setShareToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchShareToken() {
      try {
        const res = await fetch('/api/share/token')
        if (res.ok) {
          const data = await res.json()
          setShareToken(data.shareToken)
        }
      } catch (err) {
        console.error('获取分享状态失败', err)
      } finally {
        setLoading(false)
      }
    }
    fetchShareToken()
  }, [])

  const handleCreateShare = async () => {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch('/api/share/token', { method: 'POST' })
      if (!res.ok) throw new Error('生成分享链接失败')
      const data = await res.json()
      setShareToken(data.shareToken)
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteShare = async () => {
    if (!confirm('确认关闭公开分享链接吗？关闭后以前的链接将彻底失效。')) return
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch('/api/share/token', { method: 'DELETE' })
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
                <div className="space-y-4">
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
                          className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.03] dark:hover:bg-white/10 text-sm font-medium transition-colors shrink-0 flex items-center justify-center min-w-[90px]"
                        >
                          {copied ? '已复制！' : '复制链接'}
                        </button>
                        <button
                          onClick={handleDeleteShare}
                          disabled={actionLoading}
                          className="min-h-[40px] px-4 rounded-xl text-sm font-medium border border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all shrink-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading ? '正在关闭...' : '关闭分享'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-offer-muted flex items-center gap-1.5 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    当前分享链接处于启用状态，任何持有该链接的用户均可免密只读查看。
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    onClick={handleCreateShare}
                    disabled={actionLoading}
                    className="btn-gradient px-6 py-2.5 rounded-xl text-white font-medium text-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

      </div>
    </div>
  )
}
