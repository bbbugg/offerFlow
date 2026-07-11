export default function MainLoading() {
  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-theme-secondary text-sm">加载页面中...</span>
      </div>
    </div>
  )
}
