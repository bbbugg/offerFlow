'use client'
import { useState } from 'react'
import { useApp, isAppliedJob } from '../store/AppContext'
import ConfirmDialog from '../components/ConfirmDialog'
import JobDetailModal from '../components/JobDetailModal'
import JobModal from '../components/JobModal'
import TaskModal from '../components/TaskModal'
import { formatBeijingDate } from '../lib/dateUtils'

function parseLocalDate(value) {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'string') {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (dateOnly) {
      const [, year, month, day] = dateOnly
      return new Date(Number(year), Number(month) - 1, Number(day))
    }
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getWeekStart(date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const day = start.getDay()
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day))
  return start
}

export default function Dashboard({ jobs: propJobs, tasks: propTasks, isReadOnly = false }) {
  const appContext = useApp()
  const jobs = isReadOnly ? (propJobs || []) : appContext.jobs
  const tasks = isReadOnly ? (propTasks || []) : appContext.tasks
  const addToast = isReadOnly ? () => {} : appContext.addToast
  const deleteJob = isReadOnly ? async () => {} : appContext.deleteJob

  const [detailJobId, setDetailJobId] = useState(null)
  const [editingJob, setEditingJob] = useState(null)
  const [jobModalOpen, setJobModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [deletingJob, setDeletingJob] = useState(null)

  const activeJobs = jobs.filter((j) => !['已结束', 'Offer'].includes(j.status))
  const interviewJobs = jobs.filter((j) => (j.interviewRounds || []).length > 0 || ['一面中', '二面中', '三面中', '终面中'].includes(j.status))
  const offerJobs = jobs.filter((j) => j.status === 'Offer')
  const weekStart = getWeekStart(new Date())
  const nextWeekStart = new Date(weekStart)
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)
  const weekJobs = jobs.filter((j) => {
    if (!isAppliedJob(j)) return false
    const appliedDate = parseLocalDate(j.appliedDate)
    return appliedDate && appliedDate >= weekStart && appliedDate < nextWeekStart
  })

  const stats = [
    { label: '进行中投递', value: activeJobs.length, color: 'from-offer-primary to-offer-accent' },
    { label: '待面试', value: interviewJobs.length, color: 'from-amber-500 to-orange-500' },
    { label: 'Offer 数', value: offerJobs.length, color: 'from-emerald-500 to-teal-500' },
    { label: '本周投递', value: weekJobs.length, color: 'from-blue-500 to-cyan-500' },
  ]

  // Recent timeline entries across all active jobs
  const timelineEvents = jobs
    .flatMap((j) => (j.timeline || []).map((t) => ({ ...t, company: j.companyName, jobId: j.id })))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6)

  // Upcoming tasks
  const today = formatBeijingDate()
  const todayStart = parseLocalDate(today)
  const upcomingTasks = tasks
    .filter((t) => {
      if (t.done || !t.date) return false
      const taskDate = parseLocalDate(t.date)
      return taskDate && todayStart && taskDate >= todayStart
    })
    .sort((a, b) => `${a.date || ''} ${a.startTime || ''}`.localeCompare(`${b.date || ''} ${b.startTime || ''}`))
    .slice(0, 4)

  const openTask = (task) => {
    if (isReadOnly) return
    setEditingTask(task)
    setTaskModalOpen(true)
  }

  const handleEditFromDetail = (job) => {
    if (isReadOnly) return
    setEditingJob(job)
    setJobModalOpen(true)
  }

  const handleDeleteFromDetail = (job) => {
    if (isReadOnly) return
    setDeletingJob(job)
  }

  const confirmDeleteJob = async () => {
    if (isReadOnly) return
    await deleteJob(deletingJob.id)
    setDetailJobId(null)
    setDeletingJob(null)
    addToast('岗位已删除', 'success')
  }

  return (
    <div className="min-w-0 px-0 py-2 md:px-6 md:py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">仪表盘</h1>
        <p className="text-sm text-gray-400 dark:text-white/45 mt-1">欢迎回来，这是求职总览</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:mb-8 md:grid-cols-4 md:gap-4">
        {stats.map((s, i) => (
          <div key={i} className="card-modern card-hover p-4 md:p-5">
            <p className="mb-2 text-xs text-gray-400 dark:text-white/45 md:text-sm">{s.label}</p>
            <p className={`text-2xl font-bold md:text-3xl bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recent Activity */}
        <div className="card-modern p-4 md:p-5">
          <h2 className="text-base font-semibold text-white mb-4">最近动态</h2>
          <div className="space-y-3">
            {timelineEvents.length > 0 ? timelineEvents.map((e, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-white/10 last:border-0">
                <div className="w-2 h-2 rounded-full bg-offer-primary mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    <button
                      onClick={() => setDetailJobId(e.jobId)}
                      className="cursor-pointer text-offer-accent transition-colors hover:text-offer-primary hover:underline"
                      title={e.company}
                    >
                      {e.company}
                    </button>
                    {' '}{e.action}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-white/45 mt-0.5">{e.date}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 dark:text-white/45 py-4 text-center">暂无动态</p>
            )}
          </div>
        </div>

        {/* Upcoming */}
        <div className="card-modern p-4 md:p-5">
          <h2 className="text-base font-semibold text-white mb-4">待办事项</h2>
          <div className="space-y-3">
            {upcomingTasks.length > 0 ? upcomingTasks.map((t) => {
              const job = t.jobId ? jobs.find((j) => j.id === t.jobId) : null
              return (
                <div key={t.id} className="flex items-start gap-3 border-b border-white/10 pb-3 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                    t.type === '面试' ? 'bg-green-500' : t.type === 'OA / 笔试' || t.type === 'Deadline' ? 'bg-amber-500' : t.type === 'Follow-up' ? 'bg-teal-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    {isReadOnly ? (
                      <div className="block w-full min-w-0 text-left">
                        <p className="truncate text-sm text-white">{t.title}</p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-white/45">{t.date} {t.startTime || ''}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => openTask(t)}
                        className="block w-full min-w-0 cursor-pointer text-left"
                      >
                        <p className="truncate text-sm text-white transition-colors hover:text-offer-accent">{t.title}</p>
                        <p className="mt-0.5 text-xs text-gray-500 transition-colors hover:text-offer-accent dark:text-white/45">{t.date} {t.startTime || ''}</p>
                      </button>
                    )}
                    {job && (
                      <button
                        onClick={() => setDetailJobId(job.id)}
                        className="mt-1 block max-w-full cursor-pointer truncate text-xs text-offer-accent/70 transition-colors hover:text-offer-primary hover:underline"
                        title={`${job.companyName} - ${job.jobTitle}`}
                      >
                        {job.companyName}
                      </button>
                    )}
                  </div>
                </div>
              )
            }) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-white/45">
                <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">暂无待办事项</p>
              </div>
            )}
          </div>
        </div>
      </div>
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
          <JobModal open={jobModalOpen} job={editingJob} onClose={() => { setJobModalOpen(false); setEditingJob(null) }} />
          <TaskModal open={taskModalOpen} task={editingTask} onClose={() => { setTaskModalOpen(false); setEditingTask(null) }} />
          <ConfirmDialog
            open={!!deletingJob}
            title="确认删除"
            message={`确定要删除「${deletingJob?.companyName || ''} - ${deletingJob?.jobTitle || ''}」这条岗位记录吗？此操作不可恢复。`}
            onConfirm={confirmDeleteJob}
            onCancel={() => setDeletingJob(null)}
          />
        </>
      )}
    </div>
  )
}
