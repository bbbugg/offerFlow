'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { generateMockData, defaultSettings } from './mockData'
import { deleteReviewAttachmentsByReviewId } from '../utils/reviewAttachmentStore'
import Toast from '../components/Toast'
import { useAuth } from './AuthContext'

const AppContext = createContext(null)

const ROUND_ORDER = ['一面', '二面', '三面', '终面']
const STATUS_ROUND_MAP = { '一面中': '一面', '二面中': '二面', '三面中': '三面', '终面中': '终面' }
const INTERVIEW_STATUS_ORDER = ['一面中', '二面中', '三面中', '终面中']

// ---- Centralized statistics helpers ----

export const APPLIED_STATUSES = ['已投递', 'OA / 笔试', '一面中', '二面中', '三面中', '终面中', 'Offer', '已结束']
export const REPLIED_STATUSES = ['OA / 笔试', '一面中', '二面中', '三面中', '终面中', 'Offer']
export const INTERVIEW_STATUSES = ['一面中', '二面中', '三面中', '终面中']

export function isAppliedJob(job) {
  return APPLIED_STATUSES.includes(job.status)
}

export function isRepliedJob(job) {
  if (REPLIED_STATUSES.includes(job.status)) return true
  if (job.status === '已结束') {
    if (!job.endReason) return true
    return ['被拒绝', '岗位关闭', '其他'].includes(job.endReason)
  }
  return false
}

export function hasOaExperience(job) {
  if (job.status === 'OA / 笔试') return true
  return (job.timeline || []).some((item) => {
    const text = `${item.action || ''} ${item.detail || ''}`
    return text.includes('OA') || text.includes('笔试')
  })
}

export function hasInterviewExperience(job) {
  if (Array.isArray(job.interviewRounds) && job.interviewRounds.length > 0) return true
  return INTERVIEW_STATUSES.includes(job.status) || job.status === 'Offer'
}

export function getFallbackInterviewRounds(job) {
  if (Array.isArray(job.interviewRounds) && job.interviewRounds.length > 0) return job.interviewRounds
  if (job.status === '一面中') return [{ round: '一面', status: '进行中' }]
  if (job.status === '二面中') return [{ round: '一面', status: '已通过' }, { round: '二面', status: '进行中' }]
  if (job.status === '三面中') return [{ round: '一面', status: '已通过' }, { round: '二面', status: '已通过' }, { round: '三面', status: '进行中' }]
  if (job.status === '终面中') return [{ round: '一面', status: '已通过' }, { round: '二面', status: '已通过' }, { round: '三面', status: '已通过' }, { round: '终面', status: '进行中' }]
  if (job.status === 'Offer') return [{ round: '一面', status: '已通过' }]
  return []
}

export function getInterviewRoundCount(job) {
  return getFallbackInterviewRounds(job).length
}

export function canSelectInterviewStatus(job, targetStatus) {
  const targetIndex = INTERVIEW_STATUS_ORDER.indexOf(targetStatus)
  if (targetIndex === -1) return true

  const currentIndex = INTERVIEW_STATUS_ORDER.indexOf(job.status)
  const rounds = Array.isArray(job.interviewRounds) ? job.interviewRounds : []
  const roundIndex = rounds.reduce((highest, round) => {
    const status = Object.entries(STATUS_ROUND_MAP).find(([, label]) => label === round.round)?.[0]
    return Math.max(highest, INTERVIEW_STATUS_ORDER.indexOf(status))
  }, -1)

  return targetIndex <= Math.max(currentIndex, roundIndex) + 1
}

export function isOfferJob(job) {
  return job.status === 'Offer'
}

export function getResumeStats(resumeId, jobs) {
  const linked = jobs.filter((j) => j.resumeId === resumeId)
  const sentCount = linked.filter(isAppliedJob).length
  const replyCount = linked.filter(isRepliedJob).length
  const interviewPeopleCount = linked.filter(hasInterviewExperience).length
  const interviewRoundCount = linked.reduce((sum, j) => sum + getInterviewRoundCount(j), 0)
  const offerCount = linked.filter(isOfferJob).length
  return {
    sentCount, replyCount, interviewPeopleCount, interviewRoundCount, offerCount,
    interviewRate: sentCount > 0 ? Math.round((interviewPeopleCount / sentCount) * 100) : 0,
    offerRate: sentCount > 0 ? Math.round((offerCount / sentCount) * 100) : 0,
  }
}

export function syncInterviewRounds(job) {
  const rounds = [...(job.interviewRounds || [])]
  const status = job.status
  const targetRound = STATUS_ROUND_MAP[status]

  if (targetRound && !rounds.some(r => r.round === targetRound)) {
    rounds.push({
      id: crypto.randomUUID(),
      round: targetRound,
      status: '进行中',
      date: new Date().toISOString().slice(0, 10),
      result: '',
      notes: '',
    })
  }

  if (targetRound && ['二面中', '三面中', '终面中'].includes(status)) {
    const currentIdx = ROUND_ORDER.indexOf(targetRound)
    for (let i = 0; i < currentIdx; i++) {
      const prev = rounds.find(r => r.round === ROUND_ORDER[i])
      if (prev && prev.status === '进行中') {
        prev.status = '已通过'
      }
    }
  }

  if (status === 'Offer') {
    for (let i = ROUND_ORDER.length - 1; i >= 0; i--) {
      const found = rounds.find(r => r.round === ROUND_ORDER[i] && r.status === '进行中')
      if (found) { found.status = '已通过'; break }
    }
  }

  return { ...job, interviewRounds: rounds }
}

function migrateJobs(jobs) {
  return jobs.map((j) => {
    let updated = { ...j }
    if (updated.status === '面试中') {
      updated.status = '一面中'
    }
    return syncInterviewRounds(updated)
  })
}

// ---- API helper ----

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}

// ---- localStorage helpers ----

function loadFromStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return fallback
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch { /* ignore */ }
}

export function AppProvider({ children }) {
  const { user, loading: authLoading } = useAuth()

  const [jobs, setJobsRaw] = useState([])
  const [resumes, setResumesRaw] = useState([])
  const [tasks, setTasksRaw] = useState([])
  const [reviews, setReviewsRaw] = useState([])
  const [settings, setSettingsRaw] = useState(() => {
    if (typeof window === 'undefined') return defaultSettings
    return loadFromStorage('offerFlow_settings', defaultSettings)
  })
  const [dataLoading, setDataLoading] = useState(true)
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  // ---- Data loading: re-fetch when auth state changes (login/logout) ----
  useEffect(() => {
    if (authLoading) return
    loadAllData()
  }, [user?.id, authLoading])

  async function loadAllData() {
    setDataLoading(true)
    try {
      let [j, r, t, rv] = await Promise.all([
        apiFetch('/api/jobs'),
        apiFetch('/api/resumes'),
        apiFetch('/api/tasks'),
        apiFetch('/api/reviews'),
      ])

      setJobsRaw(migrateJobs(j))
      setResumesRaw(r)
      setTasksRaw(t)
      setReviewsRaw(rv)

      saveToStorage('offerFlow_jobs', migrateJobs(j))
      saveToStorage('offerFlow_resumes', r)
      saveToStorage('offerFlow_tasks', t)
      saveToStorage('offerFlow_reviews', rv)
    } catch (err) {
      // If unauthorized, just show empty data instead of falling
      // back to a potentially stale localStorage from another user.
      if (err.message === 'Unauthorized') {
        setJobsRaw([])
        setResumesRaw([])
        setTasksRaw([])
        setReviewsRaw([])
      } else {
        console.error('[AppContext] API load failed, falling back to localStorage', err)
        addToast('数据加载失败，使用本地缓存', 'error')
        const mock = generateMockData()
        setJobsRaw(migrateJobs(loadFromStorage('offerFlow_jobs', mock.jobs)))
        setResumesRaw(loadFromStorage('offerFlow_resumes', mock.resumes))
        setTasksRaw(loadFromStorage('offerFlow_tasks', mock.tasks))
        setReviewsRaw(loadFromStorage('offerFlow_reviews', mock.reviews))
      }
    } finally {
      setDataLoading(false)
    }
  }

  // ---- Setters with localStorage sync ----

  const setJobs = useCallback((value) => {
    setJobsRaw((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      saveToStorage('offerFlow_jobs', next)
      return next
    })
  }, [])

  const setResumes = useCallback((value) => {
    setResumesRaw((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      saveToStorage('offerFlow_resumes', next)
      return next
    })
  }, [])

  const setTasks = useCallback((value) => {
    setTasksRaw((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      saveToStorage('offerFlow_tasks', next)
      return next
    })
  }, [])

  const setReviews = useCallback((value) => {
    setReviewsRaw((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      saveToStorage('offerFlow_reviews', next)
      return next
    })
  }, [])

  const reloadJobs = useCallback(async () => {
    const nextJobs = migrateJobs(await apiFetch('/api/jobs'))
    setJobsRaw(nextJobs)
    saveToStorage('offerFlow_jobs', nextJobs)
    return nextJobs
  }, [])

  // ---- Async CRUD methods ----

  // Jobs
  const addJob = useCallback(async (formData) => {
    try {
      const result = await apiFetch('/api/jobs', { method: 'POST', body: JSON.stringify(formData) })
      await reloadJobs()
      return result.job
    } catch (err) {
      addToast(err.message, 'error')
      return null
    }
  }, [reloadJobs, addToast])

  const updateJob = useCallback(async (id, patch) => {
    try {
      const result = await apiFetch('/api/jobs', { method: 'PUT', body: JSON.stringify({ id, ...patch }) })
      await reloadJobs()
      return result.job
    } catch (err) {
      addToast(err.message, 'error')
      return null
    }
  }, [reloadJobs, addToast])

  const deleteJob = useCallback(async (ids) => {
    const idList = Array.isArray(ids) ? ids : [ids]
    if (!idList.length) return
    try {
      const result = await apiFetch('/api/jobs', { method: 'DELETE', body: JSON.stringify({ ids: idList }) })
      await reloadJobs()
      return result.deletedIds || idList
    } catch (err) {
      addToast(err.message, 'error')
      return []
    }
  }, [reloadJobs, addToast])

  // Resumes
  const addResume = useCallback(async (formData) => {
    try {
      const result = await apiFetch('/api/resumes', { method: 'POST', body: JSON.stringify(formData) })
      const newResume = result.resume
      setResumes((prev) => [...prev, newResume])
      return newResume
    } catch (err) {
      addToast(err.message, 'error')
    }
  }, [setResumes, addToast])

  const updateResume = useCallback(async (id, patch) => {
    try {
      await apiFetch('/api/resumes', { method: 'PUT', body: JSON.stringify({ id, ...patch }) })
      setResumes((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r))
    } catch (err) {
      addToast(err.message, 'error')
    }
  }, [setResumes, addToast])

  const deleteResume = useCallback(async (id) => {
    try {
      await apiFetch(`/api/resumes?id=${id}`, { method: 'DELETE' })
      setResumes((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      addToast(err.message, 'error')
    }
  }, [setResumes, addToast])

  // Tasks
  const addTask = useCallback(async (formData) => {
    try {
      const result = await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(formData) })
      const newTask = result.task
      setTasks((prev) => [...prev, newTask])
      return newTask
    } catch (err) {
      addToast(err.message, 'error')
    }
  }, [setTasks, addToast])

  const updateTask = useCallback(async (id, patch) => {
    try {
      await apiFetch('/api/tasks', { method: 'PUT', body: JSON.stringify({ id, ...patch }) })
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...patch } : t))
    } catch (err) {
      addToast(err.message, 'error')
    }
  }, [setTasks, addToast])

  const deleteTask = useCallback(async (id) => {
    try {
      await apiFetch(`/api/tasks?id=${id}`, { method: 'DELETE' })
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      addToast(err.message, 'error')
    }
  }, [setTasks, addToast])

  // Reviews
  const addReview = useCallback(async (reviewData) => {
    try {
      const result = await apiFetch('/api/reviews', { method: 'POST', body: JSON.stringify(reviewData) })
      const newReview = {
        ...result.review,
        attachments: Array.isArray(result.review.attachments) ? result.review.attachments : [],
        positiveTags: reviewData.positiveTags || [],
        negativeTags: reviewData.negativeTags || [],
      }
      setReviews((prev) => [...prev, newReview])
      return newReview
    } catch (err) {
      addToast(err.message, 'error')
    }
  }, [setReviews, addToast])

  const updateReview = useCallback(async (id, patch) => {
    try {
      await apiFetch('/api/reviews', { method: 'PUT', body: JSON.stringify({ id, ...patch }) })
      setReviews((prev) => prev.map((r) =>
        r.id === id
          ? {
              ...r,
              ...patch,
              attachments:
                Array.isArray(patch.attachments)
                  ? patch.attachments
                  : r.attachments || [],
            }
          : r
      ))
    } catch (err) {
      addToast(err.message, 'error')
    }
  }, [setReviews, addToast])

  const deleteReview = useCallback(async (id) => {
    try {
      await deleteReviewAttachmentsByReviewId(id)
      await apiFetch(`/api/reviews?id=${id}`, { method: 'DELETE' })
      setReviews((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      addToast(err.message, 'error')
    }
  }, [setReviews, addToast])

  // Settings (localStorage only)
  const setSettings = useCallback((value) => {
    setSettingsRaw((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      saveToStorage('offerFlow_settings', next)
      return next
    })
  }, [])

  return (
    <AppContext.Provider value={{
      jobs, setJobs,
      resumes, setResumes,
      tasks, setTasks,
      reviews, setReviews,
      addJob, updateJob, deleteJob,
      addResume, updateResume, deleteResume,
      addTask, updateTask, deleteTask,
      addReview, updateReview, deleteReview,
      settings, setSettings,
      toasts, addToast,
      dataLoading,
    }}>
      {children}
      <Toast />
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
