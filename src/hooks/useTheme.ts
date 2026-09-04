import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import {
  applyTheme,
  getDefaultTheme,
  getTheme,
  resolveTheme,
  setTheme,
  subscribeToTheme,
  watchSystemAppearance,
  type Appearance,
  type Theme,
} from '../lib/theme'
import { withTransition } from '../lib/transition'

/**
 * The theme, and the one button that changes it.
 *
 * `useSyncExternalStore` rather than state in a provider: the store in
 * `lib/theme` is where the value actually lives, because it has to be readable
 * by the inline script in `index.html` before React exists and writable by the
 * OS watcher below regardless of what is mounted.
 */
export function useTheme(): {
  theme: Theme
  appearance: Appearance
  toggle: () => void
} {
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, getDefaultTheme)
  const appearance = resolveTheme(theme)

  /*
   * The OS watcher. It only repaints while the choice is still "system" —
   * somebody who has pinned a side has said they do not want to follow along —
   * but the listener stays attached either way, because attaching and
   * detaching it on every toggle is more moving parts than ignoring an event.
   */
  useEffect(() => {
    return watchSystemAppearance(() => {
      if (getTheme() === 'system') applyTheme('system')
    })
  }, [])

  const toggle = useCallback(() => {
    /*
     * A two-way flip. The model underneath still has a third state — "system",
     * following the OS — but it is not a stop on the toggle, and it is not
     * where anybody starts either: a new device starts dark. Nobody cycles
     * *into* following the OS; they either leave it alone or they pin a side.
     */
    const next: Theme = resolveTheme(getTheme()) === 'dark' ? 'light' : 'dark'

    withTransition('theme', () => {
      /*
       * Both halves of the change, synchronously, because the browser
       * snapshots the page the instant this returns. `applyTheme` swings the
       * palette; `flushSync` makes React commit the icon swap in the same
       * frame, so the moon and the sun crossfade with everything else instead
       * of popping one frame later.
       */
      applyTheme(next)
      flushSync(() => setTheme(next))
    })
  }, [])

  return { theme, appearance, toggle }
}
