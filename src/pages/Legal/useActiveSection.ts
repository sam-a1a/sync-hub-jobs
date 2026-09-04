import { useEffect, useState } from 'react'

/**
 * The line, in pixels down the viewport, that decides which section you are
 * in. Below the sticky header, because a heading tucked underneath the header
 * is a heading you cannot see.
 */
const READING_LINE = 128

/**
 * Which section the reader is looking at, for the contents rail to mark.
 *
 * The rule is the last heading to have crossed the reading line — not
 * whichever heading is most visible, which is what an `IntersectionObserver`
 * would give and which is wrong for exactly the case that matters: a long
 * section whose heading has scrolled off the top is still the section you are
 * in, and it would go unmarked while the next heading, barely on screen at the
 * bottom, took the highlight.
 *
 * The bottom of the page is a special case for the opposite reason. A last
 * section shorter than the viewport can never bring its heading up to the
 * line, so scrolling as far as the page goes would leave the second-to-last
 * item marked. Hitting the end means you are in the last section.
 */
export function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null)

  // Joined, so the effect re-runs when the document changes rather than on
  // every render that happens to rebuild the array.
  const key = ids.join(' ')

  useEffect(() => {
    const sections = key ? key.split(' ') : []
    /*
     * No `setActive(null)` here — the empty case is handled by the return
     * below instead, which substitutes `null` for whatever `active` last held
     * without the effect having to write it. Adjusting state synchronously
     * inside an effect risks a cascading render; there is nothing to adjust
     * when there is nothing to measure.
     */
    if (sections.length === 0) return

    let frame = 0

    const measure = () => {
      frame = 0

      const root = document.documentElement
      if (window.scrollY + window.innerHeight >= root.scrollHeight - 2) {
        setActive(sections[sections.length - 1] ?? null)
        return
      }

      let current = sections[0] ?? null
      for (const id of sections) {
        const heading = document.getElementById(id)
        if (!heading) continue
        if (heading.getBoundingClientRect().top > READING_LINE) break
        current = id
      }

      setActive(current)
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [key])

  return key ? active : null
}
