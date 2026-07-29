'use client'
import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../store/AppContext'
import ModalHeader from './ModalHeader'
import GlowCard from './GlowCard'
import { formatBeijingDate } from '../lib/dateUtils'
import ConfirmDialog from './ConfirmDialog'
import CustomSelect from './CustomSelect'

export default function TaskModal({ open, task, defaultDate, onClose }) {
  const { jobs, addToast, addTask, updateTask, deleteTask } = useApp()
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

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
      setDate(defaultDate || formatBeijingDate())
      setStartTime('')
      setEndTime('')
      setPriority('中')
      setJobId('')
      setNotes('')
    }
    setConfirmOpen(false)
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
    if (saving) return
    if (!title.trim()) { addToast('请输入事项标题', 'error'); return }
    const payload = { title: title.trim(), type, date, startTime, endTime, priority, jobId: jobId || null, notes }
    
    setSaving(true)
    try {
      if (task) {
        const savedTask = await updateTask(task.id, payload)
        if (!savedTask) return
        addToast('事项已更新', 'success')
      } else {
        const savedTask = await addTask(payload)
        if (!savedTask) return
        addToast('事项已创建', 'success')
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleToggleDone = async () => {
    if (saving || !task) return
    setSaving(true)
    try {
      const newDone = !task.done
      const savedTask = await updateTask(task.id, { done: newDone })
      if (!savedTask) return
      addToast(newDone ? '事项已完成' : '已取消完成', 'success')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = () => {
    if (saving || !task) return
    setConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (saving || !task) return
    setSaving(true)
    try {
      await deleteTask(task.id)
      addToast('事项已删除', 'success')
      setConfirmOpen(false)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const sortedJobs = [...jobs].sort((a, b) => {
    if (a.status === '已结束' && b.status !== '已结束') return 1
    if (a.status !== '已结束' && b.status === '已结束') return -1
    return 0
  })

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
              autoFocus={!task}
              className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
          </Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="类型">
              <CustomSelect value={type} onChange={setType} options={['面试', 'OA / 笔试', 'Deadline', 'Follow-up', '准备任务', '其他']} />
            </Field>
            <Field label="优先级">
              <CustomSelect value={priority} onChange={setPriority} options={['高', '中', '低']} />
            </Field>
          </div>

          <Field label="日期">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              onClick={(e) => { try { e.target.showPicker?.() } catch (_) {} }}
              className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 cursor-pointer" />
          </Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="开始时间">
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                onClick={(e) => { try { e.target.showPicker?.() } catch (_) {} }}
                className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 cursor-pointer" />
            </Field>
            <Field label="结束时间">
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                onClick={(e) => { try { e.target.showPicker?.() } catch (_) {} }}
                className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 cursor-pointer" />
            </Field>
          </div>

          <Field label="关联岗位">
            <CustomSelect
              value={jobId}
              onChange={setJobId}
              placeholder="不关联"
              searchable={true}
              searchPlaceholder="搜索岗位或公司..."
              options={[
                { value: '', label: '不关联' },
                ...sortedJobs.map((j) => ({
                  value: j.id,
                  label: `${j.companyName} - ${j.jobTitle}${j.status === '已结束' ? ' (已结束)' : ''}`,
                })),
              ]}
            />
          </Field>

          <Field label="备注">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="备注信息..."
              className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 resize-none" />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 border-t border-slate-200 p-4 dark:border-white/10 md:p-5">
          {task && (
            <div className="flex items-center gap-2 mr-auto">
              <button
                onClick={handleToggleDone}
                disabled={saving}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
                  task.done
                    ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10 bg-amber-500/[0.02]'
                    : 'border-green-500/30 text-green-500 hover:bg-green-500/10 bg-green-500/[0.02]'
                }`}
              >
                {task.done ? '设为未完成' : '标记完成'}
              </button>
              <button
                onClick={handleDeleteClick}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-red-500/30 text-red-500 hover:bg-red-500/10 bg-red-500/[0.02] transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                删除
              </button>
            </div>
          )}
          <button onClick={onClose} disabled={saving}
            className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">取消</button>
          <button onClick={handleSave} disabled={saving}
            className="btn-gradient px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">{saving ? '处理中...' : (task ? '保存' : '创建')}</button>
        </div>
        </div>
        </GlowCard>
      </div>
      <ConfirmDialog open={confirmOpen} title="确认删除" message="确定要删除这个事项吗？此操作不可恢复。"
        onConfirm={handleDeleteConfirm} onCancel={() => setConfirmOpen(false)} />
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
