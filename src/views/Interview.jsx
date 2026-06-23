'use client'
import { useState, useMemo } from 'react'
import { useApp } from '../store/AppContext'
import ReviewModal from '../components/ReviewModal'
import ReviewDetailModal from '../components/ReviewDetailModal'
import ConfirmDialog from '../components/ConfirmDialog'
import TrendReportModal from '../components/TrendReportModal'

const RESULT_STYLE = {
  '通过': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  '待定': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  '未通过': 'text-red-400 bg-red-500/10 border-red-500/20',
}

export default function Interview() {
  const { reviews, setReviews, deleteReview, addToast } = useApp()

  const [search, setSearch] = useState('')
  const [resultFilter, setResultFilter] = useState('全部')
  const [tagFilter, setTagFilter] = useState('全部')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [detailReview, setDetailReview] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingReview, setDeletingReview] = useState(null)
  const [trendOpen, setTrendOpen] = useState(false)

  // Collect all unique tags from reviews
  const allTags = useMemo(() => {
    const set = new Set()
    reviews.forEach((r) => (r.tags || []).forEach((t) => set.add(t)))
    return ['全部', ...Array.from(set)]
  }, [reviews])

  // Filtered reviews
  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (resultFilter !== '全部' && r.result !== resultFilter) return false
      if (tagFilter !== '全部' && !(r.tags || []).includes(tagFilter)) return false
      if (search) {
        const q = search.toLowerCase()
        if (!r.companyName.toLowerCase().includes(q) &&
            !r.jobTitle.toLowerCase().includes(q) &&
            !(r.round || '').toLowerCase().includes(q) &&
            !(r.note || '').toLowerCase().includes(q)) return false
      }
      return true
    }).sort((a, b) => b.interviewDate.localeCompare(a.interviewDate))
  }, [reviews, search, resultFilter, tagFilter])

  const handleEdit = (review) => {
    setEditingReview(review)
    setModalOpen(true)
  }

  const handleNew = () => {
    setEditingReview(null)
    setModalOpen(true)
  }

  const handleDetailEdit = (review) => {
    setEditingReview(review)
    setModalOpen(true)
  }

  const handleDelete = () => {
    if (!deletingReview) return
    deleteReview(deletingReview.id)
    setConfirmOpen(false)
    setDeletingReview(null)
    addToast('复盘已删除', 'success')
  }

  return (
    <div className="min-w-0 px-0 py-2 md:px-6 md:py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">面试复盘</h1>
        <p className="text-sm text-gray-400 dark:text-white/45 mt-1">记录和回顾每场面试，持续进步</p>
      </div>

      {/* Toolbar */}
      <div className="card-modern mb-5 p-4 md:p-5">
        <div className="flex flex-col items-stretch gap-3 md:flex-row md:flex-wrap md:items-center">
          {/* Search */}
          <div className="relative w-full min-w-0 md:max-w-xs md:flex-1">
            <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-white/45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="搜索公司、岗位、关键词..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 !pl-12 pr-4 text-sm text-white placeholder:text-gray-500 dark:placeholder:text-white/45 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
          </div>

          {/* Result filter */}
          <div className="flex flex-wrap items-center gap-2">
            {['全部', '通过', '待定', '未通过'].map((f) => (
              <button key={f} onClick={() => setResultFilter(f)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  resultFilter === f
                    ? f === '通过' ? 'border-emerald-400/60 bg-emerald-600/25 text-white font-semibold shadow-sm shadow-emerald-950/20'
                    : f === '待定' ? 'border-amber-400/60 bg-amber-600/25 text-white font-semibold shadow-sm shadow-amber-950/20'
                    : f === '未通过' ? 'border-red-400/60 bg-red-600/25 text-white font-semibold shadow-sm shadow-red-950/20'
                    : 'border-purple-400/60 bg-purple-600/25 text-white font-semibold shadow-sm shadow-purple-950/20'
                  : 'border-white/10 bg-white/[0.03] text-gray-300 dark:text-white/65 hover:bg-white/[0.07] hover:text-white'
                }`}>{f}</button>
            ))}
          </div>

          {/* Tag filter */}
          <div className="flex flex-wrap items-center gap-2">
            {allTags.map((tag) => (
              <button key={tag} onClick={() => setTagFilter(tag)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  tagFilter === tag
                    ? 'border-purple-400/60 bg-purple-600/25 text-white font-semibold shadow-sm shadow-purple-950/20'
                    : 'border-white/10 bg-white/[0.03] text-gray-300 dark:text-white/65 hover:bg-white/[0.07] hover:text-white'
                }`}>{tag}</button>
            ))}
          </div>

          <button onClick={() => setTrendOpen(true)}
            className="btn-secondary h-10 w-full rounded-lg border border-purple-400/30 px-4 text-sm font-medium text-purple-300 transition-all hover:border-purple-400/60 hover:text-white md:h-9 md:w-auto">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            生成趋势报告
          </button>

          <button onClick={handleNew}
            className="btn-gradient h-10 w-full rounded-lg px-4 text-sm font-medium text-white md:ml-auto md:h-9 md:w-auto">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建复盘
          </button>
        </div>
      </div>

      {/* Weakness Tag Cloud */}
      <TagCloud reviews={reviews} tagFilter={tagFilter} setTagFilter={setTagFilter} />

      {/* Card Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((r) => {
          const improveCount = (r.improvements || []).filter((i) => i.action).length
          const attachCount = (r.attachments || []).length
          const tags = r.tags || []
          return (
            <div key={r.id}
              className="card-modern card-hover group flex min-h-[220px] flex-col overflow-visible px-4 pb-5 pt-4 md:px-6 md:pb-7 md:pt-6">
              {/* Top */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-lg font-semibold leading-7 text-white">{r.companyName}</h3>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium border ${RESULT_STYLE[r.result] || 'text-offer-muted bg-black/40 border-white/10'}`}>{r.result}</span>
                    </div>
                    <p className="line-clamp-1 text-sm leading-6 text-offer-muted">{r.jobTitle}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-offer-muted">
                  <span className="bg-theme-hover px-2 py-0.5 rounded">{r.round}</span>
                  <span className="bg-theme-hover px-2 py-0.5 rounded">{r.interviewType || '技术面'}</span>
                  <span>{r.interviewDate}</span>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className={`w-3.5 h-3.5 ${s <= (r.rating || 0) ? 'text-amber-400' : 'text-offer-muted/20'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.slice(0, 4).map((t) => (
                      <span key={t} className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full">{t}</span>
                    ))}
                    {tags.length > 4 && <span className="text-[10px] text-offer-muted">+{tags.length - 4}</span>}
                  </div>
                )}

                {/* Note preview */}
                {r.note && (
                  <p className="line-clamp-2 text-sm leading-6 text-offer-muted/70">{r.note}</p>
                )}
              </div>

              {/* Bottom stats + action */}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4 md:flex-nowrap">
                <div className="flex items-center gap-3 text-sm text-offer-muted/80">
                  <span className="flex items-center gap-1"><span className="font-semibold text-theme-secondary">{(r.questions || []).length}</span> 题</span>
                  <span className="w-px h-3.5 bg-white/10" />
                  <span>{improveCount > 0 ? `${improveCount} 项改进` : '无改进'}</span>
                  {attachCount > 0 && <><span className="w-px h-3.5 bg-white/10" /><span>附件 {attachCount}</span></>}
                </div>
                <button onClick={() => setDetailReview(r)}
                  className="text-sm text-offer-accent hover:text-white transition-colors font-medium">查看详情</button>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card-modern py-16 text-center text-gray-500 dark:text-white/45 text-sm">
          {reviews.length === 0 ? '暂无面试复盘记录，点击"新建复盘"开始记录' : '没有匹配的复盘记录'}
        </div>
      )}

      {/* Modals */}
      <ReviewModal open={modalOpen} review={editingReview} onClose={() => { setModalOpen(false); setEditingReview(null) }} />
      <ReviewDetailModal open={!!detailReview} review={detailReview} onClose={() => setDetailReview(null)}
        onEdit={handleDetailEdit} onDelete={(r) => { setDetailReview(null); setDeletingReview(r); setConfirmOpen(true) }} />
      <ConfirmDialog open={confirmOpen} title="确认删除" message="确定要删除这个复盘记录吗？此操作不可恢复。"
        onConfirm={handleDelete} onCancel={() => { setConfirmOpen(false); setDeletingReview(null) }} />
      <TrendReportModal open={trendOpen} onClose={() => setTrendOpen(false)} />
    </div>
  )
}

/* ===== Weakness Tag Cloud ===== */

const TAG_COLORS = [
  { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/25', hover: 'hover:bg-rose-500/25' },
  { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/25', hover: 'hover:bg-amber-500/25' },
  { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/25', hover: 'hover:bg-sky-500/25' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/25', hover: 'hover:bg-emerald-500/25' },
  { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/25', hover: 'hover:bg-violet-500/25' },
]

function TagCloud({ reviews, tagFilter, setTagFilter }) {
  const tagFreq = useMemo(() => {
    const freq = {}
    reviews.forEach((r) => (r.negativeTags || r.tags || []).forEach((t) => { freq[t] = (freq[t] || 0) + 1 }))
    return Object.entries(freq).sort((a, b) => b[1] - a[1])
  }, [reviews])

  if (tagFreq.length === 0) return null

  const maxFreq = tagFreq[0][1]

  return (
    <div className="card-modern p-4 mb-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 md:flex-nowrap">
        <h3 className="text-xs font-semibold text-offer-muted uppercase tracking-wider">弱项标签分析</h3>
        <span className="text-[10px] text-offer-muted/50 bg-white/[0.03] px-2 py-0.5 rounded-full">
          {tagFreq.length} 个弱项标签 · {reviews.filter((r) => (r.negativeTags || r.tags || []).length > 0).length} 场面试
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {tagFreq.map(([tag, count], idx) => {
          const level = Math.min(Math.floor((count / maxFreq) * (TAG_COLORS.length - 1)), TAG_COLORS.length - 1)
          const c = TAG_COLORS[idx % TAG_COLORS.length]
          const isActive = tagFilter === tag
          const size = count === maxFreq && maxFreq > 1 ? 'text-sm px-3.5 py-1.5' : 'text-xs px-2.5 py-1'
          return (
            <button
              key={tag}
              onClick={() => setTagFilter(isActive ? '全部' : tag)}
              className={`
                inline-flex items-center gap-1.5 rounded-full border font-medium transition-all duration-200 ${size}
                ${isActive
                  ? 'border-purple-400/60 bg-purple-600/25 text-white shadow-sm shadow-purple-950/20 ring-1 ring-purple-400/40'
                  : `${c.bg} ${c.text} ${c.border} ${c.hover} hover:text-white`
                }
              `}
            >
              {tag}
              <span className={`text-[10px] ${isActive ? 'text-purple-200' : 'opacity-60'}`}>{count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
