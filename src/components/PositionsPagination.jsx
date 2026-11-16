const PAGE_SIZES = [10, 20, 50, 100]

const controlClass = 'h-8 rounded-lg border border-theme-border bg-offer-card text-[0.85rem] text-theme-secondary shadow-xs transition-[background-color,border-color,color,box-shadow] enabled:hover:border-offer-primary enabled:hover:shadow-[0_3px_8px_--alpha(var(--color-offer-primary)/15%)]'
const buttonClass = `${controlClass} inline-flex items-center justify-center px-3 leading-none enabled:cursor-pointer disabled:cursor-not-allowed disabled:border-theme-border-light disabled:bg-theme-hover disabled:opacity-45 disabled:shadow-none focus-visible:ring-2 focus-visible:ring-offer-primary/45`
const fieldClass = `${controlClass} outline-none focus:border-offer-primary focus:ring-[3px] focus:ring-offer-primary/12`

function getPageNumbers(page, totalPages) {
  const visible = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((number) => number >= 1 && number <= totalPages)
    .sort((a, b) => a - b)

  return visible.flatMap((number, index) => {
    const previous = visible[index - 1] ?? number
    if (number - previous === 2) return [number - 1, number]
    if (number - previous > 2) return [`ellipsis-${number}`, number]
    return [number]
  })
}

export default function PositionsPagination({
  page, pageSize, matchedCount, jobCount, selectedCount, onPageChange, onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil(matchedCount / pageSize))
  const start = (page - 1) * pageSize

  function jumpToPage(event) {
    event.preventDefault()
    const form = event.currentTarget
    const target = Number(new FormData(form).get('page'))
    if (Number.isInteger(target) && target > 0) onPageChange(target)
    form.reset()
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-theme-border px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-theme-secondary">
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>显示 {matchedCount} / {jobCount} 条</span>
          {totalPages > 1 && <span>第 {start + 1}–{Math.min(start + pageSize, matchedCount)} 条</span>}
        </div>
        <label className="flex items-center gap-1.5">
          <span>每页</span>
          <select
            aria-label="每页条数"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className={`${fieldClass} min-w-[70px] cursor-pointer px-2`}
          >
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <span>条</span>
        </label>
        {selectedCount > 0 && <span>已选 {selectedCount} 条</span>}
      </div>

      {totalPages > 1 && (
        <nav aria-label="岗位库分页" className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={buttonClass} disabled={page === 1} onClick={() => onPageChange(1)}>首页</button>
          <button type="button" className={buttonClass} disabled={page === 1} onClick={() => onPageChange(page - 1)}>上一页</button>
          <div className="flex flex-wrap items-center gap-1">
            {getPageNumbers(page, totalPages).map((number) => (
              typeof number === 'number' ? (
                <button
                  key={number}
                  type="button"
                  aria-label={`第 ${number} 页`}
                  aria-current={number === page ? 'page' : undefined}
                  className={`${buttonClass} min-w-8 px-0! aria-[current=page]:border-[#866ECB] aria-[current=page]:bg-[#866ECB] aria-[current=page]:font-semibold aria-[current=page]:text-white dark:aria-[current=page]:border-[#866ECC] dark:aria-[current=page]:bg-[#866ECC]`}
                  onClick={() => onPageChange(number)}
                >
                  {number}
                </button>
              ) : <span key={number} aria-hidden="true" className="px-1 text-theme-secondary">…</span>
            ))}
          </div>
          <button type="button" className={buttonClass} disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>下一页</button>
          <button type="button" className={buttonClass} disabled={page === totalPages} onClick={() => onPageChange(totalPages)}>末页</button>
          <form key={page} onSubmit={jumpToPage} className="flex items-center gap-1.5 sm:ml-1">
            <label className="flex items-center gap-1.5 text-theme-secondary">
              <span>跳至</span>
              <input
                type="number"
                name="page"
                required
                min={1}
                max={totalPages}
                inputMode="numeric"
                aria-label="跳至页码"
                className={`${fieldClass} w-[50px] cursor-text p-0 text-center [&::-webkit-inner-spin-button]:opacity-10 [&::-webkit-outer-spin-button]:opacity-10`}
              />
            </label>
            <button type="submit" className={`${buttonClass} min-w-[50px] bg-transparent! enabled:hover:bg-offer-primary/5!`}>前往</button>
          </form>
        </nav>
      )}
    </div>
  )
}
