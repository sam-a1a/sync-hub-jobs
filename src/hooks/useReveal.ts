import { useLayoutEffect, type RefObject } from 'react'
import { registerReveal, type RevealOptions } from '../lib/reveal'

/**
 * Drives `--reveal` on an element as it comes up the page. See `lib/reveal`.
 *
 * A layout effect rather than an effect, so the first value is on the element
 * before the browser paints it: the alternative is one frame of everything at
 * rest, then everything snapping to hidden, on every load.
 */
export function useReveal(ref: RefObject<HTMLElement | null>, options?: RevealOptions): void {
  const { start, end } = options ?? {}

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    return registerReveal(node, { start, end })
  }, [ref, start, end])
}
