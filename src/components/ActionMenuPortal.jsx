'use client'
import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export default function ActionMenuPortal({ open, anchorRef, onClose, children, menuWidth = 180, menuHeight = 160 }) {
  const menuRef = useRef(null)
  const [style, setStyle] = useState(null)

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setStyle(null)
      return
    }

    const rect = anchorRef.current.getBoundingClientRect()
    const gap = 8

    const left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)
    const top =
      rect.bottom + menuHeight + gap > window.innerHeight
        ? rect.top - menuHeight - gap
        : rect.bottom + gap

    setStyle({
      position: 'fixed',
      top: Math.max(12, top),
      left: Math.max(12, left),
      zIndex: 1000,
    })
  }, [open, anchorRef, menuWidth, menuHeight])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target)
      ) {
        onClose()
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    const handleClose = () => onClose()

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleClose, true)
    window.addEventListener('resize', handleClose)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleClose, true)
      window.removeEventListener('resize', handleClose)
    }
  }, [open, onClose, anchorRef])

  if (!open || !style) return null

  return createPortal(
    <div
      ref={menuRef}
      style={style}
      className="w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/15 dark:border-white/[0.18] dark:bg-[#1C1F26] dark:shadow-[0_8px_32px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)]"
    >
      {children}
    </div>,
    document.body,
  )
}
