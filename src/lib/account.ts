import { useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'
import { capitalise } from './format'

/**
 * Who is signed in, and whether the account panel is showing.
 *
 * Two module-level stores rather than a context provider, for the same reason
 * the theme is one: both are genuinely global — one value, read from wherever,
 * written from one place — and wrapping the tree to say so buys nothing. The
 * modal in particular is opened by four different buttons in four different
 * sections, none of which is an ancestor of the others.
 *
 * There is no backend behind this yet. It persists so a reload does not sign
 * you out mid-build; it is not, and must not be mistaken for, authentication.
 */
export interface Account {
  name: string
  email: string
}

const STORAGE_KEY = 'sync.jobs.account'

function read(): Account | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<Account>
    if (typeof value?.email !== 'string') return null
    return { name: typeof value.name === 'string' ? value.name : '', email: value.email }
  } catch {
    return null
  }
}

let account: Account | null = typeof window === 'undefined' ? null : read()
let modalOpen = false

const listeners = new Set<() => void>()

function announce(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * A name for somebody who only gave an address.
 *
 * The local part with its separators opened out — `sam.ghazaleh` becomes
 * `Sam Ghazaleh` — because a greeting is the one place a login is allowed to
 * guess, and "Hello, sam.ghazaleh!" is worse than guessing.
 */
export function nameFromEmail(email: string): string {
  const [local = ''] = email.split('@')
  return capitalise(local.replace(/[._-]+/g, ' ').trim())
}

/** The first word of a name, which is what a greeting wants. */
export function firstName(account: Account): string {
  const [first = ''] = account.name.trim().split(/\s+/)
  return first || nameFromEmail(account.email).split(' ')[0] || 'there'
}

export function signIn(next: Account): void {
  account = { ...next, name: next.name.trim() || nameFromEmail(next.email) }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account))
  } catch {
    // Private browsing. The session lasts as long as the tab does.
  }
  announce()
}

function remember(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function changePassword(password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (password.length < 8) {
      reject(new Error('Too short'))
      return
    }
    window.setTimeout(() => {
      remember('sync.jobs.password-changed', new Date().toISOString())
      resolve()
    }, 600)
  })
}

export function signOut(): void {
  account = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear.
  }
  announce()
}

export function useAccount(): Account | null {
  return useSyncExternalStore(
    subscribe,
    () => account,
    () => null,
  )
}

export function openAccountModal(): void {
  if (modalOpen) return
  modalOpen = true
  announce()
}

export function closeAccountModal(): void {
  if (!modalOpen) return
  modalOpen = false
  announce()
}

export function useAccountModal(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => modalOpen,
    () => false,
  )
}

/**
 * What every call-to-action on the page does: open the panel, unless there is
 * already somebody signed in — in which case there is nothing to ask for.
 */
export function useStartAction(): () => void {
  const signedIn = useAccount() !== null
  const navigate = useNavigate()
  return signedIn ? () => void navigate('/profile') : openAccountModal
}
