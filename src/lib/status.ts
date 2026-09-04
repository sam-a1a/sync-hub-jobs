import type { Application } from './profile/types'

export interface Status {
  key: string
  label: string
  tone: string
  done: boolean
}

export const STATUS_LABELS = ['Received', 'In Review', 'Hired', 'Not Selected', 'Withdrawn', 'Answered']

export const QUIET = 'border-transparent bg-[var(--hover-wash)] text-ink-muted'

export function statusOf(app: Application): Status {
  if (app.outcome === 'withdrawn') return { key: 'withdrawn', label: 'Withdrawn', tone: QUIET, done: true }
  if (app.outcome === 'offer')
    return { key: 'hired', label: 'Hired', tone: 'border-transparent bg-emerald/15 text-emerald', done: true }
  if (app.outcome === 'declined') return { key: 'declined', label: 'Not Selected', tone: QUIET, done: true }
  if (app.stage === 'answer') return { key: 'answered', label: 'Answered', tone: QUIET, done: true }
  if (app.stage === 'review')
    return { key: 'review', label: 'In Review', tone: 'border-transparent bg-apricot/15 text-apricot', done: false }
  return { key: 'received', label: 'Received', tone: 'border-transparent bg-ocean/15 text-ocean', done: false }
}
