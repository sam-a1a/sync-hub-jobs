import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * One boolean, and two short timers to keep the pointer from fighting it.
 *
 * `open` is the whole state. It drives a CSS transition, and a transition that
 * is interrupted reverses from wherever it currently is — so there is nothing
 * here tracking "closing", no duration duplicated from the stylesheet, and no
 * second timer that has to finish before the menu is allowed to move. An
 * earlier version of this file had all three, and the effect was a menu that
 * sat still for 460ms after the pointer left and then collapsed with the
 * surface already gone from under it.
 *
 * The delays are the only judgement calls left:
 *
 *   - `openDelay` stops a pointer *sweeping across* the row on its way to the
 *     right-hand buttons from dropping the panel as it passes;
 *   - `closeDelay` covers the few pixels of jitter at the header's own edge.
 *     It is short because it does not have to cover the trip from the trigger
 *     down into the panel — the header closes on leaving *itself*, and that
 *     whole journey happens inside it.
 */
export function useHoverMenu({
  openDelay = 50,
  closeDelay = 60,
}: { openDelay?: number; closeDelay?: number } = {}) {
  const [open, setOpen] = useState(false)
  const timers = useRef<{ open?: number; close?: number }>({})

  const clearTimers = useCallback(() => {
    if (timers.current.open) window.clearTimeout(timers.current.open)
    if (timers.current.close) window.clearTimeout(timers.current.close)
    timers.current = {}
  }, [])

  const enter = useCallback(() => {
    clearTimers()
    timers.current.open = window.setTimeout(() => setOpen(true), openDelay)
  }, [clearTimers, openDelay])

  const leave = useCallback(() => {
    clearTimers()
    timers.current.close = window.setTimeout(() => setOpen(false), closeDelay)
  }, [clearTimers, closeDelay])

  /** Now, not politely: Escape, and moving onto a different nav item. */
  const close = useCallback(() => {
    clearTimers()
    setOpen(false)
  }, [clearTimers])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  useEffect(() => clearTimers, [clearTimers])

  return { open, enter, leave, close }
}
