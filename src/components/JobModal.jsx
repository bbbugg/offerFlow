'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp, canSelectInterviewStatus } from '../store/AppContext'
import ModalHeader from './ModalHeader'
import GlowCard from './GlowCard'
import { formatBeijingDate, formatLocalDate } from '../lib/dateUtils'
import { statusImpliesApplied } from '../lib/jobStatus'

const STATUS_OPTIONS = ['感兴趣', '准备投递', '已投递', 'OA / 笔试', '一面中', '二面中', '三面中', '终面中', 'Offer', '已结束']
const WORK_MODE_OPTIONS = ['onsite', 'remote', 'hybrid']
const CHANNEL_OPTIONS = ['', '内推', '官网投递', '猎头', '招聘平台', '校园招聘', '其他']
const PRIORITY_OPTIONS = ['高', '中', '低']
const END_REASON_OPTIONS = ['', '被拒绝', '岗位关闭', '自己放弃', '流程太慢', '薪资不匹配', '地点不合适', '手动标记', '其他']

const emptyForm = {
  companyName: '', jobTitle: '', status: '感兴趣', city: '', salaryRange: '',
  workMode: 'onsite', channel: '', priority: '中', appliedDate: '',
  jobLink: '', jdText: '', contactName: '', contactInfo: '',
  nextAction: '', notes: '', endReason: '',
}

// Stable helper components defined OUTSIDE JobModal to prevent remount on every render
function Input({ label, value, onChange, placeholder, type = 'text', large, ...rest }) {
  return (
    <div className={large ? 'min-w-0 md:col-span-2' : 'min-w-0'}>
      <label className="text-sm text-offer-muted block mb-1">{label}</label>
      {large && type === 'textarea' ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={4}
          className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 resize-none"
          {...rest}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20"
          {...rest}
        />
      )}
    </div>
  )
}

function Select({ label, value, onChange, options, placeholder = '请选择' }) {
  return (
    <div className="min-w-0">
      <label className="text-sm text-offer-muted block mb-1">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="min-h-[40px] w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 appearance-none cursor-pointer"
      >
        {options.map((option) => {
          const opt = typeof option === 'string' ? option : option.value
          const disabled = typeof option === 'string' ? false : option.disabled
          return (
            <option key={opt || 'empty'} value={opt} disabled={disabled} className="bg-gray-950 text-white disabled:text-slate-500">{opt || placeholder}</option>
          )
        })}
      </select>
    </div>
  )
}

export default function JobModal({ open, job, onClose, initialStatus }) {
  const { addToast, addJob, updateJob } = useApp()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  useEffect(() => {
    if (open) {
      const base = job ? { ...emptyForm, ...job } : { ...emptyForm }
      if (!job && initialStatus) {
        base.status = canSelectInterviewStatus(base, initialStatus) ? initialStatus : '一面中'
      }
      setForm(base)
      setSaving(false)
      savingRef.current = false
    }
  }, [open, job, initialStatus])

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleStatusChange = useCallback((value) => {
    const statusBasis = job || emptyForm
    if (!canSelectInterviewStatus(statusBasis, value)) {
      addToast('面试状态只能按轮次向后推进', 'error')
      return
    }
    setForm((prev) => ({
      ...prev,
      status: value,
      endReason: value === '已结束' ? prev.endReason : '',
      appliedDate: statusImpliesApplied(value) && !prev.appliedDate ? formatBeijingDate() : prev.appliedDate,
    }))
  }, [addToast, job])

  // ESC close
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleSave = async () => {
    if (savingRef.current) return
    if (!form.companyName.trim() || !form.jobTitle.trim()) {
      addToast('公司名称和岗位名称为必填项', 'error')
      return
    }
    if (form.status === '已结束' && !form.endReason) {
      addToast('请选择结束原因', 'error')
      return
    }
    if (!canSelectInterviewStatus(job || emptyForm, form.status)) {
      addToast('面试状态只能按轮次向后推进', 'error')
      return
    }

    savingRef.current = true
    setSaving(true)
    const payload = {
      ...form,
      appliedDate: statusImpliesApplied(form.status) && !form.appliedDate ? formatBeijingDate() : form.appliedDate,
    }
    if (job) {
      const patch = { ...payload }
      if (job.status !== payload.status) {
        patch.timeline = [
          ...(job.timeline || []),
          {
            date: formatLocalDate(),
            action: '状态变更',
            detail: `从 ${job.status} 更新为 ${payload.status}`,
          },
        ]
      }
      const savedJob = await updateJob(job.id, patch)
      if (!savedJob) {
        savingRef.current = false
        setSaving(false)
        return
      }
      addToast('岗位已更新', 'success')
    } else {
      const savedJob = await addJob({ ...payload, timeline: [] })
      if (!savedJob) {
        savingRef.current = false
        setSaving(false)
        return
      }
      addToast('岗位已新增', 'success')
    }
    onClose()
  }

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

  const statusBasis = job || emptyForm
  const statusOptions = STATUS_OPTIONS.map((status) => ({
    value: status,
    disabled: !canSelectInterviewStatus(statusBasis, status),
  }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-panel border w-full max-w-2xl mx-4 max-h-[90vh] min-h-0 flex flex-col shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
        <GlowCard style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }} className="rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1">
        <div className="bg-white/90 backdrop-blur-xl dark:bg-transparent dark:backdrop-filter-none rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <ModalHeader title={job ? '编辑岗位' : '新增岗位'} onClose={onClose} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 pb-6 pt-5 md:p-5 md:pb-7 md:pt-6" onFocus={handleFocusIn}>
          <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
            <Input label="公司名称 *" value={form.companyName} onChange={(e) => handleChange('companyName', e.target.value)} placeholder="例如：ByteDance" />
            <Input label="岗位名称 *" value={form.jobTitle} onChange={(e) => handleChange('jobTitle', e.target.value)} placeholder="例如：高级后端工程师" />

            <Select label="当前状态" value={form.status} onChange={(e) => handleStatusChange(e.target.value)} options={statusOptions} />
            <Input label="城市" value={form.city} onChange={(e) => handleChange('city', e.target.value)} placeholder="例如：北京" />

            {form.status === '已结束' && (
              <Select label="结束原因" value={form.endReason} onChange={(e) => handleChange('endReason', e.target.value)} options={END_REASON_OPTIONS} placeholder="请选择原因" />
            )}

            <Input label="薪资范围" value={form.salaryRange} onChange={(e) => handleChange('salaryRange', e.target.value)} placeholder="例如：30K-50K" />
            <Select label="工作模式" value={form.workMode} onChange={(e) => handleChange('workMode', e.target.value)} options={WORK_MODE_OPTIONS} />

            <Select label="投递渠道" value={form.channel} onChange={(e) => handleChange('channel', e.target.value)} options={CHANNEL_OPTIONS} />
            <Select label="优先级" value={form.priority} onChange={(e) => handleChange('priority', e.target.value)} options={PRIORITY_OPTIONS} />

            <Input label="投递日期" type="date" value={form.appliedDate} onChange={(e) => handleChange('appliedDate', e.target.value)} />
            <Input label="岗位链接" value={form.jobLink} onChange={(e) => handleChange('jobLink', e.target.value)} placeholder="https://..." />

            <Input label="联系人 / HR" value={form.contactName} onChange={(e) => handleChange('contactName', e.target.value)} placeholder="姓名" />

            <Input label="联系方式" value={form.contactInfo} onChange={(e) => handleChange('contactInfo', e.target.value)} placeholder="微信 / 电话" />
            <Input label="下一步行动" value={form.nextAction} onChange={(e) => handleChange('nextAction', e.target.value)} placeholder="例如：准备二面" />

            <Input label="JD 原文" value={form.jdText} onChange={(e) => handleChange('jdText', e.target.value)} placeholder="粘贴 JD 内容..." large type="textarea" />
            <Input label="备注" value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="其他备注信息" large type="textarea" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 p-4 dark:border-white/10 md:p-5">
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-gradient px-5 py-2 rounded-xl text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? '保存中...' : job ? '保存修改' : '新增岗位'}
          </button>
        </div>
        </div>
        </GlowCard>
      </div>
    </div>
  )
}
