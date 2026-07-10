'use client'
import { useRouter } from 'next/navigation'

export default function Settings() {
  const router = useRouter()

  return (
    <div className="min-w-0 max-w-3xl py-2 md:py-0">
      <h1 className="text-2xl font-bold text-white mb-1">设置</h1>
      <p className="text-offer-muted text-sm mb-6">管理你的账户和应用设置</p>

      <div className="card-modern p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-offer-muted mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="text-white font-semibold text-lg mb-2">暂无可配置的选项</h2>
        <p className="text-offer-muted text-sm max-w-sm mb-6">
          当前版本所有基本偏好与个人资料均为自动托管，无需手动配置。
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="btn-gradient px-6 py-2.5 rounded-xl text-white font-medium text-sm transition-transform hover:scale-105 active:scale-95"
        >
          返回仪表盘
        </button>
      </div>
    </div>
  )
}
