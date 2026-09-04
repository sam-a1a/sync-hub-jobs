import { useCallback, useEffect, useRef, useState, type TransitionEvent } from 'react'
import { Link } from 'react-router'
import AccountMenu from './AccountMenu'
import FlairButton from '../FlairButton'
import GlassBar from '../GlassBar'
import Icon from '../Icon'
import MenuIcon from '../MenuIcon'
import Morph from '../Morph'
import ThemeToggle from '../ThemeToggle'
import { useHoverCapable, useDismissOnOutsidePress } from '../../hooks/useHoverCapable'
import { useHoverMenu } from '../../hooks/useHoverMenu'
import { firstName, useAccount, useStartAction } from '../../lib/account'
import MegaPanel from './MegaPanel'
import MobileNav from './MobileNav'

/**
 * Whether the page has moved at all.
 *
 * One boolean, flipped at the first pixel rather than at some threshold: the
 * question the glass is asking is "is there anything behind me yet", and the
 * answer changes the moment the page scrolls. `passive` because this listener
 * never calls `preventDefault` and saying so keeps it off the scroll's
 * critical path.
 */
function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const read = () => setScrolled(window.scrollY > 0)
    read()
    window.addEventListener('scroll', read, { passive: true })
    return () => window.removeEventListener('scroll', read)
  }, [])

  return scrolled
}

const LINKS = [
  { label: 'For Employers', href: '#' },
  { label: 'Browse Jobs', href: '#' },
]

/*
 * One string for all three, because they sit in a row and the pointer runs
 * along them — two items washing in at different rates is more noticeable
 * than either rate being wrong. The timing is the shared `--hover-fade`; see
 * the note in `index.css` for why it is not `--ease-out`.
 */
const NAV_ITEM =
  'rounded-lg px-3 py-2 text-[0.9375rem] font-medium text-ink transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:bg-[var(--hover-wash)]'

function Header() {
  const scrolled = useScrolled()
  const menu = useHoverMenu()
  const account = useAccount()
  const start = useStartAction()

  /*
   * The one button on the bar says either what there is to do or who is doing
   * it. Signed in there is nothing to ask for, so it stops asking.
   *
   * It is the same button throughout, and the label rolls between the two —
   * the errand up and out of the top, the greeting in from below, and the pill
   * widening to the new word as it goes. Signing out runs it backwards. This is
   * the copy button on the legal pages, which is the point: a button whose word
   * changes under you should change it the same way everywhere on the site.
   */
  const cta = account ? `Hello, ${firstName(account)}!` : 'Get Started'

  /*
   * The menu answers to one input or the other, never both.
   *
   * With a pointer it is purely a hover menu: the click does nothing, because
   * a trigger that both opens on hover *and* toggles on click spends its life
   * being closed by the click that lands on the menu you just opened by
   * arriving. Without one there is no hover to speak of, so the tap is the
   * whole interaction and the mouse handlers are not wired at all — a touch
   * browser will happily synthesise `mouseenter` on tap, and leaving those
   * attached is how a tap-to-open menu ends up opening twice and closing
   * itself.
   */
  const canHover = useHoverCapable()
  const navRef = useRef<HTMLElement>(null)

  useDismissOnOutsidePress(navRef, menu.open && !canHover, menu.close)

  /*
   * The narrow-screen menu. Plain state, not `useHoverMenu`: it is opened by a
   * tap and closed by another one, and there is no pointer to grant it a grace
   * period.
   */
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleMobile = useCallback(() => {
    setMobileOpen((open) => !open)
    menu.close()
  }, [menu])

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  /*
   * Widening past the breakpoint has to close it. The panel is `lg:hidden`, so
   * it would simply stop being drawn — but the glass reads the *state*, not the
   * stylesheet, and would sit expanded over a bar with nothing under it.
   */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const wide = window.matchMedia('(min-width: 64rem)')
    const close = () => setMobileOpen(false)
    wide.addEventListener('change', close)
    return () => wide.removeEventListener('change', close)
  }, [])

  /*
   * Either panel expands the same bar, so from the glass's point of view there
   * is only one question and one answer.
   */
  const panelOpen = menu.open || mobileOpen

  /**
   * Whether the glass is still covering a panel.
   *
   * Not the same as `menu.open`, and it cannot be: the panel takes 320ms to
   * roll up, and the bar has to keep its flat, opaque profile for every frame
   * of that. Dropping the flag when `open` does would swap the surface out
   * from under a panel still on screen.
   */
  const [lingering, setLingering] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)

  /*
   * Adjusted during render rather than in an effect. React's own pattern for
   * this, and here it is not a preference: the flag has to be set in the same
   * commit that opens the menu, and an effect runs a frame after that — one
   * frame of a panel with no surface under it, on every open.
   */
  if (panelOpen !== wasOpen) {
    setWasOpen(panelOpen)
    if (panelOpen) setLingering(true)
  }

  /*
   * Cleared by the shell's own `transitionend` below rather than by a duration
   * copied out of the stylesheet, so the two can never drift apart. This is
   * only the backstop for when no transition runs at all — which is exactly
   * what `prefers-reduced-motion` does to the shell, and without it the bar
   * would stay expanded for good. It has to sit clear of `--menu-glide`, or it
   * fires mid-collapse and drops the surface early.
   */
  useEffect(() => {
    if (panelOpen) return
    const id = window.setTimeout(() => setLingering(false), 1200)
    return () => window.clearTimeout(id)
  }, [panelOpen])

  const expanded = panelOpen || lingering

  /*
   * The page is told when the menu is open, the way it is told a section's
   * tone. The field behind the hero reads it and comes up to meet the glass —
   * a menu over an empty top of the page looked like a menu over nothing.
   */
  useEffect(() => {
    if (panelOpen) document.documentElement.dataset.menu = 'open'
    else delete document.documentElement.dataset.menu
    return () => {
      delete document.documentElement.dataset.menu
    }
  }, [panelOpen])

  const onShellTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.propertyName !== 'grid-template-rows') return
    if (!panelOpen) setLingering(false)
  }

  return (
    /*
     * Fixed rather than sticky. A sticky bar keeps its 72px in the flow, so
     * the panel dropping open would push the whole page down by the height of
     * the menu; fixed lets the bar grow over the page instead, which is the
     * only way a menu can be laid *on* the document. The 72px the bar would
     * have occupied is given back as padding on `<main>`.
     *
     * The menu closes on leaving the *header*, not on leaving the trigger.
     * That is what lets the delays either side be almost nothing: the trip
     * from the caret down into the panel never leaves this element, so there
     * is no gap to paper over with a grace period.
     */
    <header
      className="fixed inset-x-0 top-0 z-50"
      onMouseLeave={canHover ? menu.leave : undefined}
    >
      <GlassBar bare={!scrolled && !expanded} expanded={expanded}>
        <div className="relative flex h-18 w-full items-center px-6">
          {/*
           * No hover state at all. It is the one link on the bar whose target
           * everybody already knows, and a wordmark that lightens under the
           * pointer reads as a control rather than as the masthead.
           */}
          <Link
            to="/"
            aria-label="SYNC Hub, home"
            className="relative z-10 inline-flex items-center gap-2.5"
            onMouseEnter={canHover ? menu.close : undefined}
          >
            <img src="/sync-logo.png" alt="" className="size-9 shrink-0 object-contain" />
            {/*
             * The wordmark is `alt` text made visible, so the link's own
             * `aria-label` is what a screen reader gets and this is hidden
             * from it — otherwise the name is announced twice.
             */}
            <span
              aria-hidden="true"
              className="text-[1.0625rem] font-semibold tracking-[-0.01em] whitespace-nowrap text-ink"
            >
              SYNC Hub
            </span>
          </Link>

          {/*
           * Centred on the viewport, not on what is left over between the logo
           * and the buttons. Absolute positioning is the only way to get that:
           * in flow the nav sits at the midpoint of the free space, which
           * moves every time the right-hand side changes width — and it will,
           * the moment a signed-in name appears next to the button.
           */}
          <nav
            ref={navRef}
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex"
          >
            <div onMouseEnter={canHover ? menu.enter : undefined}>
              <button
                type="button"
                aria-expanded={menu.open}
                aria-haspopup="true"
                aria-controls="sync-ai-menu"
                onClick={canHover ? undefined : () => (menu.open ? menu.close() : menu.enter())}
                className={`${NAV_ITEM} group inline-flex cursor-pointer items-center gap-0.5 pr-2
                  ${menu.open ? 'bg-[var(--hover-wash)]' : ''}`}
              >
                SYNC AI
                {/*
                 * The caret turns rather than swapping for an up-caret. It is
                 * the same object either way — a hinge on the menu — and a
                 * swap would say it was two different marks. The transition
                 * lives on `.material-symbol`; a `transition-*` utility here
                 * would be outranked by it and quietly do nothing.
                 */}
                <Icon
                  name="arrow_drop_down"
                  size={20}
                  className={menu.open ? 'rotate-180' : 'rotate-0'}
                />
              </button>
            </div>

            {LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={NAV_ITEM}
                onMouseEnter={canHover ? menu.close : undefined}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div
            className="relative z-10 ml-auto flex items-center gap-2"
            onMouseEnter={canHover ? menu.close : undefined}
          >
            <ThemeToggle />
            {/*
             * The wrapper is not decoration. `hidden` and `inline-flex` are
             * both plain display utilities, and Tailwind emits `.inline-flex`
             * after `.hidden` — so `hidden lg:inline-flex` on the button
             * itself loses to its own base class and shows on every width.
             * `.hidden` does beat `.block`, so hiding the wrapper works.
             */}
            <div className="hidden lg:block">
              {/*
               * Signed in, the button stops being a call to action and becomes
               * a name — so it gains a menu and loses its errand. The wrapper is
               * always there and the menu inside it is not: rendering a bare
               * button instead would swap the element the label lives in, and a
               * remounted label has nothing to roll away from.
               */}
              <AccountMenu enabled={account !== null}>
                <FlairButton href="#" onClick={start}>
                  <Morph token={cta} className="morph-cta">
                    {cta}
                  </Morph>
                </FlairButton>
              </AccountMenu>
            </div>

            {/*
             * The same button, the other way round. There is no hover to
             * reward on a phone, so it arrives filled — the more confident
             * thing for the one call to action on a narrow bar — and the press
             * empties it from wherever the thumb landed. `lg:hidden` is a
             * variant and so is emitted after `.inline-flex`, which is why
             * this one does not need the wrapper the desktop button does.
             */}
            <FlairButton
              href="#"
              variant="filled"
              className="lg:hidden"
              onClick={start}
            >
              <Morph token={cta} className="morph-cta">
                {cta}
              </Morph>
            </FlairButton>

            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              onClick={toggleMobile}
              className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full
                text-ink transition-[color,background-color,scale] duration-[var(--hover-fade)]
                ease-[var(--ease-standard)] hover:bg-[var(--hover-wash)] active:scale-90
                lg:hidden"
            >
              <MenuIcon open={mobileOpen} />
            </button>
          </div>
        </div>

        {/*
         * The panel is a sibling of the row and a child of the glass, so the
         * pane behind it covers both as one surface.
         *
         * It stays mounted, closed, rather than being rendered on open. A
         * transition needs two values to run between, and an element that
         * arrives already holding the open state has only ever had one — the
         * height animation would not play at all on the way in. Closed it is
         * a zero-height clipped row: nothing to see and nothing to hover.
         */}
        <div
          id="sync-ai-menu"
          className="menu-shell hidden lg:grid"
          data-open={menu.open ? '' : undefined}
          /*
           * Staying mounted is what makes the height animate; `inert` is what
           * stops that costing anything. A closed panel is clipped to nothing
           * and invisible, but without this its links are still in the tab
           * order and still read out — a keyboard user would tab into a menu
           * that is not open.
           */
          inert={!menu.open}
          onMouseEnter={canHover ? menu.enter : undefined}
          onTransitionEnd={onShellTransitionEnd}
        >
          <div>
            <MegaPanel open={menu.open} />
          </div>
        </div>

        {/*
         * The same shell mechanism as the desktop panel — mounted, clipped to
         * nothing, and grown by `grid-template-rows` — so both drop out of the
         * bar with one behaviour and one set of timings.
         */}
        <div
          id="mobile-nav"
          className="menu-shell grid lg:hidden"
          data-open={mobileOpen ? '' : undefined}
          inert={!mobileOpen}
          onTransitionEnd={onShellTransitionEnd}
        >
          <div>
            <MobileNav />
          </div>
        </div>
      </GlassBar>

    </header>
  )
}

export default Header
