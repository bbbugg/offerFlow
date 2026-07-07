'use client'
import { useState, useRef } from 'react'
import { useApp, canSelectInterviewStatus } from '../store/AppContext'
import JobModal from '../components/JobModal'
import JobDetailModal from '../components/JobDetailModal'
import ConfirmDialog from '../components/ConfirmDialog'
import ModalHeader from '../components/ModalHeader'
import GlowCard from '../components/GlowCard'
import ActionMenuPortal from '../components/ActionMenuPortal'

const COLUMNS = [
  { key: '感兴趣', color: 'border-t-blue-500/40', headerColor: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { key: '准备投递', color: 'border-t-amber-500/40', headerColor: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  { key: '已投递', color: 'border-t-cyan-500/40', headerColor: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  { key: 'OA / 笔试', color: 'border-t-orange-500/40', headerColor: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  { key: '一面中', color: 'border-t-offer-primary/40', headerColor: 'text-offer-accent', bgColor: 'bg-offer-primary/10' },
  { key: '二面中', color: 'border-t-indigo-500/40', headerColor: 'text-indigo-400', bgColor: 'bg-indigo-500/10' },
  { key: '三面中', color: 'border-t-violet-500/40', headerColor: 'text-violet-400', bgColor: 'bg-violet-500/10' },
  { key: '终面中', color: 'border-t-pink-500/40', headerColor: 'text-pink-400', bgColor: 'bg-pink-500/10' },
  { key: 'Offer', color: 'border-t-emerald-500/40', headerColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  { key: '已结束', color: 'border-t-red-500/40', headerColor: 'text-red-400', bgColor: 'bg-red-500/10' },
]

function calcDays(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? diff : 0
}

export default function Board() {
  const { jobs, resumes, addToast, updateJob, deleteJob } = useApp()

  // Drag state
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const [activeColumn, setActiveColumn] = useState(COLUMNS[0].key)
  const dragJobId = useRef(null)
  const columnNavRef = useRef(null)
  const navButtonRefs = useRef({})
  const columnsContainerRef = useRef(null)
  const columnRefs = useRef({})

  // Modal states
  const [detailJobId, setDetailJobId] = useState(null)
  const [editJob, setEditJob] = useState(null)
  const [jobModalOpen, setJobModalOpen] = useState(false)
  const [quickStatus, setQuickStatus] = useState('')

  // More menu state
  const [menuJobId, setMenuJobId] = useState(null)

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteJobId, setDeleteJobId] = useState(null)

  // Follow-up
  const [followUpJob, setFollowUpJob] = useState(null)
  const [followUpText, setFollowUpText] = useState('')

  const resumeMap = {}
  resumes.forEach((r) => { resumeMap[r.id] = r })

  // ---- Drag handlers ----
  const handleDragStart = (e, jobId) => {
    dragJobId.current = jobId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', jobId)
  }

  const handleDragOver = (e, columnKey) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnKey)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault()
    setDragOverColumn(null)
    const jobId = dragJobId.current
    if (!jobId) return
    const job = jobs.find((j) => j.id === jobId)
    if (!job || job.status === targetStatus) return
    if (!canSelectInterviewStatus(job, targetStatus)) {
      addToast('面试状态只能按轮次向后推进', 'error')
      dragJobId.current = null
      return
    }

    const timeline = job.timeline || []
    const patch = {
      status: targetStatus,
      timeline: [...timeline, {
        date: new Date().toISOString().slice(0, 10),
        action: '状态变更',
        detail: `从 ${job.status} 更新为 ${targetStatus}`,
      }],
    }
    patch.endReason = targetStatus === '已结束' ? '手动标记' : ''
    await updateJob(jobId, patch)
    addToast(`状态已更新`, 'success')
    dragJobId.current = null
  }

  const handleDragEnd = () => {
    setDragOverColumn(null)
    dragJobId.current = null
  }

  const keepNavButtonVisible = (columnKey, behavior = 'smooth') => {
    const nav = columnNavRef.current
    const button = navButtonRefs.current[columnKey]
    if (!nav || !button) return

    const navRect = nav.getBoundingClientRect()
    const buttonRect = button.getBoundingClientRect()
    const edgePadding = 8

    if (buttonRect.left < navRect.left + edgePadding) {
      nav.scrollBy({ left: buttonRect.left - navRect.left - edgePadding, behavior })
    } else if (buttonRect.right > navRect.right - edgePadding) {
      nav.scrollBy({ left: buttonRect.right - navRect.right + edgePadding, behavior })
    }
  }

  const jumpToColumn = (columnKey) => {
    const container = columnsContainerRef.current
    const column = columnRefs.current[columnKey]
    if (!container || !column) return

    container.scrollTo({
      left: column.offsetLeft - container.offsetLeft,
      behavior: 'smooth',
    })
    keepNavButtonVisible(columnKey)
    setActiveColumn(columnKey)
  }

  const handleColumnsScroll = () => {
    const container = columnsContainerRef.current
    if (!container) return

    let closestColumn = COLUMNS[0].key
    let closestDistance = Number.POSITIVE_INFINITY
    COLUMNS.forEach(({ key }) => {
      const column = columnRefs.current[key]
      if (!column) return
      const distance = Math.abs(column.offsetLeft - container.offsetLeft - container.scrollLeft)
      if (distance < closestDistance) {
        closestDistance = distance
        closestColumn = key
      }
    })
    setActiveColumn((current) => {
      if (current === closestColumn) return current
      requestAnimationFrame(() => keepNavButtonVisible(closestColumn))
      return closestColumn
    })
  }

  // ---- Actions ----
  const openAddForColumn = (status) => {
    setQuickStatus(status)
    setEditJob(null)
    setJobModalOpen(true)
  }

  const openDetail = (job) => {
    setDetailJobId(job.id)
    setMenuJobId(null)
  }

  const handleEditFromDetail = (job) => {
    setEditJob(job)
    setJobModalOpen(true)
  }

  const openEdit = (job, e) => {
    e.stopPropagation()
    setMenuJobId(null)
    setEditJob(job)
    setJobModalOpen(true)
  }

  const requestDelete = (job, e) => {
    if (e) e.stopPropagation()
    setMenuJobId(null)
    setDeleteJobId(job.id)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    await deleteJob(deleteJobId)
    setConfirmOpen(false)
    setDeleteJobId(null)
    setDetailJobId(null)
    addToast('岗位已删除', 'success')
  }

  const markAs = async (job, newStatus, label, e) => {
    if (e) e.stopPropagation()
    setMenuJobId(null)
    const timeline = job.timeline || []
    await updateJob(job.id, {
      status: newStatus,
      endReason: newStatus === '已结束' ? '手动标记' : '',
      timeline: [...timeline, {
        date: new Date().toISOString().slice(0, 10),
        action: `标记为 ${label}`,
        detail: newStatus === '已结束' ? '' : '',
      }],
    })
    addToast(`已标记为「${label}」`, 'success')
  }

  const openFollowUp = (job, e) => {
    e.stopPropagation()
    setMenuJobId(null)
    setFollowUpJob(job)
    setFollowUpText(job.nextAction || '')
  }

  const saveFollowUp = async () => {
    if (!followUpJob) return
    await updateJob(followUpJob.id, { nextAction: followUpText })
    addToast('下一步行动已更新', 'success')
    setFollowUpJob(null)
    setFollowUpText('')
  }

  const handleJobModalClose = () => {
    setJobModalOpen(false)
    setEditJob(null)
    setQuickStatus('')
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden px-0 py-2 md:px-6 md:py-6">
      {/* Column navigator */}
      <div ref={columnNavRef} className="card-modern mb-3 shrink-0 overflow-x-auto p-2">
        <div className="flex w-max items-center gap-1.5">
          {COLUMNS.map((col) => {
            const isActive = activeColumn === col.key
            return (
              <button
                key={col.key}
                ref={(node) => { navButtonRefs.current[col.key] = node }}
                onClick={() => jumpToColumn(col.key)}
                className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${col.headerColor} ${
                  isActive
                    ? `${col.bgColor} border-current shadow-sm ring-1 ring-current/20`
                    : 'border-theme-border bg-theme-card hover:bg-theme-hover'
                }`}
              >
                {col.key}
              </button>
            )
          })}
        </div>
      </div>

      {/* Kanban Columns */}
      <div
        ref={columnsContainerRef}
        onScroll={handleColumnsScroll}
        className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden pb-3 md:snap-none md:gap-5 md:pb-4"
      >
        {COLUMNS.map((col) => {
          const colJobs = jobs.filter((j) => j.status === col.key)
          const isDragOver = dragOverColumn === col.key

          return (
            <div
              key={col.key}
              ref={(node) => { columnRefs.current[col.key] = node }}
              className="flex min-h-0 w-full min-w-full max-w-full flex-none snap-start flex-col md:w-auto md:min-w-[240px] md:max-w-[300px] md:flex-1"
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className={`min-h-0 overflow-hidden bg-white/[0.02] rounded-2xl border-t-2 ${col.color} ${isDragOver ? 'border-x border-b border-offer-accent bg-offer-primary/5' : 'border-x border-b border-white/10'} flex flex-col flex-1 transition-colors shadow-sm`}>
                {/* Column Header */}
                <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${col.headerColor}`}>{col.key}</span>
                    <span className="inline-flex min-w-6 h-6 items-center justify-center rounded-full border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white/80">{colJobs.length}</span>
                  </div>
                  <button
                    onClick={() => openAddForColumn(col.key)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-offer-muted hover:text-white hover:bg-white/10 transition-all"
                    title={`新增 ${col.key}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* Cards */}
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
                  {colJobs.map((job) => (
                    <Card
                      key={job.id}
                      job={job}
                      resumeMap={resumeMap}
                      menuOpen={menuJobId === job.id}
                      onToggleMenu={(e) => { e.stopPropagation(); setMenuJobId(menuJobId === job.id ? null : job.id) }}
                      onCloseMenu={() => setMenuJobId(null)}
                      onClick={() => openDetail(job)}
                      onDragStart={(e) => handleDragStart(e, job.id)}
                      onDragEnd={handleDragEnd}
                      onEdit={(e) => openEdit(job, e)}
                      onEditFromMenu={(e) => openEdit(job, e)}
                      onDelete={(e) => requestDelete(job, e)}
                      onMarkOffer={(e) => markAs(job, 'Offer', 'Offer', e)}
                      onMarkEnded={(e) => markAs(job, '已结束', '已结束', e)}
                      onFollowUp={(e) => openFollowUp(job, e)}
                    />
                  ))}
                  {colJobs.length === 0 && (
                    <div className="py-8 text-center text-offer-muted text-xs">拖拽或点击 + 添加</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail Modal */}
      <JobDetailModal
        open={!!detailJobId}
        jobId={detailJobId}
        onClose={() => setDetailJobId(null)}
        onEdit={handleEditFromDetail}
        onDelete={(job) => requestDelete(job)}
      />

      {/* Edit/Add Modal */}
      <JobModal
        open={jobModalOpen}
        job={editJob}
        initialStatus={quickStatus || undefined}
        onClose={handleJobModalClose}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={confirmOpen}
        title="确认删除"
        message="确定要删除这个岗位吗？此操作不可恢复。"
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteJobId(null) }}
      />

      {/* Follow-up Dialog */}
      {followUpJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-overlay"
          onMouseDown={(e) => {
            if (e.target !== e.currentTarget) return
            setFollowUpJob(null)
            setFollowUpText('')
          }}
        >
          <div className="modal-panel border rounded-2xl w-full max-w-sm mx-4 shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
            <GlowCard style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }} className="rounded-[22px] w-full max-w-full min-w-0 flex flex-col">
            <div className="bg-white/90 backdrop-blur-xl dark:bg-transparent dark:backdrop-filter-none rounded-[22px] w-full max-w-full min-w-0 flex flex-col">
              <ModalHeader onClose={() => { setFollowUpJob(null); setFollowUpText('') }}>
                <div className="flex flex-col items-center min-w-0">
                  <h2 className="truncate text-base font-semibold leading-normal text-slate-950 dark:text-white">设置下一步行动</h2>
                  <p className="truncate text-sm font-medium leading-normal text-slate-500 dark:text-white/55">{followUpJob.companyName} - {followUpJob.jobTitle}</p>
                </div>
              </ModalHeader>
              <div className="p-5 pb-7">
              <textarea
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                placeholder="例如：准备二面，复习系统设计"
                rows={3}
                className="w-full bg-white border border-slate-200 dark:bg-gray-950 dark:border-white/[0.06] rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-offer-muted focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-colors resize-none mb-4"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setFollowUpJob(null)} className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium">取消</button>
                <button onClick={saveFollowUp} className="btn-gradient px-4 py-2 rounded-xl text-sm font-medium text-white">保存</button>
              </div>
            </div>
            </div>
          </GlowCard>
        </div>
      </div>
      )}
    </div>
  )
}

/* ---- Card Component (stable, outside Board) ---- */
function Card({ job, resumeMap, menuOpen, onToggleMenu, onCloseMenu, onClick, onDragStart, onDragEnd, onEditFromMenu, onDelete, onMarkOffer, onMarkEnded, onFollowUp }) {
  const days = calcDays(job.appliedDate)
  const resumeName = job.resumeId && resumeMap[job.resumeId]
  const actionBtnRef = useRef(null)

  const priorityColor = job.priority === '高' ? 'text-red-700 dark:text-red-300 bg-red-500/[0.15] border-red-500/30'
    : job.priority === '中' ? 'text-amber-700 dark:text-amber-300 bg-amber-500/[0.15] border-amber-500/30'
    : 'text-gray-300 dark:text-white/65 bg-white/[0.04] border-white/10'

  const borderColorMap = {
    '感兴趣': 'border-l-blue-500/60',
    '准备投递': 'border-l-amber-500/60',
    '已投递': 'border-l-cyan-500/60',
    'OA / 笔试': 'border-l-orange-500/60',
    '一面中': 'border-l-offer-primary/60',
    '二面中': 'border-l-indigo-500/60',
    '三面中': 'border-l-violet-500/60',
    '终面中': 'border-l-pink-500/60',
    'Offer': 'border-l-emerald-500/60',
    '已结束': 'border-l-red-500/60',
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`card-modern p-4 cursor-grab active:cursor-grabbing card-hover relative group border-l-2 ${borderColorMap[job.status] || 'border-l-white/10'}`}
    >
      {/* More menu button */}
      <button
        ref={actionBtnRef}
        onClick={onToggleMenu}
        className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-lg text-gray-500 opacity-100 transition-all hover:bg-white/10 hover:text-white dark:text-white/45 md:opacity-0 md:group-hover:opacity-100"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {/* Portal-based Dropdown Menu — escapes card stacking context */}
      <ActionMenuPortal open={menuOpen} anchorRef={actionBtnRef} onClose={onCloseMenu} menuWidth={180} menuHeight={190}>
        <MenuItem icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" label="编辑" onClick={onEditFromMenu} />
        <MenuItem icon="M13 7l5 5m0 0l-5 5m5-5H6" label="设置 Follow-up" onClick={onFollowUp} />
        <MenuItem icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" label="标记为 Offer" onClick={onMarkOffer} />
        <MenuItem icon="M6 18L18 6M6 6l12 12" label="标记为已结束" onClick={onMarkEnded} />
        <div className="border-t border-slate-200 dark:border-white/10 my-1" />
        <MenuItem icon="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" label="删除" onClick={onDelete} danger />
      </ActionMenuPortal>

      {/* Card Content */}
      <p className="text-sm font-semibold text-white truncate pr-5">{job.companyName}</p>
      <p className="text-xs text-offer-muted/80 truncate mt-0.5">{job.jobTitle}</p>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {job.city && <Tag>{job.city}</Tag>}
        {job.channel && <Tag>{job.channel}</Tag>}
        {job.priority && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${priorityColor}`}>{job.priority}</span>}
      </div>

      <div className="flex items-center justify-between mt-2 text-[11px] text-offer-muted">
        <span>{job.appliedDate ? `${calcDays(job.appliedDate)} 天` : '-'}</span>
        {resumeName && <span className="truncate max-w-[80px]" title={resumeName.name}>{resumeName.name}</span>}
      </div>

      {job.nextAction && (
        <p className="text-[11px] text-offer-accent mt-1.5 truncate">{job.nextAction}</p>
      )}
    </div>
  )
}

function Tag({ children }) {
  return <span className="text-[10px] text-offer-muted bg-theme-hover px-1.5 py-0.5 rounded-full">{children}</span>
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(e) }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${danger ? 'text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/10' : 'text-slate-700 hover:bg-slate-100 dark:text-white/80 dark:hover:bg-white/10'}`}
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
      </svg>
      {label}
    </button>
  )
}
