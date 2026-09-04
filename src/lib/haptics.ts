const TICK = 8

const CAPABLE = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

const TARGETS =
  'a, button, label, summary, input, select, textarea, [role="button"], [data-block="button"]'

export function tick(pointerType?: string): void {
  if (!CAPABLE) return
  if (pointerType !== undefined && pointerType !== 'touch') return
  try {
    navigator.vibrate(TICK)
  } catch {
    /* empty */
  }
}

export function markHaptics(): void {
  if (!CAPABLE || typeof document === 'undefined') return

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType !== 'touch') return
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest(TARGETS)) tick('touch')
    },
    { passive: true },
  )
}
