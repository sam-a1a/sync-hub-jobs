import { useEffect, type RefObject } from 'react'

/**
 * How far a tall section has travelled through the viewport, as 0 to 1.
 *
 * Written straight onto the element as a custom property rather than into
 * React state. This changes on every scroll frame and only CSS ever reads it,
 * so putting sixty renders a second in front of it would be work for nothing —
 * the same reason the gallery's dots are driven this way.
 *
 * Two kinds of travel, because two kinds of section need this and they measure
 * different distances:
 *
 *   - `through` is for a tall section with something stuck inside it. Zero is
 *     when its top reaches the top of the screen, one when its bottom does, so
 *     the range is its height *less* one viewport — the extra height is the
 *     timeline;
 *   - `past` is for a section shorter than the screen, which has no such range.
 *     Measured `through`, its travel is negative, clamps to one pixel, and the
 *     value snaps to 1 the instant you scroll — a parallax that is over before
 *     it starts. It measures against its own height instead: fully travelled
 *     once it has scrolled out of the top of the screen.
 */
type Travel = 'through' | 'past'

export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  property = '--progress',
  mode: Travel = 'through',
): void {
  useEffect(() => {
    const node = ref.current
    if (!node) return

    let frame = 0
    const read = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect()
        const travel =
          mode === 'past'
            ? Math.max(1, rect.height)
            : Math.max(1, rect.height - window.innerHeight)
        const passed = -rect.top
        const progress = Math.min(Math.max(passed / travel, 0), 1)
        node.style.setProperty(property, progress.toFixed(4))
      })
    }

    read()
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    return () => {
      window.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
      cancelAnimationFrame(frame)
    }
  }, [ref, property, mode])
}
