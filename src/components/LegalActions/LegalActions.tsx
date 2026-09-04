import { useEffect, useRef, useState, type ReactNode } from 'react'
import Icon from '../Icon'
import Morph from '../Morph'
import Button from '../ui/Button'

/**
 * Print, copy, save. What a person does with a legal document once they have
 * found the clause they came for.
 *
 * All three are browser capabilities rather than features — no library is
 * shipped for any of them, and none should be. "Save as PDF" in particular is
 * the print dialog with its destination already the point: a client-side PDF
 * generator would either rasterise the page, producing a document nobody can
 * search or select, or reimplement pagination worse than the browser does it.
 * What it does do that plain Print does not is name the file, because the
 * browser takes the PDF's filename from `document.title` and the default is
 * not a filename anyone wants in their downloads folder.
 */
const FEEDBACK_MS = 2200

type Feedback = 'idle' | 'copied' | 'failed'

function LegalActions({
  title,
  text,
  className = '',
}: {
  /** The document's own title, used to name the saved file. */
  title: string
  /** The whole document as text, already numbered. */
  text: string
  className?: string
}) {
  const [feedback, setFeedback] = useState<Feedback>('idle')

  /*
   * The print title is swapped for the duration of the dialog and put back
   * afterwards. Held in a ref as well so that leaving the page mid-dialog
   * restores it.
   */
  const restore = useRef<(() => void) | null>(null)
  useEffect(() => () => restore.current?.(), [])

  useEffect(() => {
    if (feedback === 'idle') return
    const timer = setTimeout(() => setFeedback('idle'), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [feedback])

  function print(filename?: string) {
    restore.current?.()

    const original = document.title
    if (filename) document.title = filename

    let backstop = 0
    const undo = () => {
      document.title = original
      window.removeEventListener('afterprint', undo)
      clearTimeout(backstop)
      restore.current = null
    }

    // `afterprint` is what actually ends this; the timer is only there for a
    // browser that never fires it, so the title is not stuck for the session.
    window.addEventListener('afterprint', undo)
    backstop = window.setTimeout(undo, 60_000)
    restore.current = undo

    window.print()
  }

  async function copy() {
    setFeedback((await writeToClipboard(text)) ? 'copied' : 'failed')
  }

  return (
    <div role="group" aria-label="Document actions" className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Button tone="outline" size="sm" onClick={() => print()}>
        <Icon name="print" size={18} />
        Print
      </Button>

      {/*
       * `aria-live` on the label rather than on a separate status element: the
       * button's own name changing to "Copied" is the announcement, and a
       * second one somewhere off-screen would say it twice.
       */}
      <Button tone="outline" size="sm" onClick={copy}>
        <CopyIcon feedback={feedback} />
        <span aria-live="polite">
          <Morph token={feedback}>
            {feedback === 'copied' ? 'Copied' : feedback === 'failed' ? 'Copy failed' : 'Copy'}
          </Morph>
        </span>
      </Button>

      <Button tone="outline" size="sm" onClick={() => print(`SYNC Hub — ${title}`)}>
        <Icon name="picture_as_pdf" size={18} />
        Save as PDF
      </Button>
    </div>
  )
}

/**
 * The copy button's icon, which is three icons in the same square.
 *
 * All three are mounted and faded between rather than swapped outright, so the
 * confirmation grows out of where the copy mark was rather than replacing it.
 * The square is fixed at the icon's own size so the button's width never
 * depends on which of the three is showing.
 */
function CopyIcon({ feedback }: { feedback: Feedback }) {
  return (
    <span aria-hidden className="relative inline-flex size-[18px] shrink-0 items-center justify-center">
      <IconLayer show={feedback === 'idle'}>
        <Icon name="copy_all" size={18} />
      </IconLayer>
      <IconLayer show={feedback === 'copied'}>
        <Icon name="check" size={18} />
      </IconLayer>
      <IconLayer show={feedback === 'failed'}>
        <Icon name="close" size={18} />
      </IconLayer>
    </span>
  )
}

function IconLayer({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <span
      className={`absolute inline-flex transition-all duration-300 ease-in-out ${
        show ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
      }`}
    >
      {children}
    </span>
  )
}

/**
 * The clipboard, with the old way behind it.
 *
 * `navigator.clipboard` does not exist on an insecure origin — exactly where
 * this gets tried first, a phone opening the dev server over the local
 * network. `execCommand` is deprecated and still works everywhere, and a
 * deprecated copy beats a button that silently does nothing.
 */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Falls through.
  }

  try {
    const holder = document.createElement('textarea')
    holder.value = text
    holder.setAttribute('readonly', '')
    holder.style.position = 'fixed'
    holder.style.top = '-9999px'
    document.body.appendChild(holder)
    holder.select()
    const copied = document.execCommand('copy')
    holder.remove()
    return copied
  } catch {
    return false
  }
}

export default LegalActions
