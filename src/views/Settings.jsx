'use client'
import { useState, useEffect } from 'react'
import { useApp } from '../store/AppContext'

const LLM_STORAGE_KEY = 'offerflow_llm_config'

const LLM_PRESETS = {
  deepseek: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  siliconflow: { label: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-7B-Instruct' },
  qwen: { label: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  custom: { label: '自定义', baseUrl: '', model: '' },
}

function loadLlmConfig() {
  if (typeof window === 'undefined') return { llmProvider: 'deepseek', llmApiKey: '', llmBaseUrl: '', llmModel: '' }
  try {
    const raw = localStorage.getItem(LLM_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // 填充预设的 baseUrl/model（如果没有自定义）
      const preset = LLM_PRESETS[parsed.llmProvider]
      if (preset && parsed.llmProvider !== 'custom') {
        if (!parsed.llmBaseUrl) parsed.llmBaseUrl = preset.baseUrl
        if (!parsed.llmModel) parsed.llmModel = preset.model
      }
      return parsed
    }
  } catch {}
  return { llmProvider: 'deepseek', llmApiKey: '', llmBaseUrl: '', llmModel: '' }
}

function saveLlmConfig(config) {
  try {
    localStorage.setItem(LLM_STORAGE_KEY, JSON.stringify(config))
  } catch {}
}

export default function Settings() {
  const { settings, setSettings } = useApp()

  const [form, setForm] = useState({ ...settings })
  const [saved, setSaved] = useState(false)

  // LLM 配置状态
  const [llmForm, setLlmForm] = useState(loadLlmConfig)
  const [llmSaved, setLlmSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => { setForm({ ...settings }) }, [settings])

  const handleSave = () => {
    setSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  // LLM 配置
  const handleProviderChange = (provider) => {
    const preset = LLM_PRESETS[provider]
    setLlmForm((prev) => ({
      ...prev,
      llmProvider: provider,
      llmBaseUrl: preset?.baseUrl || prev.llmBaseUrl,
      llmModel: preset?.model || prev.llmModel,
    }))
  }

  const handleLlmChange = (key) => (e) => {
    setLlmForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const handleLlmSave = () => {
    saveLlmConfig(llmForm)
    setLlmSaved(true)
    setTestResult(null)
    setTimeout(() => setLlmSaved(false), 2000)
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const baseUrl = llmForm.llmBaseUrl.replace(/\/+$/, '')
      const res = await fetch(`${baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${llmForm.llmApiKey}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        setTestResult({ ok: true, msg: `连接成功！可用模型 ${data.data?.length || '未知'} 个` })
      } else if (res.status === 401) {
        setTestResult({ ok: false, msg: 'API Key 无效（401）' })
      } else {
        setTestResult({ ok: false, msg: `连接失败（${res.status}）` })
      }
    } catch (err) {
      setTestResult({ ok: false, msg: `网络错误: ${err.message}` })
    } finally {
      setTesting(false)
    }
  }

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

        {/* AI 模型配置 */}
        <div className="card-modern p-4 md:p-5">
          <h2 className="text-white font-semibold mb-4">AI 模型配置</h2>
          <p className="text-xs text-offer-muted mb-4">配置你的 AI 面试分析模型。支持任何 OpenAI 兼容的 API。配置后会自动生效。</p>

          <div className="space-y-4">
            {/* Provider */}
            <div>
              <label className="text-sm text-offer-muted block mb-1">模型提供商</label>
              <select
                value={llmForm.llmProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="min-h-[40px] w-full rounded-xl border border-theme-border bg-theme-card px-4 py-2.5 text-sm text-theme-text outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20"
              >
                {Object.entries(LLM_PRESETS).map(([key, v]) => (
                  <option key={key} value={key}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* API Key */}
            <div>
              <label className="text-sm text-offer-muted block mb-1">API Key</label>
              <input
                type="password"
                value={llmForm.llmApiKey}
                onChange={handleLlmChange('llmApiKey')}
                placeholder={llmForm.llmApiKey ? '••••••••••' : '输入你的 API Key'}
                className="min-h-[40px] w-full rounded-xl border border-theme-border bg-theme-card px-4 py-2.5 text-sm text-theme-text placeholder:text-theme-muted outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {/* Base URL */}
            <div>
              <label className="text-sm text-offer-muted block mb-1">API 地址（Base URL）</label>
              <input
                value={llmForm.llmBaseUrl}
                onChange={handleLlmChange('llmBaseUrl')}
                placeholder="https://api.deepseek.com"
                className="min-h-[40px] w-full rounded-xl border border-theme-border bg-theme-card px-4 py-2.5 text-sm text-theme-text placeholder:text-theme-muted outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {/* Model */}
            <div>
              <label className="text-sm text-offer-muted block mb-1">模型名称</label>
              <input
                value={llmForm.llmModel}
                onChange={handleLlmChange('llmModel')}
                placeholder="deepseek-chat"
                className="min-h-[40px] w-full rounded-xl border border-theme-border bg-theme-card px-4 py-2.5 text-sm text-theme-text placeholder:text-theme-muted outline-none transition-all duration-200 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={handleLlmSave} className="btn-gradient px-6 py-2.5 rounded-xl text-white font-medium text-sm">
                保存配置
              </button>
              <button onClick={handleTestConnection} disabled={testing || !llmForm.llmApiKey}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  testing || !llmForm.llmApiKey
                    ? 'border-theme-border text-offer-muted cursor-not-allowed opacity-50'
                    : 'border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10'
                }`}
              >
                {testing ? '测试中...' : '测试连接'}
              </button>
              {llmSaved && <span className="text-sm text-emerald-400">配置已保存</span>}
            </div>

            {/* Test result */}
            {testResult && (
              <div className={`text-sm px-3 py-2 rounded-lg ${testResult.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                {testResult.msg}
              </div>
            )}

            {/* Models hint for custom provider */}
            {llmForm.llmProvider === 'custom' && (
              <p className="text-xs text-offer-muted">选择「自定义」后请自行填写 API 地址和模型名称。</p>
            )}
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
