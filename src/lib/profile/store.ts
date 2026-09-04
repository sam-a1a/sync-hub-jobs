import { useSyncExternalStore } from 'react'
import { SAMPLE_APPLICATIONS, sampleDraft } from './sample'
import { EMPTY_PROFILE, type Application, type Cv, type Draft, type Notification, type Profile } from './types'

interface State {
  profile: Profile
  cvs: Cv[]
  notifications: Notification[]
  applications: Application[]
  built: boolean
}

const STORAGE_KEY = 'sync.jobs.studio.v3'
const PARSE_MS = 19000
const EMPTY: State = { profile: EMPTY_PROFILE, cvs: [], notifications: [], applications: SAMPLE_APPLICATIONS, built: false }

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const value = JSON.parse(raw) as Partial<State>
    return {
      profile: { ...EMPTY_PROFILE, ...(value.profile ?? {}) },
      cvs: Array.isArray(value.cvs) ? value.cvs : [],
      notifications: Array.isArray(value.notifications) ? value.notifications : [],
      applications: Array.isArray(value.applications) ? value.applications : SAMPLE_APPLICATIONS,
      built: value.built === true,
    }
  } catch {
    return EMPTY
  }
}

let state: State = typeof window === 'undefined' ? EMPTY : load()
const listeners = new Set<() => void>()

function commit(next: State): void {
  state = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    return
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useStudio(): State {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY)
}

export const isParsing = (cv: Cv): boolean => cv.parsing_status === 'uploaded' || cv.parsing_status === 'processing'
export const hasReadCv = (cvs: readonly Cv[]): boolean => cvs.some((cv) => cv.parsing_status === 'ready')

const id = (prefix: string): string => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

function notify(kind: Notification['kind'], title: string, body: string): void {
  const note: Notification = { id: id('n'), kind, title, body, at: new Date().toISOString(), read: false }
  commit({ ...state, notifications: [note, ...state.notifications].slice(0, 30) })
}

function patchCv(cvId: string, patch: Partial<Cv>): void {
  commit({ ...state, cvs: state.cvs.map((cv) => (cv.id === cvId ? { ...cv, ...patch } : cv)) })
}

function schedule(cv: Cv, elapsed = 0): void {
  if (cv.parsing_status === 'uploaded') {
    window.setTimeout(() => patchCv(cv.id, { parsing_status: 'processing' }), Math.max(0, 900 - elapsed))
  }
  window.setTimeout(
    () => {
      const current = state.cvs.find((c) => c.id === cv.id)
      if (!current || !isParsing(current)) return
      const failed = /fail/i.test(cv.display_name)
      patchCv(cv.id, {
        parsing_status: failed ? 'failed' : 'ready',
        parsing_error: failed ? 'The file had no text we could read.' : null,
        parsed_at: new Date().toISOString(),
        is_current: !failed && !state.cvs.some((c) => c.is_current),
      })
      if (failed) notify('cv_failed', 'We could not read a CV', `${cv.display_name} had no text we could read. Try another file.`)
      else notify('cv_read', 'Your CV has been read', `${cv.display_name} is ready. It can fill your profile and go out with applications.`)
    },
    Math.max(0, PARSE_MS - elapsed),
  )
}

if (typeof window !== 'undefined') {
  for (const cv of state.cvs) if (isParsing(cv)) schedule(cv, Date.now() - Date.parse(cv.created_at))
}

export const MAX_CVS = 5

export function uploadCv(file: File): Cv {
  const cv: Cv = {
    id: id('cv'),
    display_name: file.name,
    parsing_status: 'uploaded',
    parsing_error: null,
    is_current: false,
    created_at: new Date().toISOString(),
    parsed_at: null,
  }
  commit({ ...state, cvs: [cv, ...state.cvs] })
  schedule(cv)
  return cv
}

export function deleteCv(cvId: string): void {
  const rest = state.cvs.filter((cv) => cv.id !== cvId)
  const firstReady = rest.find((cv) => cv.parsing_status === 'ready')
  const current = rest.some((cv) => cv.is_current)
  commit({ ...state, cvs: rest.map((cv) => (!current && firstReady && cv.id === firstReady.id ? { ...cv, is_current: true } : cv)) })
}

export function makeCurrent(cvId: string): void {
  commit({ ...state, cvs: state.cvs.map((cv) => ({ ...cv, is_current: cv.id === cvId })) })
}

export function setProfile(profile: Profile): void {
  commit({ ...state, profile })
}

export function markBuilt(): void {
  if (!state.built) commit({ ...state, built: true })
}

export function draftFrom(cvId: string, name: string): Promise<Draft> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      const cv = state.cvs.find((c) => c.id === cvId)
      if (!cv || cv.parsing_status !== 'ready') {
        reject(new Error('That CV has not been read.'))
        return
      }
      resolve(sampleDraft(name))
    }, 500)
  })
}

export function readNotification(noteId: string): void {
  commit({ ...state, notifications: state.notifications.map((n) => (n.id === noteId ? { ...n, read: true } : n)) })
}

export function readAllNotifications(): void {
  if (!state.notifications.some((n) => !n.read)) return
  commit({ ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) })
}

export function hasApplied(jobId: string): boolean {
  return state.applications.some((a) => a.id === `app_${jobId}`)
}

export function applyToJob(job: { id: string; title: string; company: string; location: string }): void {
  const now = new Date().toISOString()
  const existing = state.applications.find((a) => a.id === `app_${job.id}`)

  if (existing) {
    commit({
      ...state,
      applications: state.applications.map((a) =>
        a.id === existing.id ? { ...a, stage: 'received', outcome: null, sent_at: now, moved_at: now } : a,
      ),
    })
    return
  }

  const application: Application = {
    id: `app_${job.id}`,
    job: job.title,
    company: job.company,
    location: job.location,
    stage: 'received',
    outcome: null,
    sent_at: now,
    moved_at: now,
  }
  commit({ ...state, applications: [application, ...state.applications] })
}

export function withdrawApplication(appId: string): void {
  commit({
    ...state,
    applications: state.applications.map((a) =>
      a.id === appId ? { ...a, stage: 'answer', outcome: 'withdrawn', moved_at: new Date().toISOString() } : a,
    ),
  })
}

export function resetStudio(): void {
  commit(EMPTY)
}
