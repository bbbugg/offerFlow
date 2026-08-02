'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import Toast from '../components/Toast'
import { useAuth } from './AuthContext'
import { APPLIED_STATUSES, canSelectInterviewStatus, canSelectJobStatus } from '../lib/jobStatus'

const AppContext = createContext(null)
const defaultSettings = {}

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
    cache: 'no-store',
    ...options,
  })
  const text = await res.text()
  let data = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(res.ok ? '服务器返回了无效响应' : text)
    }
  }
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
  const jobsStorageKey = user ? `offerFlow_jobs:${user.id}` : null
  const tasksStorageKey = user ? `offerFlow_tasks:${user.id}` : null
  const activeUserIdRef = useRef(user?.id ?? null)
  activeUserIdRef.current = user?.id ?? null

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

  const loadAllData = useCallback(async () => {
    // 未登录时（如分享页访客）直接跳过，不发请求，避免产生无意义的 401
    if (!user) {
      setJobsRaw([])
      setTasksRaw([])
      setDataLoading(false)
      return
    }
    const requestUserId = user.id
    setJobsRaw([])
    setTasksRaw([])
    setDataLoading(true)
    try {
      const [j, t] = await Promise.all([
        apiFetch('/api/jobs'),
        apiFetch('/api/tasks'),
      ])
      if (activeUserIdRef.current !== requestUserId) return

      setJobsRaw(j)
      setTasksRaw(t)

      saveToStorage(jobsStorageKey, j)
      saveToStorage(tasksStorageKey, t)
    } catch (err) {
      if (activeUserIdRef.current !== requestUserId) return
      // If unauthorized, just show empty data instead of falling
      // back to a potentially stale localStorage from another user.
      if (err.message === 'Unauthorized') {
        setJobsRaw([])
        setTasksRaw([])
      } else {
        console.error('[AppContext] API load failed, falling back to localStorage', err)
        addToast('数据加载失败，使用本地缓存', 'error')
        setJobsRaw(loadFromStorage(jobsStorageKey, []))
        setTasksRaw(loadFromStorage(tasksStorageKey, []))
      }
    } finally {
      if (activeUserIdRef.current === requestUserId) setDataLoading(false)
    }
  }, [addToast, jobsStorageKey, tasksStorageKey, user])

  // ---- Data loading: re-fetch when auth state changes (login/logout) ----
  useEffect(() => {
    if (authLoading) return
    loadAllData()
  }, [authLoading, loadAllData])

  // ---- Setters with localStorage sync ----

  const setJobs = useCallback((value) => {
    setJobsRaw((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      if (jobsStorageKey) saveToStorage(jobsStorageKey, next)
      return next
    })
  }, [jobsStorageKey])

  const setTasks = useCallback((value) => {
    setTasksRaw((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      if (tasksStorageKey) saveToStorage(tasksStorageKey, next)
      return next
    })
  }, [tasksStorageKey])

  const reloadJobs = useCallback(async (requestUserId) => {
    const nextJobs = await apiFetch('/api/jobs')
    if (activeUserIdRef.current !== requestUserId) return false
    setJobsRaw(nextJobs)
    saveToStorage(`offerFlow_jobs:${requestUserId}`, nextJobs)
    return true
  }, [])

  const reloadTasks = useCallback(async (requestUserId) => {
    const nextTasks = await apiFetch('/api/tasks')
    if (activeUserIdRef.current !== requestUserId) return false
    setTasksRaw(nextTasks)
    saveToStorage(`offerFlow_tasks:${requestUserId}`, nextTasks)
    return true
  }, [])

  const syncJobsAfterMutation = useCallback(async (requestUserId, fallbackUpdate) => {
    if (activeUserIdRef.current !== requestUserId) return false
    try {
      return await reloadJobs(requestUserId)
    } catch (err) {
      if (activeUserIdRef.current !== requestUserId) return false
      console.error('[AppContext] Job saved but latest list refresh failed', err)
      setJobsRaw((prev) => {
        if (activeUserIdRef.current !== requestUserId) return prev
        const nextJobs = fallbackUpdate(prev)
        saveToStorage(`offerFlow_jobs:${requestUserId}`, nextJobs)
        return nextJobs
      })
      addToast('最新岗位列表同步失败，请刷新页面', 'warning')
      return true
    }
  }, [reloadJobs, addToast])

  const syncTasksAfterMutation = useCallback(async (requestUserId, fallbackUpdate) => {
    if (activeUserIdRef.current !== requestUserId) return false
    try {
      return await reloadTasks(requestUserId)
    } catch (err) {
      if (activeUserIdRef.current !== requestUserId) return false
      console.error('[AppContext] Task saved but latest list refresh failed', err)
      setTasksRaw((prev) => {
        if (activeUserIdRef.current !== requestUserId) return prev
        const nextTasks = fallbackUpdate(prev)
        saveToStorage(`offerFlow_tasks:${requestUserId}`, nextTasks)
        return nextTasks
      })
      addToast('最新事项列表同步失败，请刷新页面', 'warning')
      return true
    }
  }, [reloadTasks, addToast])

  // ---- Async CRUD methods ----

  // Jobs
  const addJob = useCallback(async (formData) => {
    const requestUserId = user?.id
    if (!requestUserId || activeUserIdRef.current !== requestUserId) return null
    try {
      const result = await apiFetch('/api/jobs', { method: 'POST', body: JSON.stringify(formData) })
      if (!result.job) throw new Error('岗位创建失败：服务器未返回新岗位')
      if (activeUserIdRef.current !== requestUserId) return null
      const isActiveUser = await syncJobsAfterMutation(requestUserId, (prev) => [result.job, ...prev.filter((job) => job.id !== result.job.id)])
      if (!isActiveUser) return null
      return result.job
    } catch (err) {
      if (activeUserIdRef.current === requestUserId) addToast(err.message, 'error')
      return null
    }
  }, [user?.id, syncJobsAfterMutation, addToast])

  const updateJob = useCallback(async (id, patch) => {
    const requestUserId = user?.id
    if (!requestUserId || activeUserIdRef.current !== requestUserId) return null
    try {
      const result = await apiFetch('/api/jobs', { method: 'PUT', body: JSON.stringify({ id, ...patch }) })
      if (!result.job) throw new Error('岗位更新失败：服务器未返回岗位')
      if (activeUserIdRef.current !== requestUserId) return null
      const isActiveUser = await syncJobsAfterMutation(requestUserId, (prev) => [result.job, ...prev.filter((job) => job.id !== id)])
      if (!isActiveUser) return null
      return result.job
    } catch (err) {
      if (activeUserIdRef.current === requestUserId) addToast(err.message, 'error')
      return null
    }
  }, [user?.id, syncJobsAfterMutation, addToast])

  const deleteJob = useCallback(async (ids) => {
    const idList = Array.isArray(ids) ? ids : [ids]
    if (!idList.length) return
    const requestUserId = user?.id
    if (!requestUserId || activeUserIdRef.current !== requestUserId) return []
    try {
      const result = await apiFetch('/api/jobs', { method: 'DELETE', body: JSON.stringify({ ids: idList }) })
      const deletedIds = result.deletedIds || idList
      if (activeUserIdRef.current !== requestUserId) return []
      const [jobsSynced, tasksSynced] = await Promise.all([
        syncJobsAfterMutation(requestUserId, (prev) => prev.filter((job) => !deletedIds.includes(job.id))),
        syncTasksAfterMutation(requestUserId, (prev) => prev.map((task) => (
          deletedIds.includes(task.jobId) ? { ...task, jobId: null } : task
        ))),
      ])
      if (!jobsSynced || !tasksSynced) return []
      return deletedIds
    } catch (err) {
      if (activeUserIdRef.current === requestUserId) addToast(err.message, 'error')
      return []
    }
  }, [user?.id, syncJobsAfterMutation, syncTasksAfterMutation, addToast])

  // Tasks
  const addTask = useCallback(async (formData) => {
    const requestUserId = user?.id
    if (!requestUserId || activeUserIdRef.current !== requestUserId) return null
    try {
      const result = await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(formData) })
      const newTask = result.task
      if (!newTask) throw new Error('事项创建失败：服务器未返回新事项')
      if (activeUserIdRef.current !== requestUserId) return null
      const isActiveUser = await syncTasksAfterMutation(requestUserId, (prev) => (
        [newTask, ...prev.filter((task) => task.id !== newTask.id)]
          .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      ))
      if (!isActiveUser) return null
      return newTask
    } catch (err) {
      if (activeUserIdRef.current === requestUserId) addToast(err.message, 'error')
      return null
    }
  }, [user?.id, syncTasksAfterMutation, addToast])

  const updateTask = useCallback(async (id, patch) => {
    const requestUserId = user?.id
    if (!requestUserId || activeUserIdRef.current !== requestUserId) return null
    try {
      const result = await apiFetch('/api/tasks', { method: 'PUT', body: JSON.stringify({ id, ...patch }) })
      if (!result.task) throw new Error('事项更新失败：服务器未返回事项')
      if (activeUserIdRef.current !== requestUserId) return null
      const isActiveUser = await syncTasksAfterMutation(requestUserId, (prev) => (
        [result.task, ...prev.filter((task) => task.id !== id)]
          .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      ))
      if (!isActiveUser) return null
      return result.task
    } catch (err) {
      if (activeUserIdRef.current === requestUserId) addToast(err.message, 'error')
      return null
    }
  }, [user?.id, syncTasksAfterMutation, addToast])

  const deleteTask = useCallback(async (id) => {
    const requestUserId = user?.id
    if (!requestUserId || activeUserIdRef.current !== requestUserId) return false
    try {
      await apiFetch(`/api/tasks?id=${id}`, { method: 'DELETE' })
      if (activeUserIdRef.current !== requestUserId) return false
      const isActiveUser = await syncTasksAfterMutation(requestUserId, (prev) => prev.filter((task) => task.id !== id))
      if (!isActiveUser) return false
      return true
    } catch (err) {
      if (activeUserIdRef.current === requestUserId) addToast(err.message, 'error')
      return false
    }
  }, [user?.id, syncTasksAfterMutation, addToast])

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
