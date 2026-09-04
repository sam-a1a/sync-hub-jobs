import { useEffect, useRef } from 'react'
import { useLenis } from 'lenis/react'
import Icon, { type IconName } from '../Icon'

const BASE =
  'inline-flex h-11 cursor-pointer items-center justify-center rounded-full px-6 text-[15px] font-semibold whitespace-nowrap transition-[background-color,border-color,color,opacity] duration-[var(--hover-fade)] ease-[var(--ease-standard)]'

function WarningModal({
  open,
  icon = 'delete',
  tone = 'danger',
  title,
  body,
  confirmLabel,
  onConfirm,
  confirmDisabled = false,
  cancelLabel = 'Cancel',
  dismiss = 'cancel',
  altLabel,
  onAlt,
  onClose,
}: {
  open: boolean
  icon?: IconName
  tone?: 'danger' | 'ink'
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  confirmDisabled?: boolean
  cancelLabel?: string
  dismiss?: 'cancel' | 'close'
  altLabel?: string
  onAlt?: () => void
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const lenis = useLenis()

  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open && !node.open) node.showModal()
    if (!open && node.open) node.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    lenis?.stop()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      lenis?.start()
      document.body.style.overflow = previous
    }
  }, [open, lenis])

  const danger = tone === 'danger'

  const alt =
    altLabel && onAlt ? (
      <button type="button" onClick={onAlt} className={`${BASE} border border-hairline text-ink-muted hover:border-ink hover:text-ink`}>
        {altLabel}
      </button>
    ) : null

  return (
    <dialog
      ref={dialog}
      className="account-dialog"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose()
      }}
    >
      <div className="account-panel">
        <div className="flex items-start justify-between gap-4">
          <span
            className={`flex size-12 items-center justify-center rounded-full ${danger ? 'bg-brick/12 text-brick' : 'bg-[var(--hover-wash)] text-ink'}`}
          >
            <Icon name={icon} size={24} />
          </span>
          {dismiss === 'close' ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-me-1 inline-flex cursor-pointer items-center justify-center rounded-full p-2 text-ink-muted transition-[color,background-color,scale] duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:bg-[var(--hover-wash)] hover:text-ink active:scale-90"
            >
              <Icon name="close" size={20} />
            </button>
          ) : null}
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-ink">{title}</h2>
        <p className="mt-2.5 text-[15px] leading-relaxed text-ink-muted">{body}</p>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-2.5">
          {dismiss === 'cancel' ? (
            <button type="button" onClick={onClose} className={`${BASE} border border-hairline text-ink hover:border-ink`}>
              {cancelLabel}
            </button>
          ) : (
            alt ?? <span />
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            {dismiss === 'cancel' ? alt : null}
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={`${BASE} text-paper hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:opacity-30 ${danger ? 'bg-brick' : 'bg-ink'}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}

export default WarningModal
