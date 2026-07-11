'use client'
import { useState, useMemo } from 'react'
import { useApp } from '../store/AppContext'
import JobModal from '../components/JobModal'
import JobDetailModal from '../components/JobDetailModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatLocalDate, getElapsedLocalDays, parseLocalDate } from '../lib/dateUtils'
import { JOB_STATUSES } from '../lib/jobStatus'

const STATUS_OPTIONS = ['全部', ...JOB_STATUSES]
const PRIORITY_OPTIONS = ['全部', '高', '中', '低']

const statusColors = {
  '感兴趣': 'bg-blue-500/[0.15] text-blue-700 dark:text-blue-300 border-blue-500/30',
  '已投递': 'bg-cyan-500/[0.15] text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  'OA / 笔试': 'bg-orange-500/[0.15] text-orange-700 dark:text-orange-300 border-orange-500/30',
  '一面中': 'bg-offer-primary/[0.15] text-offer-accent border-offer-primary/30',
  '二面中': 'bg-purple-500/[0.15] text-purple-700 dark:text-purple-300 border-purple-500/30',
  '三面中': 'bg-violet-500/[0.15] text-violet-700 dark:text-violet-300 border-violet-500/30',
  '终面中': 'bg-pink-500/[0.15] text-pink-700 dark:text-pink-300 border-pink-500/30',
  'Offer': 'bg-emerald-500/[0.15] text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  '已结束': 'bg-red-500/[0.15] text-red-700 dark:text-red-300 border-red-500/30',
}

function getAppliedDateTimestamp(job) {
  if (!job.appliedDate) return 0
  const timestamp = parseLocalDate(job.appliedDate)?.getTime() ?? 0
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getCreatedTimestamp(job) {
  const timestamp = new Date(job.createdAt || job.updatedAt || 0).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function compareJobRecency(a, b) {
  return getAppliedDateTimestamp(b) - getAppliedDateTimestamp(a)
    || getCreatedTimestamp(b) - getCreatedTimestamp(a)
}

function getMostRecentJob(jobs) {
  return jobs.reduce((best, job) => (compareJobRecency(job, best) < 0 ? job : best), jobs[0])
}

export default function Positions({ jobs: propJobs, isReadOnly = false }) {
  const appContext = useApp()
  const jobs = isReadOnly ? (propJobs || []) : appContext.jobs
  const addToast = isReadOnly ? () => {} : appContext.addToast
  const deleteJob = isReadOnly ? async () => {} : appContext.deleteJob

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [channelFilter, setChannelFilter] = useState('全部')
  const [cityFilter, setCityFilter] = useState('全部')
  const [priorityFilter, setPriorityFilter] = useState('全部')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [detailJobId, setDetailJobId] = useState(null)
  const [hoveredRowId, setHoveredRowId] = useState(null)

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deletingJob, setDeletingJob] = useState(null)

  // Derived filter options
  const channels = useMemo(() => {
    const set = new Set(jobs.map((j) => j.channel).filter(Boolean))
    return ['全部', ...Array.from(set)]
  }, [jobs])

  const cities = useMemo(() => {
    const set = new Set(jobs.map((j) => j.city).filter(Boolean))
    return ['全部', ...Array.from(set)]
  }, [jobs])

  // Filtered & searched jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (statusFilter !== '全部' && j.status !== statusFilter) return false
      if (channelFilter !== '全部' && j.channel !== channelFilter) return false
      if (cityFilter !== '全部' && j.city !== cityFilter) return false
      if (priorityFilter !== '全部' && j.priority !== priorityFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const match = (s) => (s || '').toLowerCase().includes(q)
        if (!match(j.companyName) && !match(j.jobTitle) && !match(j.city) && !match(j.channel)) return false
      }
      return true
    })
  }, [jobs, search, statusFilter, channelFilter, cityFilter, priorityFilter])

  // Group filtered jobs by company for grouped table display
  const groupedJobs = useMemo(() => {
    const groups = {}
    filteredJobs.forEach((job) => {
      const company = job.companyName || '未填写公司'
      if (!groups[company]) groups[company] = []
      groups[company].push(job)
    })
    return Object.entries(groups)
      .sort(([, a], [, b]) => {
        const recency = compareJobRecency(getMostRecentJob(a), getMostRecentJob(b))
        if (recency !== 0) return recency
        return b[0].companyName?.localeCompare(a[0].companyName || '') || 0
      })
      .map(([company, jobs]) => ({
        company,
        jobs: jobs.sort((a, b) => {
          return compareJobRecency(a, b) || a.jobTitle?.localeCompare(b.jobTitle || '') || 0
        }),
      }))
  }, [filteredJobs])

  // Selection helpers
  const allSelected = filteredJobs.length > 0 && selectedIds.size === filteredJobs.length
  const toggleAll = () => {
    if (isReadOnly) return
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredJobs.map((j) => j.id)))
  }
  const toggleOne = (id) => {
    if (isReadOnly) return
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  // CRUD handlers
  const openAdd = () => {
    if (isReadOnly) return
    setEditingJob(null)
    setModalOpen(true)
  }

  const openEdit = (job) => {
    if (isReadOnly) return
    setEditingJob(job)
    setModalOpen(true)
  }

  const openDetail = (jobId) => {
    setDetailJobId(jobId)
  }

  const handleEditFromDetail = (job) => {
    if (isReadOnly) return
    setEditingJob(job)
    setModalOpen(true)
  }

  const handleDeleteFromDetail = (job) => {
    if (isReadOnly) return
    setDeletingJob(job)
    setDeletingId(job.id)
    setConfirmOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingJob(null)
  }

  const requestDelete = (job) => {
    if (isReadOnly) return
    setDeletingJob(job)
    setDeletingId(job.id)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (isReadOnly) return
    await deleteJob(deletingId)
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(deletingId); return n })
    setConfirmOpen(false)
    setDeletingId(null)
    setDeletingJob(null)
    setDetailJobId(null)
    addToast('岗位已删除', 'success')
  }

  const handleBatchDelete = () => {
    if (isReadOnly) return
    if (selectedIds.size === 0) {
      addToast('请先选择要删除的岗位', 'error')
      return
    }
    setDeletingId('batch')
    setConfirmOpen(true)
  }

  const confirmBatchDelete = async () => {
    if (isReadOnly) return
    await deleteJob(Array.from(selectedIds))
    setSelectedIds(new Set())
    setConfirmOpen(false)
    setDeletingId(null)
    setDeletingJob(null)
    addToast(`已删除 ${selectedIds.size} 个岗位`, 'success')
  }

  const handleConfirm = () => {
    if (isReadOnly) return
    if (deletingId === 'batch') confirmBatchDelete()
    else confirmDelete()
  }

  const handleExport = () => {
    if (filteredJobs.length === 0) {
      addToast('没有可导出的数据', 'error')
      return
    }
    const header = '公司,岗位,状态,城市,薪资范围,渠道,投递日期,优先级,联系人,下一步行动'
    const rows = filteredJobs.map((j) =>
      [j.companyName, j.jobTitle, j.status, j.city, j.salaryRange, j.channel, j.appliedDate, j.priority, j.contactName, j.nextAction]
        .map((v) => `"${(v || '').replace(/"/g, '""')}"`).join(',')
    )
    const csv = '﻿' + header + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `岗位库_${formatLocalDate()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    addToast(`已导出 ${filteredJobs.length} 条记录`, 'success')
  }

  // Active filter count
  const activeFilters = (statusFilter !== '全部' ? 1 : 0) + (channelFilter !== '全部' ? 1 : 0) +
    (cityFilter !== '全部' ? 1 : 0) + (priorityFilter !== '全部' ? 1 : 0)

  return (
    <div className="min-w-0 px-0 py-2 md:px-6 md:py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">岗位库</h1>
        <p className="text-sm text-gray-400 dark:text-white/45 mt-1">管理所有投递岗位，共 {jobs.length} 个记录</p>
      </div>

      {/* ===== Toolbar ===== */}
      <div className="card-modern mb-5 min-w-0 space-y-4 p-4 md:p-5">
        {/* Row 1: Search + Add + Batch delete + Export */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative w-full min-w-0 md:max-w-xs md:flex-1">
            <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-white/45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索公司、岗位、城市、渠道..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedIds(new Set()) }}
              className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 !pl-12 pr-4 text-sm text-white placeholder:text-gray-500 dark:placeholder:text-white/45 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="flex w-full gap-2 md:ml-auto md:w-auto">
            {!isReadOnly && (
              <>
                <button onClick={openAdd} className="btn-gradient min-w-0 whitespace-nowrap px-4 py-2.5 text-sm flex-1 md:flex-initial">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  新增岗位
                </button>

                <button
                  onClick={handleBatchDelete}
                  className={`btn-danger min-w-0 whitespace-nowrap px-4 py-2.5 text-sm flex-1 md:flex-initial ${selectedIds.size > 0 ? '' : 'opacity-50'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  删除{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                </button>
              </>
            )}

            <button onClick={handleExport} className="btn-secondary min-w-0 whitespace-nowrap px-4 py-2.5 text-sm flex-1 md:flex-initial flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              导出
            </button>
          </div>
        </div>

        {/* Row 2: Filters */}
        <div className="flex min-w-0 flex-col items-stretch gap-3 md:flex-row md:flex-wrap md:items-center">
          {/* Status filter */}
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  statusFilter === s
                    ? 'border-purple-400/60 bg-purple-600/25 text-white font-semibold shadow-sm shadow-purple-950/20'
                    : 'border-theme-border bg-white dark:bg-white/[0.03] text-slate-700 dark:text-white/65 hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="h-px w-full bg-theme-border md:h-6 md:w-px" />

          {/* Channel dropdown */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="min-h-[40px] w-full min-w-0 cursor-pointer appearance-none rounded-xl border border-theme-border bg-theme-card px-4 py-2.5 text-sm font-medium text-theme-text outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 md:w-auto"
          >
            {channels.map((c) => (
              <option key={c} value={c} className="bg-theme-card text-theme-text">{c === '全部' ? '全部渠道' : c}</option>
            ))}
          </select>

          {/* City dropdown */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="min-h-[40px] w-full min-w-0 cursor-pointer appearance-none rounded-xl border border-theme-border bg-theme-card px-4 py-2.5 text-sm font-medium text-theme-text outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 md:w-auto"
          >
            {cities.map((c) => (
              <option key={c} value={c} className="bg-theme-card text-theme-text">{c === '全部' ? '全部城市' : c}</option>
            ))}
          </select>

          {/* Priority filter */}
          <div className="flex flex-wrap items-center gap-2">
            {PRIORITY_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  priorityFilter === p
                    ? 'border-purple-400/60 bg-purple-600/25 text-white font-semibold shadow-sm shadow-purple-950/20'
                    : 'border-theme-border bg-white dark:bg-white/[0.03] text-slate-700 dark:text-white/65 hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {activeFilters > 0 && (
            <button
              onClick={() => { setStatusFilter('全部'); setChannelFilter('全部'); setCityFilter('全部'); setPriorityFilter('全部'); setSearch('') }}
              className="text-sm text-offer-accent hover:text-white transition-colors ml-1"
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* ===== Table ===== */}
      <div className="card-modern overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                {!isReadOnly && (
                  <th className="w-10 px-4 py-3.5 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-white/20 bg-black/40 accent-offer-primary cursor-pointer"
                    />
                  </th>
                )}
                <th className="min-w-[240px] px-4 py-3.5 text-left text-gray-400 dark:text-white/35 font-medium text-xs uppercase tracking-wider whitespace-nowrap">公司</th>
                <th className="px-4 py-3.5 text-left text-gray-400 dark:text-white/35 font-medium text-xs uppercase tracking-wider whitespace-nowrap">岗位</th>
                <th className="px-4 py-3.5 text-left text-gray-400 dark:text-white/35 font-medium text-xs uppercase tracking-wider whitespace-nowrap">状态</th>
                <th className="px-4 py-3.5 text-left text-gray-400 dark:text-white/35 font-medium text-xs uppercase tracking-wider whitespace-nowrap">城市</th>
                <th className="px-4 py-3.5 text-left text-gray-400 dark:text-white/35 font-medium text-xs uppercase tracking-wider whitespace-nowrap">渠道</th>
                <th className="px-4 py-3.5 text-left text-gray-400 dark:text-white/35 font-medium text-xs uppercase tracking-wider whitespace-nowrap">投递日期</th>
                <th className="px-4 py-3.5 text-left text-gray-400 dark:text-white/35 font-medium text-xs uppercase tracking-wider whitespace-nowrap">等待天数</th>
                <th className="px-4 py-3.5 text-left text-gray-400 dark:text-white/35 font-medium text-xs uppercase tracking-wider whitespace-nowrap">优先级</th>
                <th className="px-4 py-3.5 text-left text-gray-400 dark:text-white/35 font-medium text-xs uppercase tracking-wider whitespace-nowrap min-w-[120px]">下一步行动</th>
                {!isReadOnly && (
                  <th className="px-4 py-3.5 text-left text-gray-400 dark:text-white/35 font-medium text-xs uppercase tracking-wider whitespace-nowrap w-20">操作</th>
                )}
              </tr>
            </thead>
            <tbody>
              {groupedJobs.map(({ company, jobs }) =>
                jobs.map((j, idx) => {
                  const days = getElapsedLocalDays(j.appliedDate)
                  const isCompanyHovered = jobs.some((job) => job.id === hoveredRowId)
                  return (
                    <tr
                      key={j.id}
                      onClick={() => openDetail(j.id)}
                      onMouseEnter={() => setHoveredRowId(j.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                      className={`${idx === jobs.length - 1 ? 'border-b border-white/[0.08]' : 'border-b border-white/10'} ${
                        hoveredRowId === j.id ? 'bg-[#F9FAFC] dark:bg-[#222327]' : 'bg-transparent'
                      } transition-colors duration-150 cursor-pointer group`}
                    >
                      {!isReadOnly && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(j.id)}
                            onChange={() => toggleOne(j.id)}
                            className="w-4 h-4 rounded border-white/20 bg-black/40 accent-offer-primary cursor-pointer"
                          />
                        </td>
                      )}
                      {idx === 0 && (
                        <td
                          rowSpan={jobs.length}
                          className={`align-middle border-r border-white/[0.08] ${
                            isCompanyHovered ? 'bg-[#F2F5F9] dark:bg-[#222327]' : 'bg-white/[0.02]'
                          } p-0 relative transition-colors duration-150`}
                        >
                          {/* 点击与悬浮分流层：将单元格垂直等分 */}
                          <div className="absolute inset-0 flex flex-col z-0">
                            {jobs.map((job) => (
                              <div
                                key={job.id}
                                className="flex-1 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openDetail(job.id)
                                }}
                                onMouseEnter={() => setHoveredRowId(job.id)}
                                onMouseLeave={() => setHoveredRowId(null)}
                              />
                            ))}
                          </div>
                          {/* 展示层：设置 pointer-events-none 让鼠标事件能穿透到下方的分流层 */}
                          <div className="pointer-events-none relative z-10 px-4 py-5 flex items-center h-full">
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 h-12 w-1 rounded-full shrink-0 transition-colors ${
                                isCompanyHovered ? 'bg-purple-300/60' : 'bg-purple-400/50'
                              }`} />
                              <div>
                                <div className="text-[10px] font-semibold text-purple-400/70 uppercase tracking-wider mb-1">公司</div>
                                <div className="text-base font-bold text-theme-text transition-colors">{company}</div>
                                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs text-purple-300 font-medium">
                                  {jobs.length} 个岗位
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{j.jobTitle}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusColors[j.status] || 'bg-white/[0.04] text-gray-300 dark:text-white/65 border-white/10'}`}>{j.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 dark:text-white/65 whitespace-nowrap">{j.city || '-'}</td>
                      <td className="px-4 py-3 text-gray-300 dark:text-white/65 whitespace-nowrap">{j.channel || '-'}</td>
                      <td className="px-4 py-3 text-gray-300 dark:text-white/65 whitespace-nowrap">{j.appliedDate || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {days !== null ? (
                          <span className={`font-medium ${days <= 7 ? 'text-emerald-400' : days <= 14 ? 'text-amber-400' : 'text-gray-300 dark:text-white/65'}`}>{days} 天</span>
                        ) : (
                          <span className="text-gray-500 dark:text-white/45">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                          j.priority === '高' ? 'bg-red-500/[0.15] text-red-700 dark:text-red-300 border-red-500/30' : j.priority === '中' ? 'bg-amber-500/[0.15] text-amber-700 dark:text-amber-300 border-amber-500/30' : 'bg-white/[0.04] text-gray-300 dark:text-white/65 border-white/10'
                        }`}>{j.priority || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 dark:text-white/65 text-xs max-w-[120px] truncate" title={j.nextAction}>{j.nextAction || '-'}</td>
                      {!isReadOnly && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(j)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 dark:text-white/45 hover:text-offer-accent hover:bg-white/[0.06] transition-all"
                              title="编辑"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => requestDelete(j)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 dark:text-white/45 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="删除"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredJobs.length === 0 && (
          <div className="py-16 text-center text-gray-500 dark:text-white/45 text-sm">
            {jobs.length === 0 ? (isReadOnly ? '暂无岗位数据' : '暂无岗位数据，点击"新增岗位"开始添加') : '没有匹配筛选条件的岗位'}
          </div>
        )}

        {/* Footer count */}
        <div className="px-5 py-3 border-t border-white/10 text-xs text-gray-500 dark:text-white/45 flex items-center justify-between">
          <span>显示 {filteredJobs.length} / {jobs.length} 条</span>
          {!isReadOnly && selectedIds.size > 0 && <span>已选 {selectedIds.size} 条</span>}
        </div>
      </div>

      {/* ===== Modals ===== */}
      <JobDetailModal
        open={!!detailJobId}
        jobId={detailJobId}
        onClose={() => setDetailJobId(null)}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
        jobs={jobs}
        isReadOnly={isReadOnly}
      />
      {!isReadOnly && (
        <>
          <JobModal open={modalOpen} job={editingJob} onClose={handleCloseModal} />
          <ConfirmDialog
            open={confirmOpen}
            title="确认删除"
            message={deletingId === 'batch' ? `确定要删除已选的 ${selectedIds.size} 个岗位吗？此操作不可恢复。` : `确定要删除「${deletingJob?.companyName || ''} - ${deletingJob?.jobTitle || ''}」这条岗位记录吗？此操作不可恢复。`}
            onConfirm={handleConfirm}
            onCancel={() => { setConfirmOpen(false); setDeletingId(null); setDeletingJob(null) }}
          />
        </>
      )}
    </div>
  )
}
