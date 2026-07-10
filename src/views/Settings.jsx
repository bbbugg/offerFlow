'use client'
import { useState, useEffect } from 'react'
import { useApp } from '../store/AppContext'

export default function Settings() {
  const { settings, setSettings } = useApp()

  const [form, setForm] = useState({ ...settings })
  const [saved, setSaved] = useState(false)

  useEffect(() => { setForm({ ...settings }) }, [settings])

  const handleSave = () => {
    setSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <div className="min-w-0 max-w-3xl py-2 md:py-0">
      <h1 className="text-2xl font-bold text-white mb-1">设置</h1>
      <p className="text-offer-muted text-sm mb-6">管理你的账户和应用设置</p>

      <div className="space-y-4">
        {/* Personal Info */}
        <div className="card-modern p-4 md:p-5">
          <h2 className="text-white font-semibold mb-4">个人资料</h2>
          <div className="space-y-4">
            {[
              { label: '姓名', key: 'name' },
              { label: '邮箱', key: 'email' },
              { label: '目标岗位', key: 'targetPosition' },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-sm text-offer-muted block mb-1">{f.label}</label>
                <input
                  value={form[f.key] || ''}
                  onChange={set(f.key)}
                  className="min-h-[40px] w-full rounded-xl border border-theme-border bg-theme-card px-4 py-2.5 text-sm text-theme-text placeholder:text-theme-muted outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Preferences */}
        <div className="card-modern p-4 md:p-5">
          <h2 className="text-white font-semibold mb-4">偏好设置</h2>
          <div className="space-y-4">
            {[
              { label: '期望工作地点', key: 'targetCities' },
              { label: '期望薪资范围', key: 'salaryExpectation' },
              { label: '工作性质', key: 'workType' },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-sm text-offer-muted block mb-1">{f.label}</label>
                <input
                  value={form[f.key] || ''}
                  onChange={set(f.key)}
                  className="min-h-[40px] w-full rounded-xl border border-theme-border bg-theme-card px-4 py-2.5 text-sm text-theme-text placeholder:text-theme-muted outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="card-modern p-4 md:p-5">
          <h2 className="text-white font-semibold mb-4">通知设置</h2>
          <div className="space-y-4">
            {[
              { label: '面试提醒', desc: '面试前 30 分钟推送通知', key: 'notifyInterview' },
              { label: '进度更新', desc: '投递状态变更时通知', key: 'notifyProgress' },
            ].map((t) => (
              <div key={t.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{t.label}</p>
                  <p className="text-xs text-offer-muted">{t.desc}</p>
                </div>
                <button
                  onClick={() => setForm((prev) => ({ ...prev, [t.key]: !prev[t.key] }))}
                  className={`relative ml-3 h-6 w-11 shrink-0 rounded-full transition-all md:ml-0 ${form[t.key] ? 'bg-offer-primary' : 'bg-slate-200 dark:bg-white/10'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${form[t.key] ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="btn-gradient px-6 py-2.5 rounded-xl text-white font-medium text-sm">
            保存设置
          </button>
          {saved && <span className="text-sm text-emerald-400">设置已保存</span>}
        </div>
      </div>
    </div>
  )
}
