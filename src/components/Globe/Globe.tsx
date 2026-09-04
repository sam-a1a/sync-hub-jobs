import { useEffect, useRef } from 'react'

/**
 * The globe in the footer: the world, and the lines every part of it sends
 * to Syria.
 *
 * Like the field behind the hero, the component only holds the box. The scene
 * — three.js, the land mask, the arcs — is a dynamic import, and here it does
 * not even start until the footer is on its way: the observer's margin is a
 * screen or so, which is enough for the chunk to land before the reveal
 * slides the footer out from under the page.
 *
 * `touch-pan-y`, because the box takes the pointer for dragging. Without it a
 * thumb that lands on the globe on the way down the page would spin the earth
 * instead of scrolling — sideways drags are the globe's, vertical ones stay
 * the page's.
 */
function Globe({
  className = '',
  align = 'right',
}: {
  className?: string
  /** Which side of its box the sphere keeps to; the scene reads this. */
  align?: 'right' | 'centre'
}) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = host.current
    if (!node) return

    let cancelled = false
    let dispose: (() => void) | undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        import('./scene')
          .then(({ mountGlobe }) => {
            if (!cancelled) dispose = mountGlobe(node)
          })
          .catch(() => {
            /* No WebGL, or the chunk failed to load. The footer is fine without it. */
          })
      },
      { rootMargin: '900px 0px' },
    )
    observer.observe(node)

    return () => {
      cancelled = true
      observer.disconnect()
      dispose?.()
    }
  }, [])

  return (
    /*
     * Invisible until the scene says it has something to show — the land has
     * loaded and drawn — then a long fade up. A globe that pops in with its
     * continents arriving a beat later is two events; this is one.
     */
    <div
      ref={host}
      data-align={align}
      aria-hidden="true"
      className={`relative cursor-grab touch-pan-y select-none opacity-0 transition-opacity
        duration-[1600ms] ease-[var(--ease-standard)] active:cursor-grabbing data-ready:opacity-100
        [&>canvas]:block [&>canvas]:size-full ${className}`}
    />
  )
}

export default Globe
