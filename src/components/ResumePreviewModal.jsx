'use client'
import { useEffect, useState } from 'react'
import { getResumeFile } from '../utils/resumeFileStore'
import ModalHeader from './ModalHeader'
import GlowCard from './GlowCard'

export default function ResumePreviewModal({ open, resume, onClose }) {
  const [objectUrl, setObjectUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fileError, setFileError] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (!open || !resume?.hasFile) return

    let cancelled = false
    let url = null

    const loadFile = async () => {
      setLoading(true)
      setFileError(false)
      try {
        console.log('[resume preview] loading file for resume:', resume.id, resume.fileName)
        const blob = await getResumeFile(resume.id)
        if (cancelled) return
        if (blob) {
          url = URL.createObjectURL(blob)
          setObjectUrl(url)
          console.log('[resume preview] blob loaded, url created:', url)
        } else {
          console.warn('[resume preview] blob is null/undefined for', resume.id)
          setFileError(true)
        }
      } catch (err) {
        console.error('[resume preview] load error:', err)
        if (!cancelled) setFileError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadFile()

    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
      setObjectUrl(null)
      setFileError(false)
    }
  }, [open, resume?.id, resume?.hasFile])

  const handleDownload = async () => {
    if (objectUrl) {
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = resume.fileName || `${resume.name}.${resume.format?.toLowerCase() || 'pdf'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else if (resume?.hasFile) {
      // Fallback: try loading the file first
      try {
        const blob = await getResumeFile(resume.id)
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = resume.fileName || `${resume.name}.${resume.format?.toLowerCase() || 'pdf'}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          setTimeout(() => URL.revokeObjectURL(url), 60000)
        }
      } catch { /* ignore */ }
    }
  }

  if (!open || !resume) return null

  const formatColor =
    resume.format === 'PDF' ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10'
    : resume.format === 'DOCX' ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
    : resume.format === 'DOC' ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10'
    : 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10'

  const isPdf = resume.format === 'PDF' && objectUrl

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-overlay" onClick={onClose}>
      <div className="modal-panel border w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
        <GlowCard style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }} className="rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1">
        <div className="bg-white/90 backdrop-blur-xl dark:bg-transparent dark:backdrop-filter-none rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <ModalHeader onClose={onClose}>
          <div className="flex flex-col items-center min-w-0">
            <h2 className="truncate text-base font-semibold leading-normal text-slate-950 dark:text-white">{resume.name}</h2>
            <p className="truncate text-sm font-medium leading-normal text-slate-500 dark:text-white/55">{resume.version} · 更新于 {resume.updatedAt}</p>
          </div>
        </ModalHeader>

        {/* File Info */}
        <div className="px-5 pt-4 flex items-center gap-4">
          <div className={`w-12 h-14 rounded-xl flex items-center justify-center text-xs font-bold ${formatColor}`}>{resume.format}</div>
          <div>
            <p className="text-slate-900 dark:text-white text-sm font-medium">{resume.fileName || `${resume.name}.${resume.format?.toLowerCase() || 'pdf'}`}</p>
            <p className="text-slate-500 dark:text-offer-muted text-xs mt-0.5">
              {resume.format} · {resume.fileSize || '未知大小'} · {resume.language}
              {resume.target && ` · ${resume.target}`}
            </p>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {loading ? (
            <div className="rounded-2xl p-6 border border-white/5 min-h-[300px] flex items-center justify-center">
              <p className="text-slate-500 dark:text-offer-muted text-sm">正在加载文件...</p>
            </div>
          ) : fileError ? (
            <div className="rounded-2xl p-6 border border-white/5 min-h-[300px] flex flex-col items-center justify-center">
              <svg className="w-12 h-12 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-red-500 dark:text-red-400 text-sm mb-1">文件已丢失</p>
              <p className="text-slate-500 dark:text-offer-muted text-xs">请重新上传该简历文件</p>
            </div>
          ) : isPdf ? (
            <iframe
              src={objectUrl}
              className="w-full rounded-2xl border border-white/5 min-h-[400px]"
              title="PDF 预览"
            />
          ) : resume.hasFile ? (
            <div className="rounded-2xl p-6 border border-white/5 min-h-[300px] flex flex-col items-center justify-center">
              <svg className="w-16 h-16 text-slate-300 dark:text-offer-muted/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-600 dark:text-offer-muted text-sm mb-1">无法直接预览 {resume.format} 文件</p>
              <p className="text-slate-400 dark:text-white/45 text-xs mb-3">请下载后查看</p>
              <button onClick={handleDownload} className="btn-gradient px-4 py-2 rounded-xl text-sm font-medium text-white">
                下载文件
              </button>
            </div>
          ) : (
            <div className="rounded-2xl p-6 border border-white/5 min-h-[300px] flex flex-col items-center justify-center">
              <svg className="w-16 h-16 text-slate-300 dark:text-offer-muted/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-600 dark:text-offer-muted text-sm mb-1">无文件</p>
              <p className="text-slate-400 dark:text-white/45 text-xs">该简历版本未上传文件</p>
            </div>
          )}

          {/* Version Note */}
          {resume.versionNote && (
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 dark:bg-offer-primary/10 dark:border-offer-primary/20">
              <p className="text-xs text-slate-500 dark:text-offer-muted mb-1">版本说明</p>
              <p className="text-sm text-slate-900 dark:text-white">{resume.versionNote}</p>
            </div>
          )}

          {/* Tags */}
          {resume.tags && resume.tags.length > 0 && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {resume.tags.map((t) => (
                <span key={t} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full dark:bg-offer-primary/10 dark:text-offer-accent dark:border-offer-primary/30">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 p-4 dark:border-white/10 md:p-5">
          {objectUrl && (
            <button
              onClick={handleDownload}
              className="btn-gradient px-4 py-2 rounded-xl text-sm font-medium text-white"
            >
              下载文件
            </button>
          )}
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium"
          >
            关闭
          </button>
        </div>
        </div>
        </GlowCard>
      </div>
    </div>
  )
}
