import { KeyboardEvent, ReactNode, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  // open → mount, then animate in on the next frame
  useEffect(() => {
    if (open && !mounted) {
      restoreRef.current = document.activeElement as HTMLElement | null
      setMounted(true)
    } else if (!open && mounted) {
      setVisible(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!mounted || !open) return
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [mounted, open])

  // close transition end → unmount + restore focus
  useEffect(() => {
    if (mounted && !open) {
      const id = setTimeout(() => {
        setMounted(false)
        restoreRef.current?.focus()
        restoreRef.current = null
      }, 250)
      return () => clearTimeout(id)
    }
  }, [mounted, open])

  // focus panel on open + lock body scroll
  useEffect(() => {
    if (mounted && open) {
      panelRef.current?.focus()
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [mounted, open])

  // Escape closes
  useEffect(() => {
    if (!open) return
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function trapTab(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !panelRef.current) return
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) {
      e.preventDefault()
      panelRef.current.focus()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement as HTMLElement | null
    if (e.shiftKey) {
      if (active === first || active === panelRef.current) {
        last.focus()
        e.preventDefault()
      }
    } else if (active === last || active === panelRef.current) {
      first.focus()
      e.preventDefault()
    }
  }

  if (!mounted) return null

  return (
    <div className={`drawer${visible ? ' drawer-open' : ''}`}>
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
        onKeyDown={trapTab}
      >
        <header className="drawer-header">
          <h2 className="drawer-title">{title}</h2>
          <Button variant="link" size="sm" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </Button>
        </header>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  )
}
