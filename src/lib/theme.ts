/**
 * Light, dark, or whatever the operating system is doing.
 *
 * Three states rather than two. "System" is not a synonym for light — it is a
 * standing instruction to keep following the OS, so a tab left open turns dark
 * at sunset with everything else on the machine. Pinning light or dark is the
 * override, and it is remembered per device.
 *
 * Dark is where a device that has never been told starts, whatever its OS is
 * doing. The page is designed dark first — the field behind the hero is at its
 * best on black — and a first visit should see it that way. The toggle still pins light for anyone who wants it, and
 * "system" is kept for anything that already stored it.
 *
 * The class goes on `<html>`, which is what the `dark:` variant in `index.css`
 * matches. `color-scheme` is set alongside it so the browser's own furniture —
 * scrollbars, form controls, the flash before the first paint — follows too;
 * without it a dark page keeps light scrollbars.
 */

export const THEMES = ['system', 'light', 'dark'] as const

export type Theme = (typeof THEMES)[number]

/** What a theme actually resolves to once the OS has been consulted. */
export type Appearance = 'light' | 'dark'

export const DEFAULT_THEME: Theme = 'dark'

const STORAGE_KEY = 'sync.jobs.theme'
const QUERY = '(prefers-color-scheme: dark)'

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

export function systemAppearance(): Appearance {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia(QUERY).matches ? 'dark' : 'light'
}

export function resolveTheme(theme: Theme): Appearance {
  return theme === 'system' ? systemAppearance() : theme
}

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

function rememberTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Private browsing. The choice lasts as long as the tab does.
  }
}

/** Paints the choice onto the document. Safe to call as often as you like. */
export function applyTheme(theme: Theme): Appearance {
  const appearance = resolveTheme(theme)

  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', appearance === 'dark')
    document.documentElement.style.colorScheme = appearance
  }

  return appearance
}

/*
 * The store.
 *
 * A module-level value with a listener set rather than a context provider,
 * because the theme is genuinely global — one value, read from wherever, set
 * from one button — and wrapping the tree to say so buys nothing. React
 * subscribes to it through `useSyncExternalStore` in `hooks/useTheme`.
 *
 * Note that `current` is the *choice* and not the appearance: a device left on
 * "system" has to keep tracking the OS, and collapsing the two at rest would
 * throw away the standing instruction on the first repaint.
 */
let current: Theme = typeof window === 'undefined' ? DEFAULT_THEME : (storedTheme() ?? DEFAULT_THEME)

const listeners = new Set<() => void>()

function announce(): void {
  for (const listener of listeners) listener()
}

export function subscribeToTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getTheme(): Theme {
  return current
}

/** For `useSyncExternalStore`'s server snapshot, which must not read the DOM. */
export function getDefaultTheme(): Theme {
  return DEFAULT_THEME
}

/**
 * Records the choice and tells everybody. Deliberately does *not* paint:
 * `useTheme` does that inside a view transition, and a store that also wrote
 * to the document would mean the class landing before the browser had taken
 * its snapshot — which is the transition animating from the new colours to the
 * new colours.
 */
export function setTheme(theme: Theme): void {
  if (theme === current) return
  current = theme
  rememberTheme(theme)
  announce()
}

/**
 * Calls back when the OS switches, so a tab left open overnight follows.
 *
 * Returns the unsubscribe. The listener stays attached whatever the current
 * choice is — it is the *caller* that decides whether a system change matters,
 * because attaching and detaching on every toggle is more moving parts than
 * ignoring an event.
 */
export function watchSystemAppearance(onChange: (appearance: Appearance) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}

  const media = window.matchMedia(QUERY)
  const listener = (event: MediaQueryListEvent) => onChange(event.matches ? 'dark' : 'light')
  media.addEventListener('change', listener)

  return () => media.removeEventListener('change', listener)
}
