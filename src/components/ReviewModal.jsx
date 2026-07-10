'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../store/AppContext'
import { saveReviewAttachment, deleteReviewAttachment } from '../utils/reviewAttachmentStore'
import ModalHeader from './ModalHeader'
import GlowCard from './GlowCard'
import AiResultPanel from './AiResultPanel'
import { formatLocalDate } from '../lib/dateUtils'

// 从 localStorage 读取用户自定义的 LLM 配置
function getLlmConfigFromStorage() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('offerflow_llm_config')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

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

const TAG_OPTIONS = [
  '表达不清', '逻辑混乱', '准备不足', '知识盲区',
  '项目细节不熟', '岗位理解不足', '业务思考不足', '技术能力不足',
  '数据意识不足', '反问质量低', '紧张卡壳', '薪资谈判不足',
]

const ROUNDS = ['一面', '二面', '三面', 'HR 面', '技术面', '主管面']
const TYPES = ['技术面', 'HR 面', '主管面', '行为面', '笔试', '其他']
const RESULTS = ['通过', '待定', '未通过']
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

const ALLOWED_EXTS = ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg']

function newQuestion() {
  return { id: crypto.randomUUID(), question: '', myAnswer: '', satisfaction: 3, betterAnswer: '', skills: '' }
}

function newImprovement() {
  return { id: crypto.randomUUID(), action: '', done: false }
}

export default function ReviewModal({ open, review, onClose }) {
  const { jobs, reviews, addReview, updateReview, addToast } = useApp()

  const isEdit = !!review

  // Pre-generated review ID for new reviews (needed by IndexedDB before save)
  const [pendingReviewId, setPendingReviewId] = useState(null)

  // Basic fields
  const [jobId, setJobId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [round, setRound] = useState('一面')
  const [interviewType, setInterviewType] = useState('技术面')
  const [interviewDate, setInterviewDate] = useState('')
  const [duration, setDuration] = useState('')
  const [result, setResult] = useState('待定')
  const [interviewerInfo, setInterviewerInfo] = useState('')
  const [rating, setRating] = useState(3)
  const [note, setNote] = useState('')
  const [strengths, setStrengths] = useState('')
  const [weaknesses, setWeaknesses] = useState('')

  // Scores
  const [scores, setScores] = useState({
    expression: 3, jobUnderstanding: 3, projectFamiliarity: 3,
    businessThinking: 3, technicalAbility: 3, composure: 3,
    questionQuality: 3, overall: 3,
  })

  // Questions
  const [questions, setQuestions] = useState([])

  // Tags
  const [tags, setTags] = useState([])
  const [positiveTags, setPositiveTags] = useState([])
  const [negativeTags, setNegativeTags] = useState([])

  // Improvements
  const [improvements, setImprovements] = useState([])

  // Attachments
  const fileInputRef = useRef(null)
  const [attachments, setAttachments] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('面试题')
  const [attachmentDescription, setAttachmentDescription] = useState('')

  // AI Analysis state
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiMetadata, setAiMetadata] = useState(null)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const aiMetaRef = useRef(null)

  // ESC close
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    if (review) {
      setPendingReviewId(null)
      setJobId(review.jobId || '')
      setCompanyName(review.companyName || '')
      setJobTitle(review.jobTitle || '')
      setRound(review.round || '一面')
      setInterviewType(review.interviewType || '技术面')
      setInterviewDate(review.interviewDate || '')
      setDuration(review.duration || '')
      setResult(review.result || '待定')
      setInterviewerInfo(review.interviewerInfo || '')
      setRating(review.rating || 3)
      setNote(review.note || '')
      setStrengths(review.strengths || '')
      setWeaknesses(review.weaknesses || '')
      setScores(review.scores || { expression: 3, jobUnderstanding: 3, projectFamiliarity: 3, businessThinking: 3, technicalAbility: 3, composure: 3, questionQuality: 3, overall: 3 })
      setQuestions(review.questions || [])
      setTags(review.tags || [])
      setPositiveTags(review.positiveTags || [])
      setNegativeTags(review.negativeTags || [])
      setImprovements(review.improvements || [])
      setAttachments(review.attachments || [])
    } else {
      setPendingReviewId(crypto.randomUUID())
      setJobId('')
      setCompanyName('')
      setJobTitle('')
      setRound('一面')
      setInterviewType('技术面')
      setInterviewDate(formatLocalDate())
      setDuration('')
      setResult('待定')
      setInterviewerInfo('')
      setRating(3)
      setNote('')
      setStrengths('')
      setWeaknesses('')
      setScores({ expression: 3, jobUnderstanding: 3, projectFamiliarity: 3, businessThinking: 3, technicalAbility: 3, composure: 3, questionQuality: 3, overall: 3 })
      setQuestions([])
      setTags([])
      setPositiveTags([])
      setNegativeTags([])
      setImprovements([])
      setAttachments([])
      setAiAnalyzing(false)
      setAiResult(null)
      setAiMetadata(null)
      setShowAiPanel(false)
    }
    setSelectedFiles([])
    setSelectedCategory('面试题')
    setAttachmentDescription('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [open, review])

  const handleJobChange = (id) => {
    setJobId(id)
    const job = jobs.find((j) => j.id === id)
    if (job) {
      setCompanyName(job.companyName)
      setJobTitle(job.jobTitle)
    } else {
      setCompanyName('')
      setJobTitle('')
    }
  }

  const setScore = (key, value) => {
    setScores((prev) => ({ ...prev, [key]: value }))
  }

  const toggleTag = (tag) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
    setNegativeTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  const updateQuestion = (qId, field, value) => {
    setQuestions((prev) => prev.map((q) => q.id === qId ? { ...q, [field]: value } : q))
  }

  const removeQuestion = (qId) => {
    setQuestions((prev) => prev.filter((q) => q.id !== qId))
  }

  const addQuestion = () => {
    setQuestions((prev) => [...prev, newQuestion()])
  }

  const updateImprovement = (impId, value) => {
    setImprovements((prev) => prev.map((i) => i.id === impId ? { ...i, action: value } : i))
  }

  const removeImprovement = (impId) => {
    setImprovements((prev) => prev.filter((i) => i.id !== impId))
  }

  const addImprovement = () => {
    setImprovements((prev) => [...prev, newImprovement()])
  }

  // ---- Attachments ----
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const invalid = files.find((f) => !ALLOWED_EXTS.includes(f.name.split('.').pop().toLowerCase()))
    if (invalid) {
      addToast(`${invalid.name}：仅支持 PDF、DOC、DOCX、TXT、PNG、JPG、JPEG 文件`, 'error')
      e.target.value = ''
      return
    }
    setSelectedFiles(files)
  }

  const addAttachment = async () => {
    if (selectedFiles.length === 0) { addToast('请先选择文件', 'error'); return }
    const rid = isEdit ? review.id : pendingReviewId
    const newMetas = []
    for (const file of selectedFiles) {
      const attId = crypto.randomUUID()
      console.log('[attachment before save]', { reviewId: rid, attachmentId: attId, name: file.name, size: file.size, type: file.type })
      try {
        await saveReviewAttachment(rid, attId, file)
        newMetas.push({
          id: attId,
          fileName: file.name,
          fileType: identifyFileType(file.name),
          fileSize: formatFileSize(file.size),
          sizeBytes: file.size,
          mimeType: file.type || 'application/octet-stream',
          hasFile: true,
          storageKey: `${rid}:${attId}`,
          fileCategory: selectedCategory,
          description: attachmentDescription,
          uploadDate: formatLocalDate(),
        })
      } catch (err) {
        console.error('[review attachment save failed]', file.name, err)
        addToast(`"${file.name}" 保存失败，请重试`, 'error')
      }
    }
    if (newMetas.length > 0) {
      setAttachments((prev) => [...prev, ...newMetas])
      setSelectedFiles([])
      setSelectedCategory('面试题')
      setAttachmentDescription('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      addToast(`已添加 ${newMetas.length} 个附件`, 'success')
    }
  }

  const removeAttachmentFromList = async (attId) => {
    const rid = isEdit ? review.id : pendingReviewId
    try {
      await deleteReviewAttachment(rid, attId)
      console.log('[review attachment delete]', rid, attId)
    } catch (e) {
      console.error('[review attachment delete failed]', e)
    }
    setAttachments((prev) => prev.filter((a) => a.id !== attId))
  }

  // ---- AI Analysis ----
  const handleAiAnalyze = async () => {
    if (selectedFiles.length === 0) {
      addToast('请先选择一个 .docx 文件', 'error')
      return
    }
    const docxFile = selectedFiles.find((f) => f.name.toLowerCase().endsWith('.docx'))
    if (!docxFile) {
      addToast('AI 分析仅支持 .docx 格式', 'error')
      return
    }
    if (!companyName || !jobTitle) {
      addToast('请先选择关联岗位', 'error')
      return
    }

    setAiAnalyzing(true)
    try {
      const formData = new FormData()
      formData.append('file', docxFile)
      formData.append('jobTitle', jobTitle)

      // 携带用户自定义的 LLM 配置（从 localStorage 读取）
      const llmConfig = getLlmConfigFromStorage()
      if (llmConfig) {
        formData.append('llmApiKey', llmConfig.llmApiKey || '')
        formData.append('llmBaseUrl', llmConfig.llmBaseUrl || '')
        formData.append('llmModel', llmConfig.llmModel || '')
        formData.append('llmProvider', llmConfig.llmProvider || '')
      }

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '分析失败')
      }

      const data = await res.json()
      setAiResult(data.analysis)
      setAiMetadata(data.metadata)
      setShowAiPanel(true)
      addToast('AI 分析完成，请确认结果', 'success')
    } catch (err) {
      addToast(err.message || 'AI 分析失败，请重试', 'error')
      console.error('[ai analyze error]', err)
    } finally {
      setAiAnalyzing(false)
    }
  }

  const handleApplyAiResult = (result) => {
    // Fill form with AI analysis result
    if (result.scores) setScores(result.scores)
    if (result.rating) setRating(result.rating)
    if (result.strengths) setStrengths(result.strengths)
    if (result.weaknesses) setWeaknesses(result.weaknesses)
    if (result.note) setNote(result.note)
    if (Array.isArray(result.questions)) setQuestions(result.questions)
    if (Array.isArray(result.improvements)) setImprovements(result.improvements)
    if (Array.isArray(result.tags)) setTags(result.tags)
    if (Array.isArray(result.positiveTags)) setPositiveTags(result.positiveTags)
    if (Array.isArray(result.negativeTags)) setNegativeTags(result.negativeTags)
    // Combine positive + negative into tags for backward compat display
    const combined = [
      ...(Array.isArray(result.positiveTags) ? result.positiveTags : []),
      ...(Array.isArray(result.negativeTags) ? result.negativeTags : []),
    ]
    if (combined.length > 0) setTags(combined)
    else if (Array.isArray(result.tags)) setTags(result.tags)

    // Persist AI metadata for handleSave
    aiMetaRef.current = aiMetadata

    // Add the Word file as an attachment with isSourceForAi flag
    const sourceAtt = {
      id: crypto.randomUUID(),
      fileName: selectedFiles[0].name,
      fileType: 'DOCX',
      fileSize: formatFileSize(selectedFiles[0].size),
      sizeBytes: selectedFiles[0].size,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      hasFile: true,
      fileCategory: '复盘文档',
      description: 'AI 分析源文件',
      uploadDate: formatLocalDate(),
      isSourceForAi: true,
    }
    setAttachments((prev) => [...prev, sourceAtt])

    setShowAiPanel(false)
    setAiResult(null)
    setSelectedFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    addToast('AI 结果已应用到表单', 'success')
  }

  const handleSave = () => {
    if (!companyName) { addToast('请选择关联岗位', 'error'); return }

    // Determine reviewId once — used for both IndexedDB keys and state
    const reviewId = isEdit ? review.id : (pendingReviewId || crypto.randomUUID())
    console.log('[review id]', reviewId)

    // Compute overall rating from average of scores
    const vals = Object.values(scores)
    const avgRating = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)

    const data = {
      id: reviewId,
      companyName, jobTitle, jobId: jobId || '',
      round, interviewType, interviewDate, duration, interviewerInfo,
      result, rating: avgRating, note, strengths, weaknesses,
      scores, questions, tags,
      positiveTags, negativeTags,
      improvements: improvements.filter((i) => i.action.trim()),
      attachments,
      aiAnalysis: aiMetaRef.current ? {
        metadata: aiMetaRef.current,
        userModified: true,
      } : null,
      updatedAt: new Date().toISOString(),
    }
    console.log('[review attachments meta]', attachments.length, 'items')

    if (isEdit) {
      updateReview(reviewId, data)
      addToast('复盘已更新', 'success')
    } else {
      addReview(data)
      addToast('复盘已创建', 'success')
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

  const activeJobs = jobs.filter((j) => j.status !== '已结束')

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-overlay" onClick={onClose}>
      <div className="modal-panel border w-full max-w-2xl mx-4 max-h-[90vh] min-h-0 flex flex-col shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
        <GlowCard style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }} className="rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1">
        <div className="bg-white/90 backdrop-blur-xl dark:bg-transparent dark:backdrop-filter-none rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <ModalHeader title={isEdit ? '编辑复盘' : '新建复盘'} onClose={onClose} />

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-4 pb-6 pt-5 md:p-5 md:pb-7 md:pt-6" onFocus={handleFocusIn}>
          {/* ===== 基本信息 ===== */}
          <Section title="基本信息">
            <div className="space-y-4">
              {/* Job */}
              <Field label="关联岗位">
                <select value={jobId} onChange={(e) => handleJobChange(e.target.value)}
                  className="min-h-[40px] rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 appearance-none cursor-pointer">
                  <option value="" className="bg-gray-950">请选择岗位</option>
                  {activeJobs.map((j) => (
                    <option key={j.id} value={j.id} className="bg-gray-950">{j.companyName} - {j.jobTitle}</option>
                  ))}
                </select>
              </Field>
              {companyName && (
                <div className="flex items-center gap-4 text-sm bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 dark:bg-white/[0.02] dark:border-white/[0.06]">
                  <span className="text-offer-accent font-medium">{companyName}</span>
                  <span className="text-white/45">/</span>
                  <span className="text-white">{jobTitle}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="面试轮次">
                  <select value={round} onChange={(e) => setRound(e.target.value)}
                    className="min-h-[40px] rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 appearance-none cursor-pointer">
                    {ROUNDS.map((o) => <option key={o} className="bg-gray-950">{o}</option>)}
                  </select>
                </Field>
                <Field label="面试类型">
                  <select value={interviewType} onChange={(e) => setInterviewType(e.target.value)}
                    className="min-h-[40px] rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 appearance-none cursor-pointer">
                    {TYPES.map((o) => <option key={o} className="bg-gray-950">{o}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="面试时间">
                  <input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)}
                    className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
                </Field>
                <Field label="面试时长">
                  <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="如：1小时"
                    className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="面试结果">
                  <select value={result} onChange={(e) => setResult(e.target.value)}
                    className="min-h-[40px] rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 appearance-none cursor-pointer">
                    {RESULTS.map((o) => <option key={o} className="bg-gray-950">{o}</option>)}
                  </select>
                </Field>
                <Field label="整体评分">
                  <div className="flex items-center gap-1 h-9">
                    <StarRating value={rating} onChange={setRating} />
                    <span className="text-sm text-offer-muted ml-1">{rating} / 5</span>
                  </div>
                </Field>
              </div>

              <Field label="面试官信息">
                <input value={interviewerInfo} onChange={(e) => setInterviewerInfo(e.target.value)} placeholder="姓名、职位等"
                  className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
              </Field>

              <Field label="优势">
                <input value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="做得好的地方"
                  className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
              </Field>

              <Field label="不足">
                <input value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} placeholder="需要改进的地方"
                  className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
              </Field>

              <Field label="备注">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="面试整体记录和感受..."
                  className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 resize-none" />
              </Field>
            </div>
          </Section>

          {/* ===== 多维评分 ===== */}
          <Section title="多维评分">
            <div className="space-y-2">
              {Object.entries(SCORE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-3 py-1">
                  <span className="text-sm text-offer-muted w-28 shrink-0">{label}</span>
                  <div className="flex items-center gap-1">
                    <StarRating value={scores[key]} onChange={(v) => setScore(key, v)} />
                  </div>
                  <span className="text-xs text-offer-muted w-4">{scores[key]}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ===== 面试问题 ===== */}
          <Section title="面试问题" action={
            <button onClick={addQuestion} className="text-xs text-offer-accent hover:text-offer-primary transition-colors flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加问题
            </button>
          }>
            <div className="space-y-3">
              {questions.length === 0 && (
                <p className="text-sm text-offer-muted/50 text-center py-3">暂无面试问题，点击"添加问题"开始记录</p>
              )}
              {questions.map((q, idx) => (
                <div key={q.id} className="card-glow bg-slate-50 rounded-xl p-4 border border-slate-200 dark:bg-white/[0.02] dark:border-white/[0.06]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-offer-muted font-medium">问题 {idx + 1}</span>
                    <button onClick={() => removeQuestion(q.id)}
                      className="text-xs text-offer-muted hover:text-red-400 transition-colors">删除</button>
                  </div>
                  <div className="space-y-3">
                    <Field label="问题原文">
                      <textarea value={q.question} onChange={(e) => updateQuestion(q.id, 'question', e.target.value)} rows={2} placeholder="面试官提出的问题..."
                        className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 resize-none" />
                    </Field>
                    <Field label="我的回答">
                      <textarea value={q.myAnswer} onChange={(e) => updateQuestion(q.id, 'myAnswer', e.target.value)} rows={2} placeholder="你的回答..."
                        className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 resize-none" />
                    </Field>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Field label="回答满意度">
                        <div className="flex items-center gap-1 h-9">
                          <StarRating value={q.satisfaction} onChange={(v) => updateQuestion(q.id, 'satisfaction', v)} />
                          <span className="text-xs text-offer-muted ml-1">{q.satisfaction}/5</span>
                        </div>
                      </Field>
                      <Field label="涉及能力点">
                        <input value={q.skills} onChange={(e) => updateQuestion(q.id, 'skills', e.target.value)} placeholder="如：Java, 分布式"
                          className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
                      </Field>
                    </div>
                    <Field label="更好的回答">
                      <textarea value={q.betterAnswer} onChange={(e) => updateQuestion(q.id, 'betterAnswer', e.target.value)} rows={2} placeholder="事后思考，怎样回答会更好..."
                        className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 resize-none" />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ===== 问题标签 ===== */}
          <Section title="问题标签">
            <div className="flex gap-2 flex-wrap">
              {TAG_OPTIONS.map((tag) => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${tags.includes(tag) ? 'bg-offer-primary text-white border-offer-primary' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}>{tag}</button>
              ))}
            </div>
          </Section>

          {/* ===== 改进动作 ===== */}
          <Section title="改进动作" action={
            <button onClick={addImprovement} className="text-xs text-offer-accent hover:text-offer-primary transition-colors flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加动作
            </button>
          }>
            <div className="space-y-2">
              {improvements.length === 0 && (
                <p className="text-sm text-offer-muted/50 text-center py-3">暂无改进动作</p>
              )}
              {improvements.map((imp) => (
                <div key={imp.id} className="flex items-center gap-2">
                  <input value={imp.action} onChange={(e) => updateImprovement(imp.id, e.target.value)} placeholder="具体的改进行动..."
                    className="min-h-[40px] flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
                  <button onClick={() => removeImprovement(imp.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-offer-muted hover:text-red-400 hover:bg-white/10 transition-all shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* ===== 面试资料 ===== */}
          <Section title="面试资料">
            <div className="space-y-3">
              {/* Upload */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 dark:bg-white/[0.02] dark:border-white/[0.06]">
                <input type="file" ref={fileInputRef} onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" className="hidden" multiple />
                {selectedFiles.length === 0 ? (
                  <div>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="btn-gradient h-9 px-4 rounded-lg text-white text-xs font-medium flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      上传文件
                    </button>
                    <p className="text-[10px] text-offer-muted mt-1.5">支持 PDF、DOC、DOCX、TXT、PNG、JPG、JPEG 格式</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <FileTypeBadge type={identifyFileType(f.name)} />
                          <span className="text-white truncate">{f.name}</span>
                          <span className="text-offer-muted text-xs shrink-0">({formatFileSize(f.size)})</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                        className="min-h-[40px] rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 appearance-none cursor-pointer">
                        {FILE_CATEGORIES.map((c) => <option key={c} className="bg-gray-950">{c}</option>)}
                      </select>
                      <input value={attachmentDescription} onChange={(e) => setAttachmentDescription(e.target.value)}
                        placeholder="文件说明" maxLength={100}
                        className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addAttachment}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-offer-primary text-white hover:bg-offer-accent transition-colors">添加到复盘</button>
                      {selectedFiles.some((f) => f.name.toLowerCase().endsWith('.docx')) && (
                        <button onClick={handleAiAnalyze} disabled={aiAnalyzing}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:cursor-not-allowed flex items-center gap-1.5 ${aiAnalyzing ? 'ai-pulse bg-purple-700' : 'bg-purple-600 hover:bg-purple-500'}`}>
                          {aiAnalyzing ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              <span className="ai-dots">AI 正在分析<span>.</span><span>.</span><span>.</span></span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              AI 分析
                            </>
                          )}
                        </button>
                      )}
                      <button onClick={() => { setSelectedFiles([]); setAttachmentDescription(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                        className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium text-offer-muted border border-white/10 hover:text-white transition-colors">取消</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Attachment List */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div key={att.id} className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 dark:bg-white/[0.02] dark:border-white/[0.06]">
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
                          {att.description && (
                            <p className="text-xs text-offer-muted/70 mt-1">{att.description}</p>
                          )}
                        </div>
                        <button onClick={() => removeAttachmentFromList(att.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-offer-muted hover:text-red-400 hover:bg-white/10 transition-all shrink-0 ml-2">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 p-4 dark:border-white/10 md:p-5">
          <button onClick={onClose}
            className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium">取消</button>
          <button onClick={handleSave}
            className="btn-gradient px-4 py-2 rounded-xl text-sm font-medium text-white">{isEdit ? '保存' : '创建'}</button>
        </div>
        </div>
      </GlowCard>
      </div>
    </div>

      {/* AI Result Panel Overlay */}
      {showAiPanel && aiResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAiPanel(false)}>
          <div className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <AiResultPanel
              analysis={aiResult}
              metadata={aiMetadata}
              onApply={handleApplyAiResult}
              onCancel={() => setShowAiPanel(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}

/* ===== Sub-components (module level for stability) ===== */

function Section({ title, action, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-white/45 uppercase tracking-wider">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-offer-muted block mb-1">{label}</label>
      {children}
    </div>
  )
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)}
          className="p-0.5 transition-colors hover:scale-105">
          <svg className={`w-4 h-4 ${star <= value ? 'text-amber-400' : 'text-offer-muted/30'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  )
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
