'use client'
import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../store/AppContext'
import { getReviewAttachment, deleteReviewAttachment } from '../utils/reviewAttachmentStore'
import ModalHeader from './ModalHeader'
import GlowCard from './GlowCard'

const SCORE_LABELS = {
  expression: '表达清晰度',
  jobUnderstanding: '岗位理解',
  projectFamiliarity: '项目熟悉度',
  businessThinking: '业务思考',
  technicalAbility: '技术 / 专业能力',
  composure: '临场状态',
  questionQuality: '反问质量',
  overall: '整体表现',
}

const FILE_CATEGORIES = ['面试题', 'JD / 岗位说明', '笔试资料', '准备资料', '作品集', '复盘文档', '截图 / 图片', '其他']

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 KB'
  const kb = bytes / 1024
  if (kb < 1024) return kb.toFixed(1) + ' KB'
  return (kb / 1024).toFixed(1) + ' MB'
}

function identifyFileType(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const map = { pdf: 'PDF', doc: 'DOCX', docx: 'DOCX', txt: 'TXT', png: 'PNG', jpg: 'JPG', jpeg: 'JPG' }
  return map[ext] || 'OTHER'
}

function resultStyle(result) {
  switch (result) {
    case '通过': return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 border-emerald-200'
    case '待定': return 'text-amber-700 dark:text-amber-400 bg-amber-50 border-amber-200'
    default: return 'text-red-700 dark:text-red-400 bg-red-50 border-red-200'
  }
}

function normalizeAttachments(atts) {
  if (!Array.isArray(atts)) return []
  return atts.filter((a) => a && typeof a === 'object')
}

export default function ReviewDetailModal({ open, review, onClose, onEdit, onDelete }) {
  const { reviews: allReviews, addToast, updateReview } = useApp()
  const liveReview = allReviews.find((r) => r.id === review?.id) || review

  const [editingDescId, setEditingDescId] = useState(null)
  const [editingDescValue, setEditingDescValue] = useState('')
  const [confirmDeleteAttId, setConfirmDeleteAttId] = useState(null)

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

  if (!open || !review) return null
  if (!liveReview) return null

  const scores = liveReview.scores || {}
  const questions = Array.isArray(liveReview.questions) ? liveReview.questions : []
  const tags = Array.isArray(liveReview.tags) ? liveReview.tags : []
  const positiveTags = Array.isArray(liveReview.positiveTags) ? liveReview.positiveTags : []
  const negativeTags = Array.isArray(liveReview.negativeTags) ? liveReview.negativeTags : []
  const improvements = Array.isArray(liveReview.improvements) ? liveReview.improvements : []
  const attachments = normalizeAttachments(liveReview.attachments)

  const scoreKeys = Object.keys(SCORE_LABELS)

  const handleDeleteAttachment = async (attId) => {
    try {
      const att = attachments.find((a) => a.id === attId)
      if (att?.hasFile) {
        await deleteReviewAttachment(liveReview.id, attId)
      }
    } catch (e) {
      console.error('[review attachment delete failed]', e)
    }
    const updatedAttachments = normalizeAttachments(liveReview.attachments).filter((a) => a.id !== attId)
    await updateReview(liveReview.id, { attachments: updatedAttachments })
    setConfirmDeleteAttId(null)
    addToast('附件已删除', 'success')
  }

  const handleOpenAttachment = async (att) => {
    try {
      if (!review?.id || !att?.id) {
        addToast?.('附件信息不完整', 'error')
        return
      }
      if (!att.hasFile) {
        addToast?.('附件文件已丢失，请重新上传', 'error')
        return
      }
      const blob = await getReviewAttachment(liveReview.id, att.id)
      if (!blob) {
        addToast?.('附件文件已丢失，请重新上传', 'error')
        return
      }
      const url = URL.createObjectURL(blob)
      if (att.mimeType?.includes('pdf') || att.mimeType?.startsWith('image/')) {
        window.open(url, '_blank', 'noopener,noreferrer')
        setTimeout(() => URL.revokeObjectURL(url), 30000)
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = att.fileName || 'attachment'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('[review attachment open failed]', error)
      addToast?.('附件打开失败，请重新上传', 'error')
    }
  }

  const startEditDesc = (att) => {
    setEditingDescId(att.id)
    setEditingDescValue(att.description || '')
  }

  const saveEditDesc = async (attId) => {
    const updatedAttachments = normalizeAttachments(liveReview.attachments).map((a) =>
      a.id === attId ? { ...a, description: editingDescValue } : a
    )
    await updateReview(liveReview.id, { attachments: updatedAttachments })
    setEditingDescId(null)
    setEditingDescValue('')
    addToast('文件说明已更新', 'success')
  }

  const cancelEditDesc = () => {
    setEditingDescId(null)
    setEditingDescValue('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-overlay" onClick={onClose}>
      <div className="modal-panel border w-full max-w-2xl mx-4 max-h-[90vh] min-h-0 flex flex-col shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
        <GlowCard style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }} className="rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1">
        <div className="bg-white/90 backdrop-blur-xl dark:bg-transparent dark:backdrop-filter-none rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <ModalHeader onClose={onClose}>
          <div className="flex flex-col items-center min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="truncate text-base font-semibold leading-normal text-slate-950 dark:text-white">{liveReview.companyName}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${resultStyle(liveReview.result)}`}>{liveReview.result}</span>
            </div>
            <p className="truncate text-sm font-medium leading-normal text-slate-600 dark:text-slate-300">{liveReview.jobTitle} · {liveReview.round} · {liveReview.interviewType}</p>
          </div>
        </ModalHeader>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-4 pb-6 pt-5 md:p-5 md:pb-7 md:pt-6" onFocus={handleFocusIn}>

          {/* Info */}
          <div>
            <SectionTitle>基本信息</SectionTitle>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              <InfoRow label="面试日期" value={liveReview.interviewDate || '-'} />
              <InfoRow label="面试时长" value={liveReview.duration || '-'} />
              <InfoRow label="整体评分" value={<span className="flex items-center gap-1">{renderStars(liveReview.rating)} <span className="text-offer-muted text-xs">({liveReview.rating}/5)</span></span>} />
              {liveReview.interviewerInfo && <InfoRow label="面试官" value={liveReview.interviewerInfo} />}
              {liveReview.strengths && <InfoRow label="优势" value={liveReview.strengths} className="text-emerald-400" />}
              {liveReview.weaknesses && <InfoRow label="不足" value={liveReview.weaknesses} className="text-red-400" />}
            </div>
            {liveReview.note && (
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 dark:bg-white/[0.02] dark:border-white/[0.06]">
                <p className="text-xs text-white/45 mb-1">备注</p>
                <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{liveReview.note}</p>
              </div>
            )}
          </div>

          {/* Multidimensional Scores */}
          {scoreKeys.some((k) => scores[k] != null) && (
            <div>
              <SectionTitle>多维评分</SectionTitle>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {scoreKeys.map((key) => {
                  const val = scores[key]
                  if (val == null) return null
                  return (
                    <div key={key} className="flex items-center justify-between py-0.5">
                      <span className="text-sm text-offer-muted">{SCORE_LABELS[key]}</span>
                      <span className="text-sm text-white font-medium">{val}/5</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Questions */}
          {questions.length > 0 && (
            <div>
              <SectionTitle>面试问题 ({questions.length})</SectionTitle>
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={q.id} className="card-glow bg-slate-50 rounded-xl p-4 border border-slate-200 dark:bg-white/[0.02] dark:border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-offer-muted font-medium">问题 {idx + 1}</span>
                      {q.skills && <span className="text-[10px] text-offer-accent/70 bg-offer-primary/10 px-2 py-0.5 rounded-full">{q.skills}</span>}
                    </div>
                    <div className="space-y-2">
                      <DetailBlock label="问题" value={q.question} />
                      {q.myAnswer && <DetailBlock label="我的回答" value={q.myAnswer} />}
                      {q.satisfaction && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-offer-muted">回答满意度：</span>
                          <span className="flex items-center gap-0.5">{renderStars(q.satisfaction)}</span>
                          <span className="text-offer-muted">({q.satisfaction}/5)</span>
                        </div>
                      )}
                      {q.betterAnswer && <DetailBlock label="更好的回答" value={q.betterAnswer} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Positive Tags */}
          {positiveTags.length > 0 && (
            <div>
              <SectionTitle>优势标签</SectionTitle>
              <div className="flex gap-2 flex-wrap">
                {positiveTags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Negative Tags / Problem Tags */}
          {(negativeTags.length > 0 || tags.length > 0) && (
            <div>
              <SectionTitle>问题标签</SectionTitle>
              <div className="flex gap-2 flex-wrap">
                {(negativeTags.length > 0 ? negativeTags : tags).map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Improvements */}
          {improvements.length > 0 && (
            <div>
              <SectionTitle>改进动作 ({improvements.filter((i) => i.action).length})</SectionTitle>
              <div className="space-y-1.5">
                {improvements.filter((i) => i.action).map((imp) => (
                  <div key={imp.id} className="flex items-center gap-2 text-sm">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${imp.done ? 'border-offer-primary bg-offer-primary' : 'border-offer-muted'}`}>
                      {imp.done && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={imp.done ? 'text-offer-muted line-through' : 'text-white'}>{imp.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div>
              <SectionTitle>面试资料 ({attachments.length})</SectionTitle>
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div key={att.id} className="card-glow bg-slate-50 rounded-xl p-4 border border-slate-200 dark:bg-white/[0.02] dark:border-white/[0.06]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileTypeBadge type={att.fileType} />
                          <span className="text-sm text-white truncate">{att.fileName}</span>
                          <span className="text-xs text-offer-muted shrink-0">{att.fileSize}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-offer-muted">
                          <span className="bg-offer-primary/10 text-offer-accent px-1.5 py-0.5 rounded">{att.fileCategory}</span>
                          <span>{att.uploadDate}</span>
                        </div>
                        {editingDescId === att.id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input value={editingDescValue} onChange={(e) => setEditingDescValue(e.target.value)}
                              maxLength={100} autoFocus
                              className="min-h-[28px] flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
                            <button onClick={() => saveEditDesc(att.id)}
                              className="text-xs text-offer-accent hover:text-offer-primary">保存</button>
                            <button onClick={cancelEditDesc}
                              className="text-xs text-offer-muted hover:text-white">取消</button>
                          </div>
                        ) : (
                          att.description && <p className="text-xs text-offer-muted/70 mt-1">{att.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                      <button onClick={() => handleOpenAttachment(att)}
                        className="text-xs text-offer-accent hover:text-offer-primary transition-colors">预览</button>
                      <button onClick={() => startEditDesc(att)}
                        className="text-xs text-offer-muted hover:text-white transition-colors">编辑说明</button>
                      <button onClick={() => setConfirmDeleteAttId(att.id)}
                        className="text-xs text-offer-muted hover:text-red-400 transition-colors">删除</button>
                    </div>

                    {/* Inline confirm delete */}
                    {confirmDeleteAttId === att.id && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 bg-red-500/5 rounded-lg px-2 py-1">
                        <span className="text-xs text-red-400">确认删除此附件？</span>
                        <button onClick={() => handleDeleteAttachment(att.id)}
                          className="text-xs text-red-400 hover:text-red-300 font-medium">确认</button>
                        <button onClick={() => setConfirmDeleteAttId(null)}
                          className="text-xs text-offer-muted hover:text-white">取消</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 p-4 dark:border-white/10 md:p-5">
          <button onClick={() => { onClose(); onDelete(review) }}
            className="btn-danger text-sm text-slate-500 dark:text-offer-muted hover:text-red-400 transition-colors flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除
          </button>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium">关闭</button>
            <button onClick={() => { onClose(); onEdit(liveReview) }}
              className="btn-gradient px-4 py-2 rounded-xl text-sm font-medium text-white">编辑复盘</button>
          </div>
        </div>
        </div>
      </GlowCard>
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return <h3 className="text-xs font-semibold text-slate-500 dark:text-white/45 uppercase tracking-wider mb-3">{children}</h3>
}

function InfoRow({ label, value, className = '' }) {
  return (
    <div className="bento-block">
      <p className="text-xs text-slate-500 dark:text-white/45">{label}</p>
      <p className={`text-sm mt-0.5 ${className || 'text-slate-900 dark:text-white'}`}>{value}</p>
    </div>
  )
}

function DetailBlock({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-white/45 mb-0.5">{label}</p>
      <p className="text-sm text-slate-900 dark:text-white leading-relaxed">{value}</p>
    </div>
  )
}

function renderStars(count) {
  return Array.from({ length: 5 }, (_, i) => (
    <svg key={i} className={`w-3 h-3 ${i < count ? 'text-amber-400' : 'text-offer-muted/20'}`} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ))
}

function FileTypeBadge({ type }) {
  const colorMap = {
    PDF: 'text-red-700 dark:text-red-400 bg-red-50',
    DOCX: 'text-blue-700 dark:text-blue-400 bg-blue-50',
    TXT: 'text-green-700 dark:text-green-400 bg-green-50',
    PNG: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50',
    JPG: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50',
  }
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${colorMap[type] || 'text-offer-muted bg-white/80'}`}>{type}</span>
  )
}
