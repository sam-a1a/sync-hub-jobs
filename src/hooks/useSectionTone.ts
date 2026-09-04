import { useEffect, type RefObject } from 'react'

/**
 * Paints the whole page a different colour while a section is on screen.
 *
 * The attribute goes on `<html>` rather than on the section, because what has
 * to change is the page *behind* everything — the body, the glass in the
 * header, the space either side of a full-bleed row. A section cannot colour
 * what is outside it.
 *
 * The fade itself is a plain CSS transition on that attribute, not a value
 * interpolated per scroll frame. A colour crossing between two flat tones has
 * nothing to track: there is no position it should correspond to, so tying it
 * to the scrollbar only makes it stutter when the scroll does.
 *
 * The observer is deliberately loose. `rootMargin` pulls the trigger line well
 * inside the viewport so the change happens while the section is arriving
 * rather than the instant its first pixel clips the edge — the same reason the
 * gallery waits for 40% before it starts playing.
 */
export function useSectionTone(ref: RefObject<HTMLElement | null>, tone: string): void {
  useEffect(() => {
    const node = ref.current
    if (!node) return

    const root = document.documentElement
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          root.dataset.tone = tone
        } else if (root.dataset.tone === tone) {
          /*
           * Only clears its *own* tone. Two toned sections meeting would
           * otherwise have the outgoing one wipe the incoming one's colour on
           * its way out, and the page would flash back to default between them.
           */
          delete root.dataset.tone
        }
      },
      { rootMargin: '-25% 0px -25% 0px' },
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
      if (root.dataset.tone === tone) delete root.dataset.tone
    }
  }, [ref, tone])
}
