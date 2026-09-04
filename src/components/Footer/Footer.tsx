import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLenis } from 'lenis/react'
import BrandIcon, { type BrandName } from '../BrandIcon'
import Globe from '../Globe'
import { prefersReducedMotion } from '../../lib/transition'
import { openAccountModal, useAccount } from '../../lib/account'
import { asset } from '../../lib/asset'

/**
 * The footer, and the reveal it slides out from under the page with.
 *
 * Ported from the site's own `SiteFooter`. The trick is three boxes: a short
 * window in the document, a tall inner box pulled up by a viewport's worth, and
 * a sticky panel inside that. Scrolling the window past the bottom of the page
 * drags the panel up through it.
 *
 * All three need the panel's height, and writing it in as a constant is the
 * obvious version that does not survive contact with a phone: the columns stack
 * and the panel needs half again as much, so the window clips it and the last
 * column falls off the end.
 *
 * So the height is measured, and the reveal turns itself off when it cannot
 * work. The offset the panel sticks at is `100vh - height`, which goes negative
 * the moment the footer is taller than the window — the panel then pins with
 * its head above the top of the screen and no amount of scrolling brings it
 * back. There is nothing to be done about that within the effect, and a footer
 * you cannot read all of is worse than a footer that merely arrives. Past that
 * point it becomes an ordinary block at the bottom of the page, which is what a
 * narrow screen wants anyway.
 */
const WIDE = '(min-width: 64rem)'

function useWide(): boolean {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(WIDE).matches,
  )

  useEffect(() => {
    if (!window.matchMedia) return
    const media = window.matchMedia(WIDE)
    const read = () => setWide(media.matches)
    read()
    media.addEventListener('change', read)
    return () => media.removeEventListener('change', read)
  }, [])

  return wide
}

function Footer() {
  const panel = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)
  const [room, setRoom] = useState<number | null>(null)
  const lenis = useLenis()
  const wide = useWide()

  useLayoutEffect(() => {
    const node = panel.current
    if (!node) return

    const measure = () => {
      setHeight(node.getBoundingClientRect().height)
      setRoom(window.innerHeight)
    }

    /*
     * A `ResizeObserver` rather than a one-off: the footer's height answers to
     * the fonts finishing loading and the width the columns have to stack at,
     * neither of which has landed at mount.
     */
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    window.addEventListener('resize', measure)
    measure()

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  /*
   * Lenis caches how far the page goes. The footer settling at a new height
   * moves the bottom out from under that cache, and the scroll then clamps
   * somewhere short of it.
   */
  useEffect(() => {
    lenis?.resize()
  }, [lenis, height, room])

  /*
   * Until the first measurement lands there is nothing to lay the reveal out
   * with. `useLayoutEffect` measures before the browser paints, so that state
   * is never actually seen. A height of zero means the panel is not on screen
   * to be measured, which is not a footer that fits — it is one that has not
   * been read yet.
   */
  const reveals = wide && height !== null && room !== null && height > 0 && height <= room

  /*
   * The same three boxes either way, wearing the reveal's styles or none.
   *
   * Returning a different shape per mode looks tidier and quietly breaks it:
   * switching shape remounts the panel, which leaves the observer holding a
   * node that is no longer in the document. A detached node measures zero, zero
   * is under any viewport, so it stays in reveal mode with every height
   * collapsed to nothing and the footer parked below the fold. One tree, and
   * the node the observer holds is the node on screen.
   */
  const shell = reveals
    ? ({
        position: 'relative',
        height,
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      } as const)
    : undefined

  const lift = reveals
    ? ({ position: 'relative', height: `calc(100vh + ${height}px)`, top: '-100vh' } as const)
    : undefined

  const pin = reveals
    ? ({ height, position: 'sticky', top: `calc(100vh - ${height}px)` } as const)
    : undefined

  return (
    <div className="print:hidden" style={shell}>
      <div style={lift}>
        <div style={pin}>
          <Content ref={panel} />
        </div>
      </div>
    </div>
  )
}

/** How long the ride to the top takes. */
const LIFT_MS = 700

/**
 * How much of the ride's tail the page change is allowed to overlap.
 *
 * The two motions read as one gesture only if they touch. Waiting for the
 * scroll to land before starting the transition leaves a hole in the middle
 * where nothing moves, and a gesture with a hole in it is two gestures.
 */
const OVERLAP_MS = 140

/**
 * The ride's own easing, rather than the one Lenis is configured with globally.
 *
 * That one is an expo-out, which spends the last third of its time covering the
 * last few pixels — fine for a wheel flick, wrong here, because the ride looks
 * finished long before it is and the wait for the swap is time the page spends
 * visibly doing nothing. A cubic-out arrives when it says it does.
 */
const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3)

/*
 * The two columns that are lists of links. The third is not — it is one
 * button, written out where it is used rather than squeezed into this shape.
 */
const COLUMNS = [
  {
    title: 'Jobs',
    links: ['Browse Jobs', 'Saved Jobs', 'Employers'],
  },
  {
    title: 'SYNC',
    links: ['About', 'Contact', 'Press'],
  },
] as const

const SOCIALS: { name: BrandName; label: string; href: string }[] = [
  { name: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/company/sync-sv' },
  { name: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/sync_ngo' },
  { name: 'discord', label: 'Discord', href: 'https://discord.gg/theAgJ5cE' },
  { name: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/share/1DJPor89e6/' },
]

/*
 * The legal line's links, which go teal rather than staying ink on hover.
 *
 * `transition-colors` carries the underline with the words: it covers
 * `text-decoration-color` as well as `color`, so the rule under a link travels
 * at the same time rather than staying ink under teal text.
 */
const FOOTER_LINK =
  'cursor-pointer font-medium text-ink underline underline-offset-4 ' +
  'transition-colors duration-300 ease-[var(--ease-standard)] hover:text-teal-600 dark:hover:text-teal-400'

const FOOTER_ITEM =
  'text-sm text-ink-muted transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:text-ink'

function Content({ ref }: { ref?: React.Ref<HTMLDivElement> }) {
  const year = new Date().getFullYear()
  const signedIn = useAccount() !== null

  return (
    /*
     * `min-h`, not `h-full`. Measuring an element that has been told its height
     * only ever reads that height back, and the floor keeps the roomy
     * four-column footer a desktop has space for.
     *
     * And `lg:` — the floor belongs to the four-column layout and nothing else.
     * Below that breakpoint the columns stack, the tall mark in the middle is
     * `hidden`, and `justify-between` on the column has only two children left
     * to push apart: the links and the legal line. Every pixel by which 800
     * exceeded the stacked content therefore landed in one gap, as a void under
     * the last column. Without the floor the footer is simply as tall as what
     * is in it, which is what a phone wants.
     */
    <div ref={ref} className="flex w-full flex-col bg-paper-sunken lg:min-h-[800px]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-between px-6 pt-16 pb-0">
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-x-16">
          <div>
            <p className="text-[22px] font-bold tracking-[-0.04em] text-ink">SYNC Hub</p>
            {/*
             * Three beats, each shorter than the last, and no sentence with a
             * subject in it.
             *
             * The previous line had two problems. It claimed the product was
             * free for employers, which it is not. And it was still explaining
             * — "the people looking, and the people hiring" is a definition of
             * the audience, and naming your audience to your audience is the
             * one thing this register never does. "Always free to look" says
             * the same true half without defining anyone.
             */}
            <p className="mt-3 max-w-[34ch] text-sm text-ink-muted">
              Work worth doing. Found faster. Always free to look.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {SOCIALS.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-1.5 text-xs font-medium text-ink transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:border-ink"
                >
                  {/*
                   * The brand mark replaces the outward arrow the pill used to
                   * carry. Both were saying the same thing — this leaves the
                   * site — and the mark says it more precisely, since it also
                   * says *where*. Two marks on a pill this size is a crowd.
                   */}
                  <BrandIcon name={social.name} />
                  {social.label}
                </a>
              ))}
            </div>
          </div>

          {/*
           * `lg:contents` is doing the whole of the responsive placement.
           * Above `lg` the wrapper dissolves and its children become grid items
           * in their own right, so the four-column footer is exactly the four
           * columns it always was. Below it, the wrapper is a row of its own —
           * two short lists of links with the mark in the space they leave
           * beside them, which on a phone is the only place in the footer with
           * any room in it.
           */}
          <div className="grid grid-cols-3 items-start gap-6 lg:contents">
            <FooterColumn title={COLUMNS[0].title}>
              {COLUMNS[0].links.map((link) =>
                /*
                 * "Saved Jobs" is the one link in this column that names
                 * something that cannot exist without an account. Signed out,
                 * following it would either 404 or show an empty list that
                 * explains nothing — so it opens the sign-in panel instead, the
                 * same one every call to action on the page opens. Once signed
                 * in it behaves like every other link here.
                 */
                link === 'Saved Jobs' && !signedIn ? (
                  <button
                    key={link}
                    type="button"
                    onClick={openAccountModal}
                    className={`${FOOTER_ITEM} cursor-pointer text-left`}
                  >
                    {link}
                  </button>
                ) : (
                  <LiftLink key={link}>{link}</LiftLink>
                ),
              )}
            </FooterColumn>

            <FooterColumn title={COLUMNS[1].title}>
              {COLUMNS[1].links.map((link) => (
                <a key={link} href="#" className={FOOTER_ITEM}>
                  {link}
                </a>
              ))}
            </FooterColumn>

            {/*
             * `self-end` overrides the row's `items-start` for this cell only.
             *
             * The mark is shorter than the link lists beside it, so the row has
             * slack to put somewhere. Top-aligned it all piled underneath;
             * centred it split in two. Sitting the block on the row's baseline
             * instead puts the mark level with the last link and drops the
             * byline into the space above the next column — so it reads as
             * belonging between the two halves of the footer rather than as a
             * third column that ran short.
             *
             * The override costs nothing above `lg`, where the wrapper is
             * `contents` and its `items-start` no longer applies to anything.
             */}
            <FooterColumn title="For Employers">
              <a href="#" className={FOOTER_ITEM}>
                Explore &amp; Request Access
              </a>
            </FooterColumn>
          </div>
        </div>

        {/*
         * The phone's globe. There is no spare row on a narrow screen — the
         * columns stack and the mark has already gone in beside the links —
         * so the world gets a band of its own under them, edge to edge, with
         * the sphere in the middle of it. `-mx-6` undoes the container's
         * padding so the halo has the whole width to fade into.
         */}
        <div className="-mx-6 mt-12 h-[300px] lg:hidden">
          <Globe align="centre" className="size-full" />
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 lg:hidden">
          <Mark className="size-20" />
          <ByLine centred small className="max-w-[10rem]" />
        </div>

        {/*
         * The mark, in the room the four columns leave behind.
         * `justify-between` on the column above puts every one of those spare
         * pixels here, between the last link and the legal line — which on a
         * desktop is a third of the footer's height with nothing in it. Hidden
         * on a phone, where the copy stacks and there is no such room; the one
         * beside the links is the phone's answer.
         */}
        <div className="hidden flex-1 items-center gap-5 py-10 lg:flex">
          <Mark className="size-40" />
          <ByLine />
          {/*
           * The globe, under the last column. `self-stretch` gives it the
           * row's whole height to be round in; the width is what the sphere
           * and the light around it need, and no more. `-mr-6` lets the box
           * run out to the container's edge — the same distance as the
           * padding it undoes, so it never leaves the container — which is
           * room for the halo to fade rather than be cut. It takes the
           * pointer, so it sits on the far side of the byline where a hand
           * reaching for the link never crosses it.
           */}
          <Globe className="-mr-6 ml-auto w-[440px] self-stretch" />
        </div>

        <div className="mt-14 border-t border-hairline py-7">
          <div className="flex flex-col items-center gap-4 text-center text-xs text-ink-muted sm:flex-row sm:justify-between sm:text-left">
            <p>
              © {year} SYNC Hub. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2">
              {/*
               * Only the documents that exist. There is no cookie policy, so
               * there is no link to one — a dead entry in a legal line is worse
               * than a short legal line.
               */}
              {[
                { label: 'Privacy Policy', to: '/privacy' },
                { label: 'Terms & Conditions', to: '/terms' },
              ].map(({ label, to }, index) => (
                <span key={label} className="contents">
                  {index > 0 ? (
                    <span aria-hidden className="text-ink-faint">
                      •
                    </span>
                  ) : null}
                  <LiftLink to={to} className={FOOTER_LINK}>
                    {label}
                  </LiftLink>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The company's mark.
 *
 * `aria-hidden` and no alt: the name is already written at the top of the
 * footer in text, and a screen reader that meets it twice learns nothing the
 * second time. This is the picture of a thing already said.
 */
function Mark({ className = '' }: { className?: string }) {
  return (
    <img
      src={asset("/sync-logo.png")}
      alt=""
      aria-hidden
      width={160}
      height={160}
      loading="lazy"
      className={`rounded-[20px] object-contain ${className}`}
    />
  )
}

/**
 * Who made it, next to the mark that says what it is — and, under that, what
 * it is for.
 *
 * Only the organisation's name is the link. "by" is the sentence the footer is
 * saying; underlining it too would promise that the word is part of the target.
 *
 * "Connecting Syria." sits on its own line beneath, and it lines up with the
 * name, not with "by": two columns, the word in the first and everything said
 * about the organisation in the second, so the second line reads as more
 * about SYNC NGO rather than as a new sentence. In ink where the byline is
 * muted, because of the two it is the one that says something.
 *
 * On a phone the block sits under the mark and everything in it centres,
 * which is one column again.
 */
function ByLine({
  className = '',
  centred = false,
  small = false,
}: {
  className?: string
  centred?: boolean
  small?: boolean
}) {
  const size = small ? 'text-xs' : 'text-sm'

  /*
   * Flex with a real gap rather than a space character. A `{' '}` between an
   * underlined link and the word before it is a space the underline has to
   * stop at and the eye has to cross — at this size the two words looked
   * jammed together. A gap is also the only way to space it independently of
   * the font's own word spacing.
   */
  const about = (
    <>
      <a href="https://sync.ngo" target="_blank" rel="noreferrer" className={FOOTER_LINK}>
        SYNC NGO
      </a>
      {/* The same separator the legal line uses, so the footer has one dot. */}
      <span aria-hidden className="text-ink-faint">
        •
      </span>
      <span>Sham / Silicon Valley</span>
    </>
  )

  if (centred) {
    return (
      <div className={`text-center ${className}`}>
        <p className={`flex flex-wrap items-center justify-center gap-2 text-ink-muted ${size}`}>
          <span>by</span>
          {about}
        </p>
        <p className={`mt-1.5 font-medium text-ink ${size}`}>Connecting Syria.</p>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-1.5 ${className}`}>
      <span className={`text-ink-muted ${size}`}>by</span>
      <p className={`flex flex-wrap items-center gap-2 text-ink-muted ${size}`}>{about}</p>
      <span aria-hidden />
      <p className={`font-medium text-ink ${size}`}>Connecting Syria.</p>
    </div>
  )
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="mt-4 grid gap-2.5">{children}</div>
    </div>
  )
}

/**
 * A link that takes you back to the top before it takes you anywhere else.
 *
 * These sit at the very bottom of a long page, and following one otherwise
 * means the destination appearing already scrolled to its own top with no sense
 * of having travelled — the reset on navigation is instant and invisible. So
 * the click rides up first and the navigation waits for it.
 *
 * The swap at the end of the ride is the page transition in `PageTransition`,
 * started a beat before the scroll lands so the two overlap — see LIFT_MS and
 * OVERLAP_MS.
 *
 * No `viewTransition` flag on the navigate. The browser's View Transition API
 * and Motion's `AnimatePresence` are two mechanisms for the same swap: run
 * both and the snapshot the first takes includes the second mid-animation,
 * which reads as the page stuttering out and back. Motion owns it.
 *
 * Still a real anchor underneath. The href is the genuine destination, so
 * middle-click, cmd-click and "copy link address" all behave the way they do
 * everywhere else — only a plain left click is intercepted.
 */
function LiftLink({
  to = '/',
  className = FOOTER_ITEM,
  children,
}: {
  to?: string
  className?: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  const lenis = useLenis()
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    // Anything but a plain left click belongs to the browser.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    event.preventDefault()

    const reduce = prefersReducedMotion()

    /*
     * Somebody who asked for less motion, or who is already at the top, gets
     * the destination immediately — half a second of nothing happening is not
     * a transition, it is a delay.
     */
    if (reduce || window.scrollY < 2) {
      navigate(to)
      return
    }

    if (lenis) lenis.scrollTo(0, { duration: LIFT_MS / 1000, easing: EASE_OUT })
    else window.scrollTo({ top: 0, behavior: 'smooth' })

    // Early on purpose. The transition's own lift-out starts while the last of
    // the glide is still running, so one movement hands over to the next.
    timer.current = window.setTimeout(
      () => navigate(to),
      LIFT_MS - OVERLAP_MS,
    )
  }

  return (
    <Link to={to} onClick={onClick} className={className}>
      {children}
    </Link>
  )
}

export default Footer
