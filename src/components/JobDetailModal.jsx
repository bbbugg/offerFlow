'use client'
import { useState, useEffect } from 'react'
import { useApp, canSelectJobStatus } from '../store/AppContext'
import ModalHeader from './ModalHeader'
import GlowCard from './GlowCard'
import CustomSelect from './CustomSelect'
import ConfirmDialog from './ConfirmDialog'
import { formatBeijingDate, getElapsedBeijingDays } from '../lib/dateUtils'
import { isFinalJobStatus, JOB_STATUS_TRANSITION_ERROR, statusImpliesApplied } from '../lib/jobStatus'
import { getJobTimelineSnapshot, getLatestTimelineUndoConflicts, hasLatestTimelineUndoSnapshot } from '../lib/timelineUndo'
import { JOB_STATUS_ACTION_BADGE, JOB_STATUS_BADGE, NEUTRAL_BADGE, ROUND_STATUS_BADGE } from '../lib/badgeStyles'

const STATUS_ACTIONS = [
  { status: '已投递', label: '已投递', color: JOB_STATUS_ACTION_BADGE['已投递'] },
  { status: 'OA / 笔试', label: '收到 OA', color: JOB_STATUS_ACTION_BADGE['OA / 笔试'] },
  { status: '一面中', label: '一面中', color: JOB_STATUS_ACTION_BADGE['一面中'] },
  { status: '二面中', label: '二面中', color: JOB_STATUS_ACTION_BADGE['二面中'] },
  { status: '三面中', label: '三面中', color: JOB_STATUS_ACTION_BADGE['三面中'] },
  { status: '终面中', label: '终面中', color: JOB_STATUS_ACTION_BADGE['终面中'] },
  { status: 'Offer', label: '收到 Offer', color: JOB_STATUS_ACTION_BADGE['Offer'] },
  { status: '已结束', label: '已结束', color: JOB_STATUS_ACTION_BADGE['已结束'] },
]

const END_REASON_OPTIONS = ['被拒绝', '岗位关闭', '自己放弃', '流程太慢', '薪资不匹配', '地点不合适', '手动标记', '其他']

const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"']+/gi
const ignore = () => {}

function formatUndoText(value, emptyText = '未填写', maxLength = 80) {
  const text = String(value || '').trim()
  if (!text) return emptyText
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

function formatInterviewRoundsForUndo(rounds) {
  if (!Array.isArray(rounds) || rounds.length === 0) return '无面试轮次'
  return rounds.map((round) => {
    const details = [
      round.status || '状态未设置',
      round.date ? `日期 ${round.date}` : '',
      round.result ? `结果 ${formatUndoText(round.result)}` : '',
      round.notes ? `备注 ${formatUndoText(round.notes)}` : '',
    ].filter(Boolean)
    return `${round.round || '未命名轮次'}（${details.join('，')}）`
  }).join('；')
}

function formatUndoFieldValue(field, value) {
  if (field === 'interviewRounds') return formatInterviewRoundsForUndo(value)
  return formatUndoText(value)
}

function countChar(value, char) {
  return [...value].filter((item) => item === char).length
}

function splitTrailingPunctuation(value) {
  const pairs = { ')': '(', ']': '[', '}': '{', '）': '（', '】': '【' }
  const trailingChars = new Set(['.', ',', ';', ':', '!', '?', '，', '。', '；', '：', '！', '？', '、', ')', ']', '}', '）', '】'])
  let linkText = value
  let trailing = ''

  while (linkText.length > 0) {
    const lastChar = linkText.at(-1)
    if (!trailingChars.has(lastChar)) break
    const openingChar = pairs[lastChar]
    if (openingChar && countChar(linkText, openingChar) >= countChar(linkText, lastChar)) break
    trailing = lastChar + trailing
    linkText = linkText.slice(0, -1)
  }

  return { linkText, trailing }
}

function LinkifiedText({ text }) {
  const value = String(text || '')
  const parts = []
  let lastIndex = 0

  value.replace(URL_REGEX, (match, offset) => {
    const { linkText, trailing } = splitTrailingPunctuation(match)
    if (!linkText) return match

    if (offset > lastIndex) {
      parts.push(value.slice(lastIndex, offset))
    }

    const href = linkText.startsWith('http') ? linkText : `https://${linkText}`
    parts.push(
      <a
        key={`${linkText}-${offset}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-offer-accent underline decoration-offer-accent/40 underline-offset-2 transition-colors hover:text-offer-primary cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      >
        {linkText}
      </a>
    )
    if (trailing) parts.push(trailing)
    lastIndex = offset + match.length
    return match
  })

  if (lastIndex < value.length) {
    parts.push(value.slice(lastIndex))
  }

  return parts
}

export default function JobDetailModal({ open, jobId, onClose, onEdit, onDelete, jobs: propJobs, isReadOnly = false }) {
  const appContext = useApp()
  const jobs = isReadOnly ? (propJobs || []) : appContext.jobs
  const addToast = isReadOnly ? ignore : appContext.addToast
  const updateJob = isReadOnly ? async () => {} : appContext.updateJob
  const undoLatestJobAction = isReadOnly ? async () => {} : appContext.undoLatestJobAction
  const addTask = isReadOnly ? async () => {} : appContext.addTask
  const job = jobs?.find((j) => j.id === jobId)

  // Sub-dialog state
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showEndForm, setShowEndForm] = useState(false)

  const [taskForm, setTaskForm] = useState({ title: '', type: '其他', date: formatBeijingDate(), startTime: '', notes: '' })
  const [endReason, setEndReason] = useState('手动标记')
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false)
  const [showUndoConfirm, setShowUndoConfirm] = useState(false)
  const [undoConfirmEventId, setUndoConfirmEventId] = useState(null)

  // ESC close
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key !== 'Escape') return
      if (showUndoConfirm) return
      if (showTaskForm) {
        setShowTaskForm(false)
        return
      }
      if (showEndForm) {
        setShowEndForm(false)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose, showEndForm, showTaskForm, showUndoConfirm])

  useEffect(() => {
    if (open) return
    setShowTaskForm(false)
    setShowEndForm(false)
    setShowUndoConfirm(false)
    setUndoConfirmEventId(null)
    setEndReason('手动标记')
  }, [open])

  useEffect(() => {
    setShowEndForm(false)
    setShowUndoConfirm(false)
    setUndoConfirmEventId(null)
    setEndReason('手动标记')
  }, [jobId])

  useEffect(() => {
    if (!showUndoConfirm || !undoConfirmEventId || !job) return
    const currentEventId = Array.isArray(job.timeline) ? job.timeline.at(-1)?.id : null
    if (currentEventId === undoConfirmEventId) return
    setShowUndoConfirm(false)
    setUndoConfirmEventId(null)
    addToast('最新时间线操作已变化，请重新点击撤销', 'warning')
  }, [addToast, job, showUndoConfirm, undoConfirmEventId])

  if (!open || !job) return null

  const waitingDays = getElapsedBeijingDays(job.appliedDate)
  const latestTimelineEvent = Array.isArray(job.timeline) ? job.timeline.at(-1) : null
  const canUndoLatest = !isReadOnly && hasLatestTimelineUndoSnapshot(job)
  const undoConflicts = canUndoLatest ? getLatestTimelineUndoConflicts(job) : []
  const undoConflictLabels = undoConflicts.map((field) => ({
    status: '岗位状态',
    appliedDate: '投递日期',
    endReason: '结束原因',
    interviewRounds: '面试轮次',
  })[field])
  const requiresForceUndo = undoConflicts.length > 0
  const undoSnapshot = latestTimelineEvent?._undo
  const currentUndoSnapshot = getJobTimelineSnapshot(job)
  const undoConflictDetails = undoConflicts.map((field, index) => (
    `${undoConflictLabels[index]}：${formatUndoFieldValue(field, undoSnapshot.after[field])}`
    + ` → ${formatUndoFieldValue(field, currentUndoSnapshot[field])}`
    + `；强制撤销后：${formatUndoFieldValue(field, undoSnapshot.before[field])}`
  ))

  const undoLatestAction = async () => {
    if (!canUndoLatest || !latestTimelineEvent) return
    const result = await undoLatestJobAction(jobId, latestTimelineEvent.id, {
      force: requiresForceUndo,
      expectedUpdatedAt: job.updatedAt,
    })
    if (!result) return
    if (result.undoConflict) {
      if (result.confirmationStale) addToast('岗位刚刚又被更新，请核对弹窗中的最新内容后再次确认', 'warning')
      return
    }
    setShowUndoConfirm(false)
    setUndoConfirmEventId(null)
    setShowEndForm(false)
    addToast('最新操作已撤销，相关状态已恢复', 'success')
  }

  // ---- Status change ----
  const changeStatus = async (newStatus, label) => {
    if (isSubmittingStatus) return
    const existing = jobs.find((j) => j.id === jobId)
    if (!existing) return
    if (!canSelectJobStatus(existing, newStatus)) {
      addToast(JOB_STATUS_TRANSITION_ERROR, 'error')
      return
    }
    
    setIsSubmittingStatus(true)
    try {
      const patch = {
        status: newStatus,
        timeline: [...(existing.timeline || []), { date: formatBeijingDate(), action: `标记为 ${label}`, detail: `从 ${existing.status} 更新为 ${newStatus}` }],
        endReason: newStatus === '已结束' ? endReason : '',
      }
      if (statusImpliesApplied(newStatus) && !existing.appliedDate) {
        patch.appliedDate = formatBeijingDate()
      }
      const savedJob = await updateJob(jobId, patch)
      if (!savedJob) return
      addToast(`已标记为「${label}」`, 'success')
      setShowEndForm(false)
    } finally {
      setIsSubmittingStatus(false)
    }
  }

  const openEndForm = () => {
    setEndReason(job.endReason || '手动标记')
    setShowEndForm(true)
  }

  // ---- Create task ----
  const createTask = async () => {
    if (isSubmittingTask) return
    if (!taskForm.title.trim()) { addToast('请输入日程标题', 'error'); return }
    
    setIsSubmittingTask(true)
    try {
      const savedTask = await addTask({
        title: taskForm.title, type: taskForm.type,
        date: taskForm.date, startTime: taskForm.startTime,
        jobId, notes: taskForm.notes,
      })
      if (!savedTask) return
      addToast('日程已创建', 'success')
      setTaskForm({ title: '', type: '其他', date: formatBeijingDate(), startTime: '', notes: '' })
      setShowTaskForm(false)
    } finally {
      setIsSubmittingTask(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-panel border w-full max-w-lg mx-4 max-h-[85vh] min-h-0 flex flex-col shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
        <GlowCard style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }} className="rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1">
        <div className="bg-white/90 backdrop-blur-xl dark:bg-transparent dark:backdrop-filter-none rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <ModalHeader onClose={onClose}>
          <div className="flex w-full min-w-0 flex-col items-center">
            <div className="relative w-full min-w-0">
              <h2 className="w-full break-words px-[4.5rem] text-center text-base font-semibold leading-normal text-slate-950 [overflow-wrap:anywhere] dark:text-white">{job.companyName}</h2>
              <span className={`absolute right-0 top-0 inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium ${JOB_STATUS_BADGE[job.status] || NEUTRAL_BADGE}`}>{job.status}</span>
            </div>
            <p className="w-full break-words text-center text-sm font-medium leading-normal text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{job.jobTitle}</p>
          </div>
        </ModalHeader>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-4 pb-6 pt-5 md:p-5 md:pb-7 md:pt-6">
          {/* Basic Info */}
          <section>
            <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wider mb-3">基本信息</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <InfoRow label="城市" value={job.city || '-'} />
              <InfoRow label="薪资范围" value={job.salaryRange || '-'} />
              <InfoRow label="工作模式" value={job.workMode || '-'} />
              <InfoRow label="投递渠道" value={job.channel || '-'} />
              <InfoRow label="优先级" value={job.priority || '-'} />
              <InfoRow label="投递日期" value={job.appliedDate || '-'} />
              <InfoRow label="等待天数" value={waitingDays !== null ? `${waitingDays} 天` : '-'} />
            </div>
          </section>

          {/* Contact */}
          {(job.contactName || job.contactInfo) && (
            <section>
              <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wider mb-3">联系人</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {job.contactName && <InfoRow label="联系人" value={job.contactName} />}
                {job.contactInfo && <InfoRow label="联系方式" value={job.contactInfo} />}
              </div>
            </section>
          )}

          {/* Next Action */}
          {job.nextAction && (
            <section className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 dark:bg-white/[0.02] dark:border-white/[0.06]">
              <p className="text-xs text-white/45 mb-1">下一步行动</p>
              <p className="text-sm text-offer-accent font-medium">{job.nextAction}</p>
            </section>
          )}

          {/* Notes */}
          {job.notes && (
            <section>
              <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wider mb-2">备注</h3>
              <div className="text-sm text-white/90 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap dark:bg-white/[0.02] dark:border-white/[0.06]"><LinkifiedText text={job.notes} /></div>
            </section>
          )}

          {/* JD */}
          {job.jdText && (
            <section>
              <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wider mb-2">JD 原文</h3>
              <div className="text-sm text-white/65 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap dark:bg-white/[0.02] dark:border-white/[0.06]"><LinkifiedText text={job.jdText} /></div>
            </section>
          )}

          {/* Job Link */}
          {job.jobLink && (
            <section>
              <h3 className="text-xs font-semibold text-offer-muted uppercase tracking-wider mb-2">岗位链接</h3>
              <a
                href={job.jobLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-offer-accent break-all hover:underline inline-flex items-center gap-1"
              >
                {job.jobLink}
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </section>
          )}

          {/* End Reason */}
          {job.endReason && (
            <section>
              <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wider mb-2">结束原因</h3>
              <div className="text-sm text-red-400 bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-3">{job.endReason}</div>
            </section>
          )}

          {/* Interview Rounds */}
          {(job.interviewRounds || []).length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wider mb-3">面试轮次</h3>
              <div className="space-y-2">
                {(job.interviewRounds || []).slice().reverse().map((r) => (
                  <div key={r.id} className="card-glow flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 dark:bg-white/[0.02] dark:border-white/[0.06]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium">{r.round}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${ROUND_STATUS_BADGE[r.status] || ROUND_STATUS_BADGE['进行中']}`}>{r.status}</span>
                      </div>
                      {r.result && <p className="text-xs text-white/45 mt-0.5">{r.result}</p>}
                    </div>
                    <div className="text-right text-xs text-white/45">
                      {r.date && <p>{r.date}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Quick Status Actions */}
          {!isReadOnly && !isFinalJobStatus(job.status) && (
            <section>
              <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wider mb-3">快捷操作</h3>
              <div className="flex flex-wrap gap-2">
                {STATUS_ACTIONS
                  .filter((a) => a.status !== job.status)
                  .map((a) => {
                    const disabled = !canSelectJobStatus(job, a.status)
                    return (
                    <button
                      key={a.status}
                      disabled={disabled || isSubmittingStatus}
                      onClick={() => a.status === '已结束' ? openEndForm() : changeStatus(a.status, a.label)}
                      title={disabled ? '该状态变更不符合当前流程限制' : undefined}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${disabled || isSubmittingStatus ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/35' : 'cursor-pointer ' + a.color}`}
                    >
                      {a.label}
                    </button>
                    )
                  })}
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-300 dark:hover:bg-blue-400/15 cursor-pointer"
                >
                  新建日程
                </button>
              </div>
              {showEndForm && (
                <div className="mt-3 rounded-xl border border-red-500/15 bg-red-500/5 p-3">
                  <label className="mb-1 block text-xs text-white/45">结束原因</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <CustomSelect
                      value={endReason}
                      onChange={setEndReason}
                      options={END_REASON_OPTIONS}
                      className="flex-1"
                    />
                    <button
                      onClick={() => changeStatus('已结束', '已结束')}
                      disabled={isSubmittingStatus}
                      className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-400 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSubmittingStatus ? '处理中...' : '确认结束'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Timeline */}
          <section>
            <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wider mb-3">时间线</h3>
            <div className="relative pl-4 border-l border-slate-200 dark:border-white/[0.06] space-y-4">
              {(job.timeline || []).slice().reverse().map((t, i) => (
                <div key={t.id || i} className="relative">
                  <div className="absolute -left-[14px] top-1 w-2.5 h-2.5 rounded-full bg-offer-primary border-2 border-white dark:border-[#13151A]" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-white/45">{t.date}</p>
                      <p className="text-sm text-white/90 font-medium">{t.action}</p>
                    </div>
                    {i === 0 && canUndoLatest && (
                      <button
                        type="button"
                        onClick={() => {
                          setUndoConfirmEventId(t.id)
                          setShowUndoConfirm(true)
                        }}
                        className="shrink-0 rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-400/20 dark:text-amber-300 cursor-pointer"
                      >
                        撤销
                      </button>
                    )}
                  </div>
                  {t.detail && <p className="text-xs text-white/45 mt-0.5">{t.detail}</p>}
                </div>
              ))}
              {(!job.timeline || job.timeline.length === 0) && (
                <p className="text-sm text-white/45 py-2">暂无时间线记录</p>
              )}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 p-4 dark:border-white/10 md:p-5">
          {isReadOnly ? (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="btn-secondary px-5 py-2 rounded-xl text-sm font-medium cursor-pointer"
              >
                关闭
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => { onClose(); onDelete(job) }}
                className="btn-danger text-sm flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除
              </button>
              <button
                onClick={() => { onClose(); onEdit(job) }}
                className="btn-gradient px-5 py-2 rounded-xl text-sm font-medium text-white cursor-pointer"
              >
                编辑岗位
              </button>
            </>
          )}
        </div>
        </div>
        </GlowCard>
      </div>

      {/* ===== Task Form Sub-dialog ===== */}
      {showTaskForm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowTaskForm(false) }}
        >
          <div className="modal-panel w-full max-w-sm mx-4 shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
            <GlowCard style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }} className="rounded-[22px] w-full max-w-full min-w-0 flex flex-col">
            <div className="bg-white/90 backdrop-blur-xl dark:bg-transparent dark:backdrop-filter-none rounded-[22px] w-full max-w-full min-w-0 flex flex-col">
            <ModalHeader title="新建日程" onClose={() => setShowTaskForm(false)} />
            <div className="p-5 pt-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-offer-muted block mb-1">标题</label>
                <input value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} placeholder="日程标题" className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-offer-muted block mb-1">类型</label>
                  <CustomSelect
                    value={taskForm.type}
                    onChange={(nextValue) => setTaskForm((p) => ({ ...p, type: nextValue }))}
                    options={['面试', 'OA / 笔试', 'Deadline', 'Follow-up', '准备任务', '其他']}
                  />
                </div>
                <div>
                  <label className="text-xs text-offer-muted block mb-1">日期</label>
                  <input type="date" value={taskForm.date} onChange={(e) => setTaskForm((p) => ({ ...p, date: e.target.value }))} onClick={(e) => { try { e.target.showPicker?.() } catch (_) {} }} className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 cursor-pointer" />
                </div>
              </div>
              <div>
                <label className="text-xs text-offer-muted block mb-1">时间</label>
                <input type="time" value={taskForm.startTime} onChange={(e) => setTaskForm((p) => ({ ...p, startTime: e.target.value }))} onClick={(e) => { try { e.target.showPicker?.() } catch (_) {} }} className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 cursor-pointer" />
              </div>
              <div>
                <label className="text-xs text-offer-muted block mb-1">备注</label>
                <textarea value={taskForm.notes} onChange={(e) => setTaskForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setShowTaskForm(false)} disabled={isSubmittingTask} className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">取消</button>
              <button onClick={createTask} disabled={isSubmittingTask} className="btn-gradient px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">{isSubmittingTask ? '处理中...' : '创建'}</button>
            </div>
          </div>
          </div>
        </GlowCard>
        </div>
        </div>
      )}

      <ConfirmDialog
        open={showUndoConfirm}
        title={requiresForceUndo ? '相关状态已被修改' : '确认撤销最新操作'}
        message={requiresForceUndo
          ? `检测到操作完成后有以下修改：\n${undoConflictDetails.join('\n')}\n\n强制撤销将覆盖这些后续修改，并恢复“${latestTimelineEvent?.action || '状态变更'}”之前的关联状态，是否继续？`
          : `将撤销“${latestTimelineEvent?.action || '状态变更'}”，并恢复操作前的岗位状态、投递日期、结束原因和面试轮次。`}
        confirmLabel={requiresForceUndo ? '强制撤销' : '确认撤销'}
        onConfirm={undoLatestAction}
        onCancel={() => {
          setShowUndoConfirm(false)
          setUndoConfirmEventId(null)
        }}
      />

    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="bento-block">
      <p className="text-xs text-white/45">{label}</p>
      <p className="text-sm text-white mt-0.5">{value}</p>
    </div>
  )
}
