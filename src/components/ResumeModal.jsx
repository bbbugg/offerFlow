'use client'
import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../store/AppContext'
import { saveResumeFile } from '../utils/resumeFileStore'
import ModalHeader from './ModalHeader'
import GlowCard from './GlowCard'

const LANG_OPTIONS = ['中文', 'English', '中英文']
const FORMAT_OPTIONS = ['PDF', 'DOC', 'DOCX']

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const emptyForm = {
  name: '', version: 'v1.0', target: '', language: '中文', format: 'PDF',
  fileSize: '', tags: [], versionNote: '', fileUrl: '', isDefault: false,
  fileName: '', mimeType: '', hasFile: false,
}

export default function ResumeModal({ open, resume, onClose }) {
  const { addToast, addResume, updateResume } = useApp()
  const [form, setForm] = useState(() => resume ? { ...emptyForm, ...resume } : { ...emptyForm })
  const [tagInput, setTagInput] = useState('')
  const [fileName, setFileName] = useState(() => resume?.fileName || '')
  const [selectedFile, setSelectedFile] = useState(null)
  const [saving, setSaving] = useState(false)

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

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) {
      setForm((p) => ({ ...p, tags: [...p.tags, t] }))
    }
    setTagInput('')
  }

  const removeTag = (tag) => {
    setForm((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }))
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Type validation
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_TYPES.includes(file.type) && !['pdf', 'doc', 'docx'].includes(ext)) {
      addToast('仅支持 PDF、DOC、DOCX 格式', 'error')
      e.target.value = ''
      return
    }

    // Size validation
    if (file.size > MAX_FILE_SIZE) {
      addToast('文件大小不能超过 10MB', 'error')
      e.target.value = ''
      return
    }

    const formatExt = file.name.split('.').pop()?.toUpperCase()
    const format = FORMAT_OPTIONS.includes(formatExt) ? formatExt : 'PDF'
    setSelectedFile(file)
    setFileName(file.name)
    setForm((p) => ({ ...p, format, fileSize: `${Math.round(file.size / 1024)} KB` }))
  }

  const handleSave = async () => {
    if (saving) return // prevent double submit
    if (!form.name.trim()) { addToast('请输入简历名称', 'error'); return }

    setSaving(true)

    try {
      const resumeId = resume ? resume.id : crypto.randomUUID()
      const now = new Date().toISOString().slice(0, 10)

      // Build resume metadata — preserve existing file fields when editing without re-upload
      let resumeData = {
        ...form,
        id: resumeId,
        updatedAt: now,
      }

      if (selectedFile) {
        // CASE 1: new file uploaded — save blob to IndexedDB, update all file fields
        console.log('[resume save] saving file to IndexedDB:', resumeId, selectedFile.name)
        await saveResumeFile(resumeId, selectedFile)
        resumeData = {
          ...resumeData,
          fileName: selectedFile.name,
          fileSize: `${Math.round(selectedFile.size / 1024)} KB`,
          format: selectedFile.name.split('.').pop()?.toUpperCase() || 'PDF',
          mimeType: selectedFile.type,
          hasFile: true,
          fileUrl: `indexeddb://resume-files/${resumeId}`,
        }
        console.log('[resume meta] new file metadata:', resumeData.fileName, resumeData.fileSize, resumeData.hasFile)
      } else if (resume && resume.hasFile) {
        // CASE 2: editing without re-upload — explicitly preserve original file fields
        resumeData = {
          ...resumeData,
          fileName: resume.fileName,
          fileSize: resume.fileSize,
          format: resume.format,
          mimeType: resume.mimeType,
          hasFile: true,
          fileUrl: resume.fileUrl,
        }
        console.log('[resume meta] preserved existing file fields:', resume.fileName)
      } else {
        // CASE 3: new resume without file, or editing a file-less resume without new upload
        resumeData.hasFile = false
        resumeData.fileUrl = ''
        resumeData.fileName = ''
        resumeData.mimeType = ''
      }

      if (resume) {
        await updateResume(resumeId, resumeData)
      } else {
        await addResume(resumeData)
      }

      console.log('[resume meta] saved:', resumeData.id, resumeData.hasFile)
      addToast(resume ? '简历已更新' : '简历已上传', 'success')
      onClose()
    } catch (err) {
      console.error('[resume save] error:', err)
      addToast('保存失败，请重试', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-overlay" onClick={onClose}>
      <div className="modal-panel border w-full max-w-lg mx-4 max-h-[90vh] min-h-0 flex flex-col shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
        <GlowCard style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }} className="rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1">
        <div className="bg-white/90 backdrop-blur-xl dark:bg-transparent dark:backdrop-filter-none rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1 min-h-0">
          {/* Header */}
          <ModalHeader title={resume ? '编辑简历' : '上传简历'} onClose={onClose} />

          {/* Body */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-6 pt-5 md:p-5 md:pb-7 md:pt-6" onFocus={handleFocusIn}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="简历名称 *">
                <input value={form.name} onChange={set('name')} placeholder="例如：通用技术简历" className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
              </FormField>
              <FormField label="版本号">
                <input value={form.version} onChange={set('version')} placeholder="v1.0" className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="适用岗位方向">
                <input value={form.target} onChange={set('target')} placeholder="例如：后端/全栈" className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
              </FormField>
              <FormField label="语言类型">
                <select value={form.language} onChange={set('language')} className="min-h-[40px] rounded-xl border border-slate-300 bg-gray-950 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 appearance-none cursor-pointer">
                  {LANG_OPTIONS.map((o) => <option key={o} className="bg-white text-slate-900">{o}</option>)}
                </select>
              </FormField>
            </div>

            {/* Tags */}
            <FormField label="标签">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {form.tags.map((t) => (
                  <span key={t} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1 dark:bg-offer-primary/10 dark:text-offer-accent dark:border-offer-primary/30">
                    {t}
                    <button onClick={() => removeTag(t)} className="text-purple-400 hover:text-purple-600 dark:text-offer-accent dark:hover:text-white">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="输入标签后回车" className="flex-1 h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
                <button onClick={addTag} className="px-3 h-9 rounded-xl text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all dark:bg-transparent dark:border-white/10 dark:text-offer-muted dark:hover:text-white">添加</button>
              </div>
            </FormField>

            {/* Version Note */}
            <FormField label="版本说明">
              <textarea value={form.versionNote} onChange={set('versionNote')} rows={2} placeholder="本次更新的内容说明..." className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 resize-none" />
            </FormField>

            {/* File Upload */}
            <FormField label="文件上传">
              <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-purple-400/50 transition-colors dark:border-white/20 dark:hover:border-offer-primary/50">
                {fileName ? (
                  <div className="text-sm">
                    <p className="text-slate-900 dark:text-white">{fileName}</p>
                    <p className="text-slate-500 dark:text-offer-muted text-xs mt-1">{form.format} · {form.fileSize}</p>
                    <button onClick={() => { setFileName(''); setSelectedFile(null) }}
                      className="text-xs text-purple-600 hover:text-purple-800 mt-2 dark:text-offer-accent dark:hover:text-white">重新选择</button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <svg className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-offer-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-slate-600 dark:text-offer-muted">点击选择文件</p>
                    <p className="text-xs text-slate-500 dark:text-offer-muted mt-1">支持 PDF、DOC、DOCX 格式，最大 10MB</p>
                    <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFile} className="hidden" />
                  </label>
                )}
              </div>
            </FormField>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-slate-200 p-4 dark:border-white/10 md:p-5">
            <button onClick={onClose} disabled={saving} className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium">取消</button>
            <button onClick={handleSave} disabled={saving} className="btn-gradient px-5 py-2 rounded-xl text-sm font-medium text-white">
              {saving ? '保存中...' : (resume ? '保存修改' : '上传简历')}
            </button>
          </div>
        </div>
        </GlowCard>
      </div>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div className={label === '标签' || label === '版本说明' || label === '文件上传' ? 'col-span-2' : ''}>
      <label className="text-xs text-slate-600 dark:text-offer-muted block mb-1">{label}</label>
      {children}
    </div>
  )
}
