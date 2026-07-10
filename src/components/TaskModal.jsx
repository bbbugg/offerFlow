'use client'
import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../store/AppContext'
import ModalHeader from './ModalHeader'
import GlowCard from './GlowCard'
import { formatLocalDate } from '../lib/dateUtils'

export default function TaskModal({ open, task, defaultDate, onClose }) {
  const { jobs, addToast, addTask, updateTask } = useApp()

  const [title, setTitle] = useState('')
  const [type, setType] = useState('其他')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [priority, setPriority] = useState('中')
  const [jobId, setJobId] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    if (task) {
      setTitle(task.title || '')
      setType(task.type || '其他')
      setDate(task.date || '')
      setStartTime(task.startTime || '')
      setEndTime(task.endTime || '')
      setPriority(task.priority || '中')
      setJobId(task.jobId || '')
      setNotes(task.notes || '')
    } else {
      setTitle('')
      setType('其他')
      setDate(defaultDate || formatLocalDate())
      setStartTime('')
      setEndTime('')
      setPriority('中')
      setJobId('')
      setNotes('')
    }
  }, [open, task, defaultDate])

  // ESC close
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // ---- GlowCard: center glow on focused input ----
  const handleFocusIn = useCallback((e) => {
    const card = e.target.closest('.glow-card')
    if (!card) return
    const target = e.target
    const cardRect = card.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    card.style.setProperty('--mouse-x', `${targetRect.left + targetRect.width / 2 - cardRect.left}px`)
    card.style.setProperty('--mouse-y', `${targetRect.top + targetRect.height / 2 - cardRect.top}px`)
  }, [])

  if (!open) return null

  const handleSave = async () => {
    if (!title.trim()) { addToast('请输入事项标题', 'error'); return }
    if (task) {
      await updateTask(task.id, { title: title.trim(), type, date, startTime, endTime, priority, jobId, notes })
      addToast('事项已更新', 'success')
    } else {
      await addTask({ title: title.trim(), type, date, startTime, endTime, priority, jobId, notes })
      addToast('事项已创建', 'success')
    }
    onClose()
  }

  const activeJobs = jobs.filter((j) => j.status !== '已结束')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-overlay" onClick={onClose}>
      <div className="modal-panel border w-full max-w-md min-w-0 mx-4 max-h-[85vh] min-h-0 flex flex-col shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
        <GlowCard style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }} className="rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1">
        <div className="bg-white/90 backdrop-blur-xl dark:bg-transparent dark:backdrop-filter-none rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <ModalHeader title={task ? '编辑事项' : '新建事项'} onClose={onClose} />

        {/* Body */}
        <div className="flex-1 min-w-0 space-y-4 overflow-y-auto overflow-x-hidden p-4 pb-6 pt-5 md:p-5 md:pb-7 md:pt-6" onFocus={handleFocusIn}>
          <Field label="标题 *">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="事项标题"
              autoFocus
              className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
          </Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="类型">
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="min-h-[40px] w-full min-w-0 max-w-full truncate rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 appearance-none cursor-pointer">
                {['面试', 'OA / 笔试', 'Deadline', 'Follow-up', '准备任务', '其他'].map((o) => (
                  <option key={o} className="bg-gray-950">{o}</option>
                ))}
              </select>
            </Field>
            <Field label="优先级">
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="min-h-[40px] w-full min-w-0 max-w-full truncate rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 appearance-none cursor-pointer">
                {['高', '中', '低'].map((o) => (
                  <option key={o} className="bg-gray-950">{o}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="日期">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
          </Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="开始时间">
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
            </Field>
            <Field label="结束时间">
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
            </Field>
          </div>

          <Field label="关联岗位">
            <select value={jobId} onChange={(e) => setJobId(e.target.value)}
              className="min-h-[40px] w-full min-w-0 max-w-full truncate rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 appearance-none cursor-pointer">
              <option value="" className="bg-gray-950">不关联</option>
              {activeJobs.map((j) => (
                <option key={j.id} value={j.id} className="bg-gray-950">{j.companyName} - {j.jobTitle}</option>
              ))}
            </select>
          </Field>

          <Field label="备注">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="备注信息..."
              className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 resize-none" />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 p-4 dark:border-white/10 md:p-5">
          <button onClick={onClose}
            className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium">取消</button>
          <button onClick={handleSave}
            className="btn-gradient px-4 py-2 rounded-xl text-sm font-medium text-white">{task ? '保存' : '创建'}</button>
        </div>
        </div>
        </GlowCard>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <label className="text-xs text-slate-600 dark:text-offer-muted block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
