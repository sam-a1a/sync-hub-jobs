import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router'

/**
 * The swap between one screen and the next.
 *
 * `mode="wait"` rather than a crossfade. Two full pages overlapping means two
 * copies of the header, the footer and whatever the incoming page is measuring
 * on mount, all on screen at once — and the taller of the two sets the
 * scrollbar while it lasts, so the page visibly jumps as the old one leaves.
 * Waiting costs the length of one exit and buys a swap that never doubles
 * anything.
 *
 * The key is the pathname alone, not the whole location. A hash change is the
 * contents rail on the legal pages jumping to a section — the same screen, a
 * different place in it — and keying on `location.key` would replay the entire
 * transition every time somebody clicked a heading.
 */

/** Short, and shorter on the way out. */
const ENTER = { duration: 0.32, ease: [0.4, 0, 0.2, 1] } as const
const LEAVE = { duration: 0.2, ease: [0.4, 0, 0.2, 1] } as const

function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  const reduce = useReducedMotion()

  /*
   * A new screen starts at its own top.
   *
   * `scrollRestoration` is already `manual`, which stops the browser putting
   * the scroll back on a reload — but a client-side navigation never told it
   * anything to begin with, so arriving at the terms page from the bottom of
   * the home page would drop the reader into the middle of it.
   *
   * `instant`, and not through Lenis: this runs while the outgoing screen is
   * still on its way out, and an eased scroll would be visible underneath it.
   */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: ENTER }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, transition: LEAVE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export default PageTransition
