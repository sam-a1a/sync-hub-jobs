import { useRef, useState, type ChangeEvent, type DragEvent, type PointerEvent } from 'react'
import Icon from '../Icon'
import { CV_FILE_ACCEPT, CV_FORMATS, MAX_CV_MB, rejectionFor } from '../../lib/profile/files'
import { MAX_CVS, isParsing } from '../../lib/profile/store'
import type { Cv } from '../../lib/profile/types'

export function Tray({
  cvs,
  onUpload,
  compact = false,
}: {
  cvs: readonly Cv[]
  onUpload: (file: File) => void
  compact?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const tray = useRef<HTMLDivElement>(null)
  const [over, setOver] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)
  const atCap = cvs.length >= MAX_CVS
  const reading = cvs.find(isParsing)

  const take = (file: File | undefined) => {
    if (!file) return
    const rejected = rejectionFor(file)
    setRefusal(rejected)
    if (!rejected) onUpload(file)
  }
  const aim = (clientX: number, clientY: number) => {
    const node = tray.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    node.style.setProperty('--mx', `${((clientX - rect.left) / rect.width) * 100}%`)
    node.style.setProperty('--my', `${((clientY - rect.top) / rect.height) * 100}%`)
  }
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    aim(event.clientX, event.clientY)
    tray.current?.style.setProperty('--tray-glow', '0.7')
  }
  const onDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    aim(event.clientX, event.clientY)
    if (!atCap) setOver(true)
  }
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setOver(false)
    if (!atCap) take(event.dataTransfer.files?.[0])
  }

  return (
    <div className="grid gap-4">
      <div
        ref={tray}
        role="button"
        tabIndex={atCap ? -1 : 0}
        aria-disabled={atCap}
        aria-label={atCap ? 'No CV slots free' : 'Drop your CV here, or choose a file'}
        data-over={over ? '' : undefined}
        onPointerMove={onMove}
        onPointerLeave={() => tray.current?.style.setProperty('--tray-glow', '0')}
        onDragEnter={onDrag}
        onDragOver={onDrag}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onClick={() => !atCap && input.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !atCap) {
            event.preventDefault()
            input.current?.click()
          }
        }}
        className={`tray flex flex-col items-center justify-center gap-6 rounded-[32px] bg-paper-raised/40 px-8 text-center backdrop-blur-xl ${compact ? 'py-10' : 'py-16 sm:py-20'} ${atCap ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <div className="tray-pages" aria-hidden="true">
          <span className="tray-page" />
          <span className="tray-page" />
          <span className="tray-page">
            <span className="tray-page-line" style={{ top: 22 }} />
            <span className="tray-page-line" style={{ top: 36, right: 30 }} />
            <span className="tray-page-line" style={{ top: 50 }} />
            <span className="tray-page-line" style={{ top: 64, right: 40 }} />
          </span>
        </div>
        <div>
          <p className="text-xl font-semibold tracking-[-0.02em] text-ink">
            {atCap ? `You are keeping all ${MAX_CVS} CVs` : reading ? 'Reading one now. Drop another anytime.' : 'Drop your CV here'}
          </p>
          <p className="mt-1.5 text-sm text-ink-muted">
            {atCap ? 'Remove one to make room.' : (
              <>
                or <span className="font-medium text-teal-600 underline decoration-teal-500/40 underline-offset-4 dark:text-teal-400">choose a file</span> · {CV_FORMATS}, up to {MAX_CV_MB} MB
              </>
            )}
          </p>
        </div>
        {atCap ? null : <input ref={input} type="file" accept={CV_FILE_ACCEPT} aria-label="Choose a CV file" className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => { take(event.target.files?.[0]); event.target.value = '' }} />}
      </div>
      {refusal ? (
        <p role="alert" className="row-in flex items-center gap-2 rounded-2xl bg-brick/10 px-4 py-3 text-sm text-brick">
          <Icon name="close" size={16} />
          {refusal}
        </p>
      ) : null}
    </div>
  )
}
