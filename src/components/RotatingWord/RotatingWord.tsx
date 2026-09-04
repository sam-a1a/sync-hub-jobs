import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { setTone, type Tone } from '../../lib/tone'
import { prefersReducedMotion } from '../../lib/transition'

/**
 * The word in the headline that keeps changing, and the pill around it.
 *
 * Three things move together and all three have to be smooth or none of them
 * are: the word crosses over letter by letter, the pill's width follows it,
 * and the pill's tint changes colour. They share one clock so the headline
 * reads as one object changing its mind rather than three effects firing at
 * once.
 *
 * The width is the awkward one. `width: auto` is not interpolable, so the pill
 * would snap from "Discover" to "Grow" and drag the rest of the line with it.
 * So every word is measured once, off-screen but in the real font at the real
 * size, and the container is given a number it can animate between.
 */
const WORDS: readonly { text: string; tone: Tone }[] = [
  { text: 'Discover', tone: 'discover' },
  { text: 'Match', tone: 'match' },
  { text: 'Apply', tone: 'apply' },
  { text: 'Land', tone: 'land' },
  { text: 'Rise', tone: 'rise' },
  { text: 'Grow', tone: 'grow' },
]

/** Long enough to read the word twice and still feel unhurried. */
const DWELL_MS = 2800

function RotatingWord() {
  const [index, setIndex] = useState(0)
  /*
   * The word on its way out, tracked separately so it can leave *upwards*
   * while the arriving one comes up from below. Without it every inactive word
   * would sit in the same waiting position and the crossfade would have no
   * direction — the old word would sink back the way the new one came.
   */
  const [leaving, setLeaving] = useState<number | null>(null)

  const sizers = useRef<(HTMLSpanElement | null)[]>([])
  const [widths, setWidths] = useState<number[]>([])

  useLayoutEffect(() => {
    const measure = () =>
      setWidths(WORDS.map((_, i) => sizers.current[i]?.getBoundingClientRect().width ?? 0))

    measure()

    /*
     * Three things move the numbers after mount, and all three arrive late:
     * the breakpoint that changes the font size, a window resize, and the
     * webfont finishing. Measuring in the fallback font and never again leaves
     * every pill slightly the wrong width for the life of the page.
     */
    const observer = new ResizeObserver(measure)
    for (const node of sizers.current) if (node) observer.observe(node)
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure).catch(() => undefined)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  useEffect(() => {
    /*
     * Somebody who asked for less motion gets the first word and nothing else.
     * This is decorative and it runs forever — it is exactly what that setting
     * is for, and stopping the timer is the only honest way to respect it.
     */
    if (prefersReducedMotion()) return

    const id = window.setInterval(() => {
      setIndex((current) => {
        setLeaving(current)
        return (current + 1) % WORDS.length
      })
    }, DWELL_MS)

    return () => window.clearInterval(id)
  }, [])

  /*
   * Tells the page which word it is on. The field behind the hero takes its
   * colour from this, on the same clock as the pill, so the two never drift
   * apart. Written from an effect rather than inside the interval so the first
   * word is announced too.
   */
  useEffect(() => {
    setTone(WORDS[index].tone)
  }, [index])

  const width = widths[index]

  return (
    <span
      aria-hidden="true"
      className="hero-pill inline-flex items-center rounded-full px-[0.4em] py-[0.05em] align-middle"
      data-tone={WORDS[index].tone}
    >
      <span
        className="hero-words relative inline-block h-[1.1em]"
        style={width ? { width: `${width}px` } : undefined}
      >
        {WORDS.map((word, i) => (
          <span
            key={word.text}
            className="hero-word"
            data-state={i === index ? 'active' : i === leaving ? 'leaving' : undefined}
          >
            {/*
             * One box per letter, each told its place in the word. The stagger
             * itself lives in `styles/motion.css` — all this has to do is hand
             * over the index.
             */}
            {[...word.text].map((char, position) => (
              <span
                key={`${word.text}-${position}`}
                className="hero-char"
                style={{ '--i': position } as CSSProperties}
              >
                {char}
              </span>
            ))}
          </span>
        ))}

        {/*
         * The measuring copy. `visibility: hidden` rather than `display: none`
         * — a box that is not laid out has no width to read — and absolutely
         * positioned so it contributes nothing to the line it is sitting in.
         *
         * It is split into the same per-letter boxes as the real thing, and
         * that is not tidiness. An `inline-block` per character suppresses the
         * kerning between them, so a word measured as one run of text comes
         * out a pixel or two narrower than the same word rendered as letters —
         * and the pill would clip its own last letter by exactly that much.
         * Measure what you draw.
         */}
        <span className="pointer-events-none invisible absolute top-0 left-0 whitespace-nowrap">
          {WORDS.map((word, i) => (
            <span
              key={word.text}
              ref={(node) => {
                sizers.current[i] = node
              }}
              className="absolute top-0 left-0"
            >
              {[...word.text].map((char, position) => (
                <span key={`${word.text}-${position}`} className="inline-block">
                  {char}
                </span>
              ))}
            </span>
          ))}
        </span>
      </span>
    </span>
  )
}

export default RotatingWord
