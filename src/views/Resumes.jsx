'use client'
import { useState, useMemo } from 'react'
import { useApp, getResumeStats } from '../store/AppContext'
import { deleteResumeFile, getResumeFile } from '../utils/resumeFileStore'
import ResumeModal from '../components/ResumeModal'
import ResumePreviewModal from '../components/ResumePreviewModal'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Resumes() {
  const { jobs, resumes, addToast, deleteResume } = useApp()

  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('全部')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingResume, setEditingResume] = useState(null)
  const [previewResume, setPreviewResume] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  // Collect all tags
  const allTags = useMemo(() => {
    const set = new Set()
    resumes.forEach((r) => r.tags?.forEach((t) => set.add(t)))
    return ['全部', ...Array.from(set)]
  }, [resumes])

  // Filtered resumes
  const filtered = useMemo(() => {
    return resumes.filter((r) => {
      if (activeTag !== '全部' && !r.tags?.includes(activeTag)) return false
      if (search) {
        const q = search.toLowerCase()
        if (!r.name.toLowerCase().includes(q) && !(r.target || '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [resumes, search, activeTag])

  // Computed stats per resume using centralized helper
  const statsMap = useMemo(() => {
    const map = {}
    resumes.forEach((r) => {
      map[r.id] = getResumeStats(r.id, jobs)
    })
    return map
  }, [jobs, resumes])

  const handleDelete = async () => {
    const id = deletingId
    await deleteResume(id)
    setConfirmOpen(false)
    setDeletingId(null)
    addToast('简历已删除', 'success')
    deleteResumeFile(id).catch((err) => {
      console.error('IndexedDB 文件清理失败:', err)
    })
  }

  const handleDownload = async (resume, e) => {
    e.stopPropagation()
    if (!resume.hasFile) {
      addToast('该简历没有关联文件', 'info')
      return
    }
    try {
      const blob = await getResumeFile(resume.id)
      if (!blob) {
        addToast('文件已丢失，请重新上传', 'error')
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = resume.fileName || `${resume.name}.${resume.format?.toLowerCase() || 'pdf'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      addToast(`「${resume.name}」下载成功`, 'success')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      addToast('文件下载失败，请重试', 'error')
    }
  }

  return (
    <div className="min-w-0 px-0 py-2 md:px-6 md:py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">简历舱</h1>
        <p className="text-sm text-gray-400 dark:text-white/45 mt-1">管理你的简历版本，精准匹配不同岗位</p>
      </div>

      {/* Toolbar */}
      <div className="card-modern mb-5 p-4 md:p-5">
        <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
          {/* Search */}
          <div className="relative w-full min-w-0 md:max-w-xs md:flex-1">
            <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-white/45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" placeholder="搜索简历名称、岗位方向..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 !pl-12 pr-4 text-sm text-white placeholder:text-gray-500 dark:placeholder:text-white/45 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* Tag filter */}
          <div className="flex flex-wrap items-center gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeTag === tag
                    ? 'border-purple-400/60 bg-purple-600/25 text-white font-semibold shadow-sm shadow-purple-950/20'
                    : 'border-white/10 bg-white/[0.03] text-gray-300 dark:text-white/65 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setEditingResume(null); setModalOpen(true) }}
            className="btn-gradient h-10 w-full rounded-lg px-4 text-sm font-medium text-white md:ml-auto md:h-9 md:w-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            上传简历
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => {
          const s = statsMap[r.id] || {}
          return (
            <div
              key={r.id}
              className="card-modern overflow-hidden card-hover group"
            >
              {/* Top section */}
              <div className="p-4 pb-3 md:p-5 md:pb-3">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-14 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 border ${
                    r.format === 'PDF' ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : r.format === 'DOCX' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'bg-green-500/10 text-green-400 border-green-500/20'
                  }`}>
                    {r.format || 'PDF'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold truncate">{r.name}</h3>
                      {r.isDefault && <span className="text-[10px] text-offer-primary bg-offer-primary/10 px-1.5 py-0.5 rounded shrink-0">默认</span>}
                    </div>
                    <p className="text-xs text-offer-muted mt-0.5">{r.version}</p>
                    <p className="text-[11px] text-offer-muted mt-0.5">{r.language} · {r.format} · {r.fileSize || '未知'}</p>
                  </div>
                </div>

                {/* Tags */}
                {r.tags && r.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-2">
                    {r.tags.map((t) => (
                      <span key={t} className="text-[10px] bg-theme-hover text-offer-muted px-1.5 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                )}

                {/* Target & Update */}
                <div className="flex items-center justify-between text-[11px] text-offer-muted">
                  <span className="bg-offer-primary/10 text-offer-accent px-2 py-0.5 rounded-full truncate max-w-[140px]">{r.target || '通用'}</span>
                  <span>{r.updatedAt}</span>
                </div>

                {/* Version note */}
                {r.versionNote && (
                  <p className="text-[11px] text-offer-muted mt-2 leading-relaxed line-clamp-2">{r.versionNote}</p>
                )}
              </div>

              {/* Stats bar */}
              <div className="mx-5 px-3.5 py-2.5 bg-white/[0.02] rounded-xl border border-white/[0.06] grid grid-cols-3 gap-x-2 gap-y-1.5 text-center mb-3">
                <StatValue label="投递" value={s.sentCount || 0} />
                <StatValue label="面试" value={s.interviewPeopleCount || 0} />
                <StatValue label="Offer" value={s.offerCount || 0} />
                <div className="col-span-3 border-t border-white/[0.04] my-0.5" />
                <StatValue label="回复" value={s.replyCount || 0} />
                <StatValue label="面试率" value={s.sentCount > 0 ? `${s.interviewRate}%` : '-'} />
                <StatValue label="Offer率" value={s.sentCount > 0 ? `${s.offerRate}%` : '-'} />
              </div>

              {/* Action buttons */}
              <div className="flex border-t border-white/[0.06] px-1.5 py-1">
                <ActionBtn label="预览" onClick={(e) => { e.stopPropagation(); setPreviewResume(r) }} />
                <ActionBtn label="编辑" onClick={(e) => { e.stopPropagation(); setEditingResume(r); setModalOpen(true) }} />
                <ActionBtn label="下载" onClick={(e) => handleDownload(r, e)} />
                <ActionBtn label="删除" danger onClick={(e) => { e.stopPropagation(); setDeletingId(r.id); setConfirmOpen(true) }} />
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card-modern py-16 text-center text-gray-500 dark:text-white/45 text-sm">
          {resumes.length === 0 ? '暂无简历，点击"上传简历"开始添加' : '没有匹配的简历'}
        </div>
      )}

      {/* Modals */}
      <ResumeModal key={modalOpen ? (editingResume?.id || 'new-resume') : 'closed'} open={modalOpen} resume={editingResume} onClose={() => { setModalOpen(false); setEditingResume(null) }} />
      <ResumePreviewModal open={!!previewResume} resume={previewResume} onClose={() => setPreviewResume(null)} />
      <ConfirmDialog open={confirmOpen} title="确认删除" message="确定要删除这份简历吗？此操作不可恢复。" onConfirm={handleDelete} onCancel={() => { setConfirmOpen(false); setDeletingId(null) }} />
    </div>
  )
}

function StatValue({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-white font-semibold">{value}</p>
      <p className="text-[9px] text-offer-muted">{label}</p>
    </div>
  )
}

function ActionBtn({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 text-xs font-medium transition-all border-r border-white/[0.06] last:border-r-0 hover:bg-white/5 ${danger ? 'text-offer-muted hover:text-red-400' : 'text-offer-muted hover:text-white'}`}
    >
      {label}
    </button>
  )
}
