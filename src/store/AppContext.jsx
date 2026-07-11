'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { generateMockData, defaultSettings } from './mockData'
import Toast from '../components/Toast'
import { useAuth } from './AuthContext'
import { APPLIED_STATUSES, canSelectInterviewStatus, canSelectJobStatus } from '../lib/jobStatus'

const AppContext = createContext(null)

// ---- Centralized statistics helpers ----

export const REPLIED_STATUSES = ['OA / 笔试', '一面中', '二面中', '三面中', '终面中', 'Offer']
const REPLIED_END_REASONS = ['被拒绝', '岗位关闭', '其他']

export function isAppliedJob(job) {
  return APPLIED_STATUSES.includes(job.status)
}

export function isRepliedJob(job) {
  if (REPLIED_STATUSES.includes(job.status)) return true
  if (hasRepliedHistory(job)) return true
  if (job.status === '已结束') {
    if (!job.endReason) return true
    return REPLIED_END_REASONS.includes(job.endReason)
  }
  return false
}

function hasRepliedHistory(job) {
  if (getInterviewRounds(job).length > 0) return true
  return (job.timeline || []).some((item) => {
    const text = `${item.action || ''} ${item.detail || ''}`
    return REPLIED_STATUSES.some((status) => text.includes(status))
  })
}

export function hasOaExperience(job) {
  if (job.status === 'OA / 笔试') return true
  return (job.timeline || []).some((item) => {
    const text = `${item.action || ''} ${item.detail || ''}`
    return text.includes('OA') || text.includes('笔试')
  })
}

export function hasInterviewExperience(job) {
  return getInterviewRounds(job).length > 0
}

export function getInterviewRounds(job) {
  return Array.isArray(job.interviewRounds) ? job.interviewRounds : []
}

export function getInterviewRoundCount(job) {
  return getInterviewRounds(job).length
}

export { canSelectInterviewStatus, canSelectJobStatus }

export function isOfferJob(job) {
  return job.status === 'Offer'
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
  const [tasks, setTasksRaw] = useState([])
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
      const [j, t] = await Promise.all([
        apiFetch('/api/jobs'),
        apiFetch('/api/tasks'),
      ])

      setJobsRaw(j)
      setTasksRaw(t)

      saveToStorage('offerFlow_jobs', j)
      saveToStorage('offerFlow_tasks', t)
    } catch (err) {
      // If unauthorized, just show empty data instead of falling
      // back to a potentially stale localStorage from another user.
      if (err.message === 'Unauthorized') {
        setJobsRaw([])
        setTasksRaw([])
      } else {
        console.error('[AppContext] API load failed, falling back to localStorage', err)
        addToast('数据加载失败，使用本地缓存', 'error')
        const mock = generateMockData()
        setJobsRaw(loadFromStorage('offerFlow_jobs', mock.jobs))
        setTasksRaw(loadFromStorage('offerFlow_tasks', mock.tasks))
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

  const setTasks = useCallback((value) => {
    setTasksRaw((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      saveToStorage('offerFlow_tasks', next)
      return next
    })
  }, [])

  const reloadJobs = useCallback(async () => {
    const nextJobs = await apiFetch('/api/jobs')
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
      tasks, setTasks,
      addJob, updateJob, deleteJob,
      addTask, updateTask, deleteTask,
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
