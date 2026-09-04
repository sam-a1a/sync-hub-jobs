import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import TransportIcons, { type Transport } from '../TransportIcons'
import { useReveal } from '../../hooks/useReveal'

/**
 * The highlights gallery: a snapping row of cards that advances itself.
 *
 * The advance is driven by the progress bar's own CSS animation rather than by
 * a `setInterval`, and that is the load-bearing decision in here. A timer has
 * to be cancelled and restarted to pause, and its remaining time has to be
 * tracked by hand to resume — two pieces of state that can disagree with what
 * the bar is drawing. An animation pauses and resumes exactly where it is, for
 * free, and `animationend` says when the card is done. The bar *is* the clock.
 */
/**
 * Four claims, and every one of them is a thing the platform does — read the
 * CV, list the roles, carry the profile into the application, report the stage.
 *
 * That constraint is the reason three of these were rewritten. The gallery used
 * to promise matching past job titles, applying overnight, and learning from
 * every reply: no part of the product does any of the three. There is no
 * ranking of roles for a candidate at all — browse is newest-first behind a
 * keyword, a place, a work mode and a type — nothing applies on anybody's
 * behalf, and nothing anywhere keeps a record of what worked. A gallery is the
 * wrong place to describe a roadmap; somebody reads these four cards and then
 * goes looking for the features in the product.
 */
const HIGHLIGHTS = [
  {
    title: 'Reads your CV for you.',
    body: 'Experience, skills and projects, pulled out once — and yours to correct.',
    surface: 'from-teal-700 to-teal-900',
  },
  {
    title: 'Every role, in one place.',
    body: 'Keyword, place, work mode, type. The filters live in the link you send.',
    surface: 'from-steel to-charcoal',
  },
  {
    title: 'Apply with what you wrote.',
    body: 'Your profile goes with it — plus whatever that role itself asks.',
    surface: 'from-[#7a3b28] to-[#2b1a14]',
  },
  {
    title: 'Tells you when it moves.',
    body: 'Received, in review, and the answer — every change, not just the last.',
    surface: 'from-[#3f4e2c] to-[#1d3b38]',
  },
]

type Status = 'playing' | 'paused'

const TRANSPORT: Record<Status, Transport> = {
  playing: 'pause',
  paused: 'play',
}

const LABEL: Record<Status, string> = {
  playing: 'Pause highlights gallery',
  paused: 'Play highlights gallery',
}

function HighlightGallery() {
  const trackRef = useRef<HTMLDivElement>(null)
  const dotsRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  /*
   * Paused until it is on screen. The gallery sits well below the fold, and
   * autoplaying from mount means it has already run itself out — sitting on
   * the last card with the replay glyph up — by the time anybody scrolls to
   * it. The one thing it exists to do would have happened to nobody.
   */
  const [status, setStatus] = useState<Status>('paused')

  /*
   * What the *person* has asked for, as opposed to what the observer below
   * would like. Somebody who deliberately paused should not have it start
   * again the moment they scroll a little and come back — the viewport moving
   * is not a request.
   */
  const intent = useRef<'auto' | 'playing' | 'paused'>('auto')
  const sectionRef = useRef<HTMLElement>(null)

  /*
   * The heading and the row arrive separately, on their own travel, and the
   * cards take their places in the row's — see `styles/motion.css`.
   */
  const headRef = useRef<HTMLHeadingElement>(null)
  useReveal(headRef)
  useReveal(trackRef)

  const goTo = useCallback((next: number) => {
    setIndex(next)

    const track = trackRef.current
    const card = track?.children[next] as HTMLElement | undefined
    if (!track || !card) return

    /*
     * `track.scrollTo`, and deliberately not `card.scrollIntoView`.
     *
     * `scrollIntoView` scrolls *every* ancestor that can scroll until the
     * element is in view — the document included, whatever `block` is set to.
     * So each time the gallery advanced on its own it also dragged the page
     * down to itself, and reading anything above it became impossible: the
     * carousel yanked the viewport back every few seconds. Scrolling the track
     * by hand moves the one axis of the one element that should move, and the
     * page is never told anything.
     */
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'smooth' })
  }, [])

  /*
   * Dragging the row is a first-class way to move through it, so the scroll
   * position — not the state — is the source of truth. Two things come out of
   * one read: the rounded index, for the clock and for `aria-current`, and the
   * *fractional* one, which the dots use to size themselves continuously.
   *
   * The fraction is why the indicator does not lurch. It is written straight
   * onto the DOM as a custom property rather than through state: it changes on
   * every scroll frame, and putting sixty React renders a second in front of a
   * number that only CSS reads would be work for nothing.
   */
  useEffect(() => {
    const track = trackRef.current
    const dots = dotsRef.current
    if (!track) return

    let frame = 0
    const read = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const cards = [...track.children] as HTMLElement[]
        if (cards.length < 2) return

        /*
         * Where each card comes to rest, measured rather than derived.
         *
         * `scrollLeft` when card i is on the snap line is just how far it sits
         * past card 0 — the leading gutter cancels out, so no padding has to be
         * read back out of the stylesheet.
         *
         * The clamp is the whole fix. Both ends of the row carry the same
         * gutter, so the last card can never actually reach the snap line: the
         * scroll runs out a few hundred pixels early. Left alone, the maximum
         * progress was about 2.73 of 3, which parks the second-to-last dot
         * permanently a quarter expanded and never fully lights the last one.
         * Clamping each stop to what the track can genuinely reach makes the
         * end of the scroll *mean* the last card, without inventing space
         * after it to make the sum come out.
         */
        const maxScroll = track.scrollWidth - track.clientWidth
        const stops = cards.map((card) =>
          Math.min(card.offsetLeft - cards[0].offsetLeft, maxScroll),
        )

        const left = track.scrollLeft
        let progress = stops.length - 1
        for (let i = 0; i < stops.length - 1; i += 1) {
          const from = stops[i]
          const to = stops[i + 1]
          if (left <= from) {
            progress = i
            break
          }
          if (left < to) {
            progress = i + (left - from) / (to - from)
            break
          }
        }

        dots?.style.setProperty('--gallery-progress', progress.toFixed(4))

        const nearest = Math.round(progress)
        setIndex((current) => (current === nearest ? current : nearest))
      })
    }

    read()
    track.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    return () => {
      track.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
      cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (intent.current !== 'paused') setStatus('playing')
          return
        }
        /*
         * Leaving stops it whatever the intent, and leaves that intent intact —
         * so scrolling past and coming back resumes for someone who never
         * touched the controls, and stays put for someone who did.
         */
        setStatus('paused')
      },
      /*
       * Two fifths of the section, not a single pixel of it. A carousel that
       * starts the instant its top edge clips the viewport is already a card
       * or so in by the time it is actually being looked at.
       */
      { threshold: 0.4 },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  /**
   * The clock ran out, so the card is done — and the last one wraps to the
   * first rather than stopping.
   *
   * A gallery that ends puts a replay button in front of somebody who has not
   * necessarily finished reading it, and turns a background loop into a thing
   * that needs restarting. It just keeps going; pause is still there for
   * anybody who wants it to stop.
   */
  const onProgressEnd = () => {
    goTo((index + 1) % HIGHLIGHTS.length)
  }

  const onTransport = () => {
    const next = status === 'playing' ? 'paused' : 'playing'
    intent.current = next
    setStatus(next)
  }

  return (
    <section
      ref={sectionRef}
      className="gallery w-full overflow-hidden py-20 lg:py-28"
      data-status={status}
      aria-roledescription="carousel"
      aria-label="Highlights"
    >
      {/*
       * `--gallery-edge` and not a padding of its own: the heading has to line
       * up with the controls opposite it and with the page's other content,
       * and the track has to line up with nothing at all.
       */}
      <h2
        ref={headRef}
        className="gallery-head reveal-item text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl"
      >
        The platform you&rsquo;ve always looked for.
      </h2>

      <div ref={trackRef} className="gallery-track flex snap-x snap-mandatory overflow-x-auto">
        {HIGHLIGHTS.map((highlight, i) => (
          <article
            key={highlight.title}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${HIGHLIGHTS.length}`}
            className="gallery-card reveal-item snap-start"
            style={{ '--i': i } as CSSProperties}
          >
            <div
              className={`flex size-full flex-col justify-between rounded-[28px] bg-gradient-to-br p-[var(--card-pad)] ring-1 ring-white/10 ${highlight.surface}`}
            >
              <div>
                <h3 className="max-w-[16ch] text-2xl leading-tight font-semibold text-white sm:text-4xl">
                  {highlight.title}
                </h3>
                <p className="mt-3 max-w-[38ch] text-sm text-white/70 sm:text-base">
                  {highlight.body}
                </p>
              </div>

              {/* A stand-in for the screenshot each highlight will carry. */}
              <div className="mt-10 h-1/2 rounded-2xl bg-white/10 ring-1 ring-white/10" />
            </div>
          </article>
        ))}
      </div>

      <div className="gallery-controls flex items-center justify-center gap-3 lg:justify-end">
        <div
          ref={dotsRef}
          className="gallery-dots flex h-12 items-center gap-4 rounded-full bg-ink/[0.07] px-4 dark:bg-white/10"
        >
          {HIGHLIGHTS.map((highlight, i) => (
            <button
              key={highlight.title}
              type="button"
              aria-label={`Go to ${highlight.title}`}
              aria-current={i === index}
              onClick={() => {
                goTo(i)
                setStatus('playing')
              }}
              className="gallery-dot cursor-pointer"
              data-active={i === index ? '' : undefined}
              style={{ '--item-index': i } as CSSProperties}
            >
              {/*
               * The clock, and nothing to look at. It carries the dwell
               * animation so that pausing is `animation-play-state` rather
               * than arithmetic on a timer — see `styles/motion.css`.
               */}
              <span
                className="gallery-clock"
                onAnimationEnd={i === index ? onProgressEnd : undefined}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onTransport}
          aria-label={LABEL[status]}
          className="inline-flex size-12 cursor-pointer items-center justify-center rounded-full
            bg-ink/[0.07] text-ink transition-[scale,background-color] duration-[var(--hover-fade)]
            ease-[var(--ease-standard)] hover:scale-105 hover:bg-ink/[0.14] active:scale-90
            dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          <span className="size-9">
            <TransportIcons showing={TRANSPORT[status]} />
          </span>
        </button>
      </div>
    </section>
  )
}

export default HighlightGallery
