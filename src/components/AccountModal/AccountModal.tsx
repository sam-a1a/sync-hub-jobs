import { useEffect, useRef, useState } from 'react'
import { useLenis } from 'lenis/react'
import Icon from '../Icon'
import Morph from '../Morph'
import AuthPanel from './AuthPanel'
import { authTitle, type View } from './authView'

/**
 * The window the auth panel opens in.
 *
 * The panel itself is {@link AuthPanel}. What is left here is what is genuinely
 * this modal's: the backdrop, the box, the heading and the way out — and the
 * heading names whichever view the panel is showing, which the panel is the
 * only thing that knows.
 *
 * Built on `<dialog>` and `showModal()` rather than a div with a high z-index.
 * That is not a shortcut: it is the only way to get the focus trap, the
 * inertness of everything behind it, Escape, and top-layer stacking for free
 * and correctly. The last one matters here in particular — a hand-rolled modal
 * breaks the moment an ancestor has a transform on it, and most of this page
 * does.
 */
function AccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const lenis = useLenis()
  const [view, setView] = useState<View>('signIn')

  /*
   * The heading follows the panel back to the start. The panel throws its own
   * state away when it closes, so without this the title would still read
   * "Create Account" the next time it opened.
   */
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) setView('signIn')
  }

  /*
   * `showModal()` and `close()` are what actually open and shut a dialog — the
   * `open` attribute alone gives a non-modal one, with no top layer, no
   * backdrop and no focus trap. So React's state drives the *method*, not the
   * attribute.
   */
  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open && !node.open) node.showModal()
    if (!open && node.open) node.close()
  }, [open])

  /*
   * The page behind must not scroll. `showModal()` does not stop it on its own,
   * and Lenis is driving the scroll here, so both have to be told: the library
   * to stand down, and the document to stop being scrollable.
   */
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

  return (
    <dialog
      ref={dialog}
      className="account-dialog"
      /* Escape closes it natively; this is how React hears about that. */
      onClose={onClose}
      onClick={(event) => {
        /*
         * A dialog's backdrop is part of the dialog element, so a click on it
         * targets the dialog itself. Anything inside targets a child — which is
         * what separates "clicked outside" from "clicked the form".
         */
        if (event.target === dialog.current) onClose()
      }}
    >
      <div className="account-panel">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            <Morph token={view}>{authTitle(view)}</Morph>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex cursor-pointer items-center justify-center rounded-full p-2
              text-ink-muted transition-[color,background-color,scale]
              duration-[var(--hover-fade)] ease-[var(--ease-standard)]
              hover:bg-[var(--hover-wash)] hover:text-ink active:scale-90"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <AuthPanel active={open} onDone={onClose} onView={setView} />
      </div>
    </dialog>
  )
}

export default AccountModal
