import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon'
import type { CardKind, CardSceneHandle } from './cardScenes'
import { useStartAction } from '../../lib/account'

/**
 * What "SYNC AI" opens onto.
 *
 * Three cards, a header row and a footer strip — the shape a product menu has
 * settled into, and it earns the shape: the cards are the things you can do,
 * and the strip at the bottom is for the two links that are not features.
 *
 * The panel draws no surface of its own. It sits inside the glass, which goes
 * flat and opaque the moment it opens (`[data-expanded]`), so a background
 * here would be a second sheet over the first and the join between them would
 * be visible at every edge.
 *
 * The cards move all the time the panel is open, not on hover: each one is
 * a small live drawing of the thing it names, with the copy over it — see
 * `CardScene` below and `cardScenes.ts`.
 */

/**
 * The picture on each card, drawn live.
 *
 * Each card is a small three.js scene of the thing its title says — a page
 * being read, applicants finding their places, applications moving stop to
 * stop — and the copy sits over it. The scenes are in `cardScenes.ts`, in
 * their own chunk, and they are not built until the panel first opens: a
 * menu that most visits never open should cost those visits nothing.
 *
 * They run only while the panel is open. The stop is a beat late, so the
 * cards are still moving as the panel folds away rather than freezing the
 * instant the pointer leaves.
 */
function CardScene({ kind, open }: { kind: CardKind; open: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<CardSceneHandle | null>(null)
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  }, [open])

  /* Once wanted, always wanted: the scene is built once and kept. */
  const [wanted, setWanted] = useState(false)
  if (open && !wanted) setWanted(true)

  useEffect(() => {
    if (!wanted) return
    const node = host.current
    if (!node) return
    let cancelled = false

    import('./cardScenes')
      .then(({ mountCardScene }) => {
        if (cancelled) return
        scene.current = mountCardScene(node, kind)
        scene.current.setRunning(openRef.current)
      })
      .catch(() => {
        /* No WebGL, or the chunk failed. The card keeps its colour and its copy. */
      })

    return () => {
      cancelled = true
      scene.current?.dispose()
      scene.current = null
    }
  }, [wanted, kind])

  useEffect(() => {
    if (open) {
      scene.current?.setRunning(true)
      return
    }
    const id = window.setTimeout(() => scene.current?.setRunning(false), 800)
    return () => window.clearTimeout(id)
  }, [open])

  return (
    <div
      ref={host}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 [&>canvas]:block [&>canvas]:size-full"
    />
  )
}

/** The box both share: the weight, and the gap that sets an arrow off a label. */
const STRIP_ITEM = 'inline-flex items-center gap-1 font-medium no-underline'

/** Teal, and brighter under the pointer. */
const STRIP_LIVE =
  'cursor-pointer text-teal-600/80 transition-colors duration-[var(--hover-fade)] ' +
  'ease-[var(--ease-standard)] hover:text-teal-600 hover:no-underline ' +
  'dark:text-teal-400/80 dark:hover:text-teal-400'

/**
 * Ink, and it does nothing under the pointer.
 *
 * The same tone as the words around it rather than a paler one: the whole
 * phrase is a single sentence the strip is saying, and the name only needs the
 * weight it already has to still read as a name inside it. Greying it further
 * would say "disabled control" — which is a thing that could work and has been
 * switched off, rather than a thing that is not built.
 */
const STRIP_SOON = 'text-ink-muted'

function StripLink({
  children,
  onClick,
  inert,
}: {
  children: React.ReactNode
  onClick?: () => void
  /**
   * There is nowhere to go yet. Renders a span instead of an anchor — see the
   * note at the call site for why it is not a disabled link.
   */
  inert?: boolean
}) {
  /*
   * Not an anchor at all, rather than an anchor with its click swallowed. A
   * dead `<a>` is still a tab stop, still says "link" to a screen reader, and
   * still offers "Open in new tab" on a right-click — three promises about a
   * destination that does not exist. A span makes none of them.
   *
   * It also drops the pointer cursor and the hover brighten, which is the
   * point rather than a side effect: those two are the whole of how this strip
   * says a thing can be pressed, and text that lights up under the pointer and
   * then does nothing is worse than text that never offered.
   */
  if (inert) return <span className={`${STRIP_ITEM} ${STRIP_SOON}`}>{children}</span>

  return (
    <a
      href="#"
      onClick={
        onClick
          ? (event) => {
              /* Only a plain left click; the href stays a real destination. */
              if (event.metaKey || event.ctrlKey || event.shiftKey) return
              event.preventDefault()
              onClick()
            }
          : undefined
      }
      className={`${STRIP_ITEM} ${STRIP_LIVE}`}
    >
      {children}
    </a>
  )
}

/**
 * The three cards, and the rule they are written under: each one names
 * something the platform does today, in the order a job seeker meets it — the
 * CV is read, the application is measured, the stage comes back.
 *
 * The rule is worth stating because the cards it replaced broke it. "Roles
 * ranked against what you have actually done" described a ranking that runs
 * the other way round: a model reads one *application* against the job it was
 * sent to and hands a recruiter a percentage. Nothing ranks roles for a
 * candidate — browse is newest-first behind four filters — and the platform's
 * own vocabulary lists ranking and matching as words to avoid. "Scheduling and
 * follow-ups" described nothing at all; there is no calendar anywhere in the
 * product, and Interview is a column in a recruiter's pipeline rather than an
 * appointment with anybody.
 */
const FEATURES: { title: string; body: string; kind: CardKind; surface: string }[] = [
  {
    title: 'Read',
    body: 'Your CV, turned into a profile you approve first.',
    kind: 'read',
    surface: 'bg-teal-50 dark:bg-[#0b2b28]',
  },
  {
    title: 'Screen',
    body: 'Measured against what the role actually asks.',
    kind: 'screen',
    surface: 'bg-[#fdeee7] dark:bg-[#2b1a14]',
  },
  {
    title: 'Track',
    body: 'Every application, and the moment it moves.',
    kind: 'track',
    surface: 'bg-cream dark:bg-[#26221b]',
  },
]

function MegaPanel({ open }: { open: boolean }) {
  const start = useStartAction()

  return (
    <div className="px-6 pt-4 pb-6">
      <div className="menu-panel mx-auto max-w-4xl overflow-hidden rounded-2xl ring-1 ring-ink/10 dark:ring-white/10">
        <div className="bg-paper p-6 dark:bg-[#0b100f]">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-ink-muted">Intelligence, built in.</span>
            {/*
             * A statement, not a link, and not a badge either. A pill around
             * it makes it promotional — the tone of a banner asking to be
             * clicked. Set as plain text at the same weight as the label
             * opposite, it reads as a fact the product is simply stating.
             */}
            <span className="text-sm font-medium text-ink-muted">Free. For everyone.</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <a
                key={feature.title}
                href="#"
                className={`relative block h-44 overflow-hidden rounded-xl ring-1 ring-transparent
                  transition-[box-shadow] duration-[var(--hover-fade)] ease-[var(--ease-standard)]
                  hover:ring-ink/15 dark:hover:ring-white/15 ${feature.surface}`}
              >
                <CardScene kind={feature.kind} open={open} />
                {/*
                 * The copy over the picture, at the foot of the card where the
                 * scene keeps clear. Nothing moves on hover but the ring: the
                 * picture is the whole of what the card does.
                 */}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="text-base font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-snug text-ink-muted">{feature.body}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/*
         * No rule above this strip. The change of surface already draws the
         * line — a border on top of a tone change is the same boundary stated
         * twice, and the second one reads as a seam.
         */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-offwhite px-6 py-3.5 text-sm dark:bg-[#111817]">
          <StripLink onClick={start}>
            Find your next role
            <Icon name="arrow_forward" size={16} />
          </StripLink>

          {/*
           * The app is not out, so this is a statement of intent and not a
           * link: no cursor, no hover, no tab stop, and no teal.
           *
           * The marker says so in words as well as in colour, because colour on
           * its own is the one signal a reader can be missing. It is set a shade
           * back from the name so the eye takes the name first and the caveat
           * second — which is the order the sentence is in — and it is round
           * brackets rather than a pill, because a pill is a badge and a badge
           * is something to click.
           */}
          <span className="text-ink-muted">
            Download the{' '}
            <StripLink inert>
              SYNC App
              <span className="font-normal text-ink-faint">(Soon)</span>
            </StripLink>
          </span>
        </div>
      </div>
    </div>
  )
}

export default MegaPanel
