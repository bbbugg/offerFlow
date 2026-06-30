'use client'
import { useState, useEffect } from 'react'
import { useApp } from '../store/AppContext'
import ModalHeader from './ModalHeader'
import GlowCard from './GlowCard'

const STATUS_ACTIONS = [
  { status: '已投递', label: '已投递', color: 'border-cyan-200 text-cyan-700 dark:text-cyan-300 bg-cyan-50 hover:bg-cyan-100' },
  { status: 'OA / 笔试', label: '收到 OA', color: 'border-orange-200 text-orange-700 dark:text-orange-300 bg-orange-50 hover:bg-orange-100' },
  { status: '一面中', label: '一面中', color: 'border-offer-primary/30 text-offer-accent bg-offer-primary/10 hover:bg-offer-primary/20' },
  { status: '二面中', label: '二面中', color: 'border-indigo-200 text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100' },
  { status: '三面中', label: '三面中', color: 'border-violet-200 text-violet-700 dark:text-violet-300 bg-violet-50 hover:bg-violet-100' },
  { status: '终面中', label: '终面中', color: 'border-pink-200 text-pink-700 dark:text-pink-300 bg-pink-50 hover:bg-pink-100' },
  { status: 'Offer', label: '收到 Offer', color: 'border-emerald-200 text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100' },
  { status: '已结束', label: '已结束', color: 'border-red-200 text-red-700 dark:text-red-300 bg-red-50 hover:bg-red-100' },
]

const END_REASON_OPTIONS = ['被拒绝', '岗位关闭', '自己放弃', '流程太慢', '薪资不匹配', '地点不合适', '手动标记', '其他']

const statusColors = {
  '感兴趣': 'bg-blue-50 text-blue-700 dark:text-blue-300 border-blue-200',
  '准备投递': 'bg-amber-50 text-amber-700 dark:text-amber-300 border-amber-200',
  '已投递': 'bg-cyan-50 text-cyan-700 dark:text-cyan-300 border-cyan-200',
  'OA / 笔试': 'bg-orange-50 text-orange-700 dark:text-orange-300 border-orange-200',
  '一面中': 'bg-offer-primary/10 text-offer-accent border-offer-primary/30',
  '二面中': 'bg-indigo-50 text-indigo-700 dark:text-indigo-300 border-indigo-200',
  '三面中': 'bg-violet-50 text-violet-700 dark:text-violet-300 border-violet-200',
  '终面中': 'bg-pink-50 text-pink-700 dark:text-pink-300 border-pink-200',
  'Offer': 'bg-emerald-50 text-emerald-700 dark:text-emerald-300 border-emerald-200',
  '已结束': 'bg-red-50 text-red-700 dark:text-red-300 border-red-200',
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function JobDetailModal({ open, jobId, onClose, onEdit, onDelete }) {
  const { jobs, resumes, addToast, updateJob, addTask, addReview } = useApp()
  const job = jobs.find((j) => j.id === jobId)

  // Sub-dialog state
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showEndForm, setShowEndForm] = useState(false)

  const [taskForm, setTaskForm] = useState({ title: '', type: '其他', date: todayStr(), startTime: '', notes: '' })
  const [reviewForm, setReviewForm] = useState({ interviewDate: todayStr(), round: '一面', interviewType: '技术面', result: '待定', duration: '', interviewerInfo: '', rating: 3, note: '', strengths: '', weaknesses: '' })
  const [endReason, setEndReason] = useState('手动标记')

  // ESC close
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !job) return null

  const resumeName = resumes.find((r) => r.id === job.resumeId)

  // ---- Status change ----
  const changeStatus = async (newStatus, label) => {
    const existing = jobs.find((j) => j.id === jobId)
    if (!existing) return
    await updateJob(jobId, {
      status: newStatus,
      timeline: [...(existing.timeline || []), { date: todayStr(), action: `标记为 ${label}`, detail: `从 ${existing.status} 更新为 ${newStatus}` }],
      endReason: newStatus === '已结束' ? endReason : '',
    })
    addToast(`已标记为「${label}」`, 'success')
    setShowEndForm(false)
  }

  const openEndForm = () => {
    setEndReason(job.endReason || '手动标记')
    setShowEndForm(true)
  }

  // ---- Create task ----
  const createTask = async () => {
    if (!taskForm.title.trim()) { addToast('请输入日程标题', 'error'); return }
    await addTask({
      title: taskForm.title, type: taskForm.type,
      date: taskForm.date, startTime: taskForm.startTime,
      jobId, notes: taskForm.notes,
    })
    addToast('日程已创建', 'success')
    setTaskForm({ title: '', type: '其他', date: todayStr(), startTime: '', notes: '' })
    setShowTaskForm(false)
  }

  // ---- Create review ----
  const createReview = async () => {
    await addReview({
      companyName: job.companyName, jobTitle: job.jobTitle, jobId,
      interviewDate: reviewForm.interviewDate, round: reviewForm.round,
      interviewType: reviewForm.interviewType,
      duration: reviewForm.duration, interviewerInfo: reviewForm.interviewerInfo,
      result: reviewForm.result, rating: reviewForm.rating,
      note: reviewForm.note,
      strengths: reviewForm.strengths, weaknesses: reviewForm.weaknesses,
      scores: { expression: 3, jobUnderstanding: 3, projectFamiliarity: 3, businessThinking: 3, technicalAbility: 3, composure: 3, questionQuality: 3, overall: reviewForm.rating },
      questions: [], tags: [], improvements: [],
    })
    addToast('复盘记录已创建', 'success')
    setReviewForm({ interviewDate: todayStr(), round: '一面', interviewType: '技术面', result: '待定', duration: '', interviewerInfo: '', rating: 3, note: '', strengths: '', weaknesses: '' })
    setShowReviewForm(false)
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
              <span className={`absolute right-0 top-0 inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusColors[job.status] || 'bg-slate-50 text-slate-700 dark:text-slate-300 border-slate-200'}`}>{job.status}</span>
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
              <InfoRow label="等待天数" value={job.appliedDate ? `${Math.floor((new Date() - new Date(job.appliedDate)) / (1000 * 60 * 60 * 24))} 天` : '-'} />
              <InfoRow label="关联简历" value={resumeName ? `${resumeName.name} (${resumeName.version})` : '-'} />
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
              <div className="text-sm text-white/90 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 leading-relaxed dark:bg-white/[0.02] dark:border-white/[0.06]">{job.notes}</div>
            </section>
          )}

          {/* JD */}
          {job.jdText && (
            <section>
              <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wider mb-2">JD 原文</h3>
              <div className="text-sm text-white/65 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap dark:bg-white/[0.02] dark:border-white/[0.06]">{job.jdText}</div>
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
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          r.status === '已通过' ? 'bg-emerald-50 text-emerald-700 dark:text-emerald-300' :
                          r.status === '未通过' ? 'bg-red-50 text-red-700 dark:text-red-300' :
                          r.status === '已取消' ? 'bg-white/80 text-slate-500' :
                          'bg-amber-50 text-amber-700 dark:text-amber-300'
                        }`}>{r.status}</span>
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
          {job.status !== '已结束' && (
            <section>
              <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wider mb-3">快捷操作</h3>
              <div className="flex flex-wrap gap-2">
                {STATUS_ACTIONS
                  .filter((a) => a.status !== job.status)
                  .map((a) => (
                    <button
                      key={a.status}
                      onClick={() => a.status === '已结束' ? openEndForm() : changeStatus(a.status, a.label)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${a.color}`}
                    >
                      {a.label}
                    </button>
                  ))}
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all"
                >
                  新建日程
                </button>
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-all"
                >
                  新建复盘
                </button>
              </div>
              {showEndForm && (
                <div className="mt-3 rounded-xl border border-red-500/15 bg-red-500/5 p-3">
                  <label className="mb-1 block text-xs text-white/45">结束原因</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={endReason}
                      onChange={(e) => setEndReason(e.target.value)}
                      className="min-h-[40px] flex-1 rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20"
                    >
                      {END_REASON_OPTIONS.map((reason) => (
                        <option key={reason} value={reason} className="bg-gray-950 text-white">{reason}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => changeStatus('已结束', '已结束')}
                      className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-400"
                    >
                      确认结束
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
                <div key={i} className="relative">
                  <div className="absolute -left-[14px] top-1 w-2.5 h-2.5 rounded-full bg-offer-primary border-2 border-white dark:border-[#13151A]" />
                  <p className="text-xs text-white/45">{t.date}</p>
                  <p className="text-sm text-white/90 font-medium">{t.action}</p>
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
          <button
            onClick={() => { onClose(); onDelete(job) }}
            className="btn-danger text-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除
          </button>
          <button
            onClick={() => { onClose(); onEdit(job) }}
            className="btn-gradient px-5 py-2 rounded-xl text-sm font-medium text-white"
          >
            编辑岗位
          </button>
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
                  <select value={taskForm.type} onChange={(e) => setTaskForm((p) => ({ ...p, type: e.target.value }))} className="min-h-[40px] rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 appearance-none cursor-pointer">
                    {['面试', 'OA / 笔试', 'Deadline', 'Follow-up', '准备任务', '其他'].map((o) => (
                      <option key={o} className="bg-gray-950">{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-offer-muted block mb-1">日期</label>
                  <input type="date" value={taskForm.date} onChange={(e) => setTaskForm((p) => ({ ...p, date: e.target.value }))} className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
                </div>
              </div>
              <div>
                <label className="text-xs text-offer-muted block mb-1">时间</label>
                <input type="time" value={taskForm.startTime} onChange={(e) => setTaskForm((p) => ({ ...p, startTime: e.target.value }))} className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
              </div>
              <div>
                <label className="text-xs text-offer-muted block mb-1">备注</label>
                <textarea value={taskForm.notes} onChange={(e) => setTaskForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setShowTaskForm(false)} className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium">取消</button>
              <button onClick={createTask} className="btn-gradient px-4 py-2 rounded-xl text-sm font-medium text-white">创建</button>
            </div>
          </div>
          </div>
        </GlowCard>
        </div>
        </div>
      )}

      {/* ===== Review Form Sub-dialog ===== */}
      {showReviewForm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowReviewForm(false) }}
        >
          <div className="modal-panel w-full max-w-md mx-4 shadow-2xl shadow-black/40 max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <GlowCard style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }} className="rounded-[22px] w-full max-w-full min-w-0 flex flex-col overflow-hidden">
            <div className="bg-white/90 backdrop-blur-xl dark:bg-transparent dark:backdrop-filter-none rounded-[22px] w-full max-w-full min-w-0 flex flex-col overflow-hidden max-h-[calc(85vh-24px)]">
            <ModalHeader title="新建复盘" onClose={() => setShowReviewForm(false)} />
            <div className="overflow-y-auto p-5 pt-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-offer-muted block mb-1">面试日期</label>
                  <input type="date" value={reviewForm.interviewDate} onChange={(e) => setReviewForm((p) => ({ ...p, interviewDate: e.target.value }))} className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" autoFocus />
                </div>
                <div>
                  <label className="text-xs text-offer-muted block mb-1">轮次</label>
                  <select value={reviewForm.round} onChange={(e) => setReviewForm((p) => ({ ...p, round: e.target.value }))} className="min-h-[40px] rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 appearance-none cursor-pointer">
                    {['一面', '二面', '三面', 'HR 面', '技术面', '主管面'].map((r) => (
                      <option key={r} className="bg-gray-950">{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-offer-muted block mb-1">面试类型</label>
                  <select value={reviewForm.interviewType} onChange={(e) => setReviewForm((p) => ({ ...p, interviewType: e.target.value }))} className="min-h-[40px] rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 appearance-none cursor-pointer">
                    {['技术面', 'HR 面', '主管面', '行为面', '笔试', '其他'].map((r) => (
                      <option key={r} className="bg-gray-950">{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-offer-muted block mb-1">面试时长</label>
                  <input value={reviewForm.duration} onChange={(e) => setReviewForm((p) => ({ ...p, duration: e.target.value }))} placeholder="如：1小时" className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-offer-muted block mb-1">结果</label>
                  <select value={reviewForm.result} onChange={(e) => setReviewForm((p) => ({ ...p, result: e.target.value }))} className="min-h-[40px] rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 appearance-none cursor-pointer">
                    {['通过', '待定', '未通过'].map((r) => (
                      <option key={r} className="bg-gray-950">{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-offer-muted block mb-1">整体评分</label>
                  <div className="flex items-center gap-1 h-9">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button" onClick={() => setReviewForm((p) => ({ ...p, rating: s }))}
                        className="p-0.5 transition-colors hover:scale-110">
                        <svg className={`w-4 h-4 ${s <= reviewForm.rating ? 'text-amber-400' : 'text-offer-muted/30'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                    <span className="text-xs text-offer-muted ml-1">{reviewForm.rating}/5</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-offer-muted block mb-1">面试官信息</label>
                <input value={reviewForm.interviewerInfo} onChange={(e) => setReviewForm((p) => ({ ...p, interviewerInfo: e.target.value }))} placeholder="姓名、职位" className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
              </div>
              <div>
                <label className="text-xs text-offer-muted block mb-1">面试记录</label>
                <textarea value={reviewForm.note} onChange={(e) => setReviewForm((p) => ({ ...p, note: e.target.value }))} rows={3} placeholder="记录面试问题和表现..." className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-offer-muted focus:outline-none focus:border-offer-primary transition-colors resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-offer-muted block mb-1">优势</label>
                  <input value={reviewForm.strengths} onChange={(e) => setReviewForm((p) => ({ ...p, strengths: e.target.value }))} placeholder="做得好" className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="text-xs text-offer-muted block mb-1">不足</label>
                  <input value={reviewForm.weaknesses} onChange={(e) => setReviewForm((p) => ({ ...p, weaknesses: e.target.value }))} placeholder="需改进" className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setShowReviewForm(false)} className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium">取消</button>
              <button onClick={createReview} className="btn-gradient px-4 py-2 rounded-xl text-sm font-medium text-white">创建</button>
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

function InfoRow({ label, value }) {
  return (
    <div className="bento-block">
      <p className="text-xs text-white/45">{label}</p>
      <p className="text-sm text-white mt-0.5">{value}</p>
    </div>
  )
}
