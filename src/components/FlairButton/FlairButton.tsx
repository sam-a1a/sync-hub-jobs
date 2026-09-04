import gsap from 'gsap'
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * The stroke button whose fill chases the pointer.
 *
 * A circle 170% as wide as the button is tall sits inside an `overflow-hidden`
 * pill, scaled to nothing. On enter it is placed under the cursor and grown to
 * full size; while the pointer moves it follows, a little behind; on leave it
 * shrinks back towards whichever edge the pointer left by. Because the circle
 * is that much larger than the button, "full size" always covers the pill
 * however off-centre it is — the growth reads as the button filling from the
 * point of contact rather than as a disc appearing.
 *
 * `xPercent`/`yPercent` rather than pixels, so the maths is the same at every
 * button size and nothing has to be re-measured on resize. The two setters are
 * `quickSetter`s: the enter handler writes the starting position directly,
 * skipping the tween that would otherwise animate the flair in from wherever
 * it was left last time.
 *
 * Straight from the GSAP original. The only liberty taken is that the leave
 * handler kills in-flight tweens first, without which the still-running
 * follow-tween from the last `mousemove` fights the shrink and the circle
 * stutters on its way out.
 *
 * The press is CSS and not GSAP: it is a state, not a chase, and it wants to
 * survive the flair being killed mid-tween. Scaling the button does move the
 * rect `getXY` measures, by three percent for a fifth of a second — far below
 * what a pointer chase shows.
 */
/**
 * `stroke` fills in from the pointer; `filled` empties out from the press.
 *
 * They are the same circle running the same tween in opposite directions, and
 * that is the point of having both rather than two components. On a desktop the
 * button is an outline waiting to be filled, and hovering fills it. On a phone
 * there is no hover to reward, so the button arrives already filled — the more
 * confident thing for the one call to action on a narrow bar — and the press
 * empties it from wherever the thumb landed. Whichever way it runs, the fill
 * comes from or goes to the point of contact.
 */
type FlairVariant = 'stroke' | 'filled'

/**
 * `large` is for a button that is the only thing being asked, rather than one
 * option on a bar. Padding and type scale together — a bigger label inside the
 * same pill reads as a mistake, not as emphasis.
 */
type FlairSize = 'default' | 'large'

function FlairButton({
  children,
  href = '#',
  className = '',
  variant = 'stroke',
  size = 'default',
  onClick,
}: {
  children: ReactNode
  href?: string
  className?: string
  variant?: FlairVariant
  size?: FlairSize
  /**
   * Makes the button open something rather than go somewhere. It stays an
   * anchor either way: the `href` is a real destination, so middle-click and
   * cmd-click still work for anybody who would rather have the page.
   */
  onClick?: () => void
}) {
  const buttonRef = useRef<HTMLAnchorElement>(null)
  const flairRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const button = buttonRef.current
    const flair = flairRef.current
    if (!button || !flair) return

    const xSet = gsap.quickSetter(flair, 'xPercent')
    const ySet = gsap.quickSetter(flair, 'yPercent')

    /** Where the pointer is inside the button, as a percentage of each side. */
    const getXY = (event: { clientX: number; clientY: number }) => {
      const { left, top, width, height } = button.getBoundingClientRect()

      const xTransformer = gsap.utils.pipe(
        gsap.utils.mapRange(0, width, 0, 100),
        gsap.utils.clamp(0, 100),
      )

      const yTransformer = gsap.utils.pipe(
        gsap.utils.mapRange(0, height, 0, 100),
        gsap.utils.clamp(0, 100),
      )

      return {
        x: xTransformer(event.clientX - left),
        y: yTransformer(event.clientY - top),
      }
    }

    if (variant === 'filled') {
      /*
       * At rest the circle covers the button, centred. It is 170% of the
       * button's width across, so "covered" holds at any size without the
       * resting state needing to know one.
       */
      gsap.set(flair, { xPercent: 50, yPercent: 50, scale: 1 })

      const onDown = (event: PointerEvent) => {
        const { x, y } = getXY(event)

        /*
         * Set, not tweened. The circle has to be recentred on the thumb before
         * it starts shrinking, and animating it there first would send the fill
         * sliding across the button on its way to collapsing.
         */
        xSet(x)
        ySet(y)

        gsap.killTweensOf(flair)
        gsap.to(flair, { scale: 0, duration: 0.4, ease: 'power2.out' })
      }

      const onUp = () => {
        gsap.killTweensOf(flair)
        gsap.to(flair, { scale: 1, duration: 0.3, ease: 'power2.out' })
      }

      button.addEventListener('pointerdown', onDown)
      button.addEventListener('pointerup', onUp)
      button.addEventListener('pointercancel', onUp)
      button.addEventListener('pointerleave', onUp)

      return () => {
        button.removeEventListener('pointerdown', onDown)
        button.removeEventListener('pointerup', onUp)
        button.removeEventListener('pointercancel', onUp)
        button.removeEventListener('pointerleave', onUp)
        gsap.killTweensOf(flair)
      }
    }

    /*
     * Hover only, past here. On a touch screen there is no pointer to chase,
     * and every one of these listeners would fire once on tap — the flair
     * would bloom and then sit there, because nothing is ever going to send
     * the `mouseleave` that clears it.
     */
    if (!window.matchMedia('(hover: hover)').matches) return

    const onEnter = (event: MouseEvent) => {
      const { x, y } = getXY(event)

      xSet(x)
      ySet(y)

      gsap.to(flair, { scale: 1, duration: 0.4, ease: 'power2.out' })
    }

    const onLeave = (event: MouseEvent) => {
      const { x, y } = getXY(event)

      gsap.killTweensOf(flair)

      /*
       * Nudged past the edge it left by, so the circle collapses *outwards*
       * through the boundary the pointer crossed rather than towards the last
       * point inside. The 10/90 bands are what "left by an edge" means; a
       * pointer that leaves through the middle of the button did not, and its
       * flair simply shrinks in place.
       */
      gsap.to(flair, {
        xPercent: x > 90 ? x + 20 : x < 10 ? x - 20 : x,
        yPercent: y > 90 ? y + 20 : y < 10 ? y - 20 : y,
        scale: 0,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const onMove = (event: MouseEvent) => {
      const { x, y } = getXY(event)

      gsap.to(flair, { xPercent: x, yPercent: y, duration: 0.4, ease: 'power2' })
    }

    button.addEventListener('mouseenter', onEnter)
    button.addEventListener('mouseleave', onLeave)
    button.addEventListener('mousemove', onMove)

    return () => {
      button.removeEventListener('mouseenter', onEnter)
      button.removeEventListener('mouseleave', onLeave)
      button.removeEventListener('mousemove', onMove)
      gsap.killTweensOf(flair)
    }
  }, [variant])

  return (
    <a
      ref={buttonRef}
      href={href}
      onClick={
        onClick
          ? (event) => {
              /* Only a plain left click is intercepted. */
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
              event.preventDefault()
              onClick()
            }
          : undefined
      }
      data-block="button"
      className={`group relative inline-flex cursor-pointer items-center justify-center gap-[0.363636em]
        overflow-hidden rounded-full leading-[1.04545] font-semibold tracking-[-0.01em]
        break-words no-underline transition-[scale] duration-[280ms]
        ease-[var(--ease-standard)] active:scale-[0.97]
        after:pointer-events-none after:absolute after:inset-0 after:rounded-full
        after:border-[1.5px] after:border-teal-600 after:content-['']
        dark:after:border-teal-400
        ${
          variant === 'filled'
            ? 'text-paper active:text-teal-600 dark:active:text-teal-400'
            : 'text-teal-600 hover:text-paper dark:text-teal-400'
        }
        ${
          size === 'large'
            ? 'px-8 py-4 text-lg after:border-2'
            : variant === 'filled'
              ? 'px-4 py-2 text-sm'
              : 'px-5 py-2.5 text-[0.9375rem]'
        } ${className}`}
    >
      {/*
       * The flair is scaled from its own top-left corner, which is what lets
       * `xPercent`/`yPercent` place the circle's centre under the pointer and
       * have it grow from exactly there. `will-change` keeps it on its own
       * layer, so a tween running at 60fps is a composite and not a repaint of
       * the button and the glass behind it.
       */}
      <span
        ref={flairRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 origin-top-left [will-change:transform]
          ${variant === 'filled' ? 'scale-100' : 'scale-0'}
          before:pointer-events-none before:absolute before:top-0 before:left-0 before:block
          before:aspect-square before:w-[170%] before:-translate-x-1/2 before:-translate-y-1/2
          before:rounded-full before:bg-teal-600 before:content-['']
          dark:before:bg-teal-400`}
      />
      {/*
       * The label flips as the fill arrives under it, which is why this is the
       * one timing in the header not on `--hover-fade`: it is answering the
       * flair's 400ms sweep, not the pointer. The original ran it at 50ms and
       * 150ms — fast enough that the text had changed colour before there was
       * anything behind it to justify the change, which reads as a glitch
       * rather than as a reaction.
       */}
      <span
        className="relative text-center transition-colors duration-[180ms] ease-[var(--ease-in-out-quart)]
          group-hover:duration-[300ms]"
      >
        {children}
      </span>
    </a>
  )
}

export default FlairButton
