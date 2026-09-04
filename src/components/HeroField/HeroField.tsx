import { useEffect, useRef } from 'react'

/**
 * The field behind the hero: a slow wash under a drift of points that keep
 * finding each other.
 *
 * All this component does is hold the box and hand it to `field.ts` once the
 * page has painted. The scene — and three.js with it — is a dynamic import,
 * so it lands in its own chunk that the headline never waits on: the text is
 * on screen, the fonts are settling, and *then* the field fades up underneath.
 * A hero that shows a blank canvas while a renderer downloads is the wrong
 * order of things.
 *
 * `requestIdleCallback` where it exists, so the import does not compete with
 * the first frames of the word animation and the marquee; a short timeout
 * where it does not. Either way the effect's cleanup can cancel a start that
 * has not happened yet and tear down one that has.
 *
 * The box reaches below the section it sits in, into the logo wall's top
 * padding — the same distance as that padding, so the field runs out exactly
 * where "The best teams" begins and dissolves before it gets there.
 */
function HeroField() {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = host.current
    if (!node) return

    let cancelled = false
    let dispose: (() => void) | undefined

    const start = () => {
      import('./field')
        .then(({ mountField }) => {
          if (!cancelled) dispose = mountField(node)
        })
        .catch(() => {
          /* No WebGL, or the chunk failed to load. The hero is fine without it. */
        })
    }

    const idle = 'requestIdleCallback' in window ? window.requestIdleCallback(start, { timeout: 1500 }) : null
    const timer = idle === null ? window.setTimeout(start, 240) : null

    return () => {
      cancelled = true
      if (idle !== null) window.cancelIdleCallback(idle)
      if (timer !== null) window.clearTimeout(timer)
      dispose?.()
    }
  }, [])

  return (
    /*
     * Invisible until the scene has drawn a frame, then a long fade up under
     * the headline — which by then has finished its own arrival. The field
     * appearing in one frame, complete, would be the loudest thing on the
     * page.
     */
    <div
      ref={host}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -bottom-16 -z-10 opacity-0
        transition-opacity duration-[1800ms] ease-[var(--ease-standard)] data-ready:opacity-100
        sm:-bottom-28 lg:-bottom-36 [&>canvas]:block [&>canvas]:size-full"
    />
  )
}

export default HeroField
