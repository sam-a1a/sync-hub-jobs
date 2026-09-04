import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/**
 * A run of text that changes without the change being a jump.
 *
 * The words travel upwards: the outgoing set leaves through the top, the
 * incoming set arrives from below, and the box clips both — so it reads as one
 * phrase rolling up into the next rather than as two of them dissolving in the
 * same place.
 *
 * The width moves as well, and has to. "— not met yet" and "— met" are not the
 * same width, so anything holding them snaps from one to the other at the
 * moment of the swap and undoes the whole effect. It is animated off a copy of
 * the text that is measured and never seen.
 *
 * Both phrases overlap by sitting in the same single grid cell. The obvious
 * alternative is to position them absolutely, but then the box has no height of
 * its own and the line it sits on collapses.
 *
 * Ported from the site's `AuthPanel`, with its `motion/react` springs written
 * as CSS transitions — there is no animation library in this project and one
 * component is not a reason to add 40KB of one.
 */
/** Matches the transitions in `styles/motion.css`. */
const MORPH_MS = 340

function Morph({
  token,
  children,
  className = '',
}: {
  token: string
  children: ReactNode
  /**
   * For the box, not the text. The clip is the whole mechanism, so somewhere
   * with tight leading — the header's call to action — has to be able to open
   * the box up a little or the roll takes the descenders off with it.
   */
  className?: string
}) {
  const sizer = useRef<HTMLSpanElement>(null)
  const [width, setWidth] = useState<number | null>(null)

  /*
   * `useLayoutEffect`, so the width is set before the browser paints. In a
   * plain effect the first frame of every change would be the old width with
   * the new text in it.
   *
   * Measured from the rect, not `offsetWidth`, and rounded *up* with a pixel
   * to spare. `offsetWidth` is an integer, which floors a run of glyphs that
   * is 78.6px wide to 78 and hands the last stem of the last letter to the
   * clip — "Get Started" was arriving as "Get Startec". The pixel of slack is
   * for the antialiased edge, which is drawn past the advance width.
   *
   * And measured again whenever the copy changes size on its own: the
   * webfont landing after mount is the usual reason, and a width taken from
   * the fallback face is wrong for the life of the page otherwise.
   */
  useLayoutEffect(() => {
    const node = sizer.current
    if (!node) return

    const measure = () => {
      const measured = node.getBoundingClientRect().width
      if (measured > 0) setWidth(Math.ceil(measured) + 1)
    }
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(node)
    document.fonts?.ready.then(measure).catch(() => undefined)

    return () => observer.disconnect()
  }, [children])

  /*
   * Two copies are kept: the one arriving and the one leaving. Keying on the
   * token means a change swaps which is which, and the CSS below animates them
   * past each other.
   */
  const [current, setCurrent] = useState({ token, children })
  const [previous, setPrevious] = useState<{ token: string; children: ReactNode } | null>(null)

  if (token !== current.token) {
    setPrevious(current)
    setCurrent({ token, children })
  }

  /*
   * The leaving copy is retired on a timer, not on its `transitionend`.
   *
   * That event is not reliable here: the width only transitions when the two
   * phrases are actually different widths, and a leaving node whose transition
   * is interrupted by the next change never fires one at all. Either way the
   * old text is left in the DOM — invisible, but still read out and still in
   * `innerText`, which is how a heading came to announce both "Sign in" and
   * "Password Reset".
   */
  useEffect(() => {
    if (!previous) return
    const id = window.setTimeout(() => setPrevious(null), MORPH_MS)
    return () => window.clearTimeout(id)
  }, [previous])

  return (
    <span
      className={`morph ${className}`}
      style={width === null ? undefined : { width: `${width}px` }}
    >
      <span ref={sizer} aria-hidden="true" className="morph-sizer">
        {children}
      </span>

      {previous ? (
        <span key={previous.token} className="morph-text" data-state="leaving">
          {previous.children}
        </span>
      ) : null}

      <span key={current.token} className="morph-text">
        {current.children}
      </span>
    </span>
  )
}

export default Morph
