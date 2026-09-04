/**
 * View transitions, and telling the stylesheet which one is running.
 *
 * Two things animate the whole document — a route change and the theme toggle
 * — and each wants its own choreography. Rather than have the CSS work out
 * which is which, whoever starts a transition stamps `data-vt` on the root
 * first. A stale value is always overwritten by the next transition, so there
 * is no cleanup to forget.
 */

export type TransitionKind = 'route' | 'theme'

export function markTransition(kind: TransitionKind): void {
  document.documentElement.dataset.vt = kind
}

/**
 * Whether to skip the animation, read fresh rather than subscribed to.
 *
 * The answer is only wanted at the moment a transition starts, and a media
 * query match is cheap — which is a listener and its teardown saved.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Whether this browser can do it at all. Safari and Firefox arrived late. */
export function canTransition(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document
}

type ViewTransitionDocument = Document & {
  startViewTransition: (callback: () => void) => { finished: Promise<void> }
}

/**
 * Runs `change` inside a view transition, or plainly when one cannot or should
 * not happen.
 *
 * Every caller wants the same three guards — support, reduced motion, and
 * stamping the kind — so they are written once here rather than at each call
 * site.
 *
 * `change` has to do its DOM work *synchronously*: the browser snapshots the
 * page, invokes this, and snapshots again the moment it returns. A React state
 * update is not synchronous, which is why the one caller that needs React to
 * have re-rendered wraps its `setState` in `flushSync`.
 */
export function withTransition(kind: TransitionKind, change: () => void): Promise<void> {
  if (!canTransition() || prefersReducedMotion()) {
    change()
    return Promise.resolve()
  }

  markTransition(kind)
  const transition = (document as ViewTransitionDocument).startViewTransition(change)

  /*
   * Settles when the animation has actually finished, which is what a caller
   * that put something on the DOM *for* the transition needs in order to take
   * it off again. Rejection is swallowed: a transition abandoned by the next
   * one is not an error, it is a second thought, and the cleanup still has to
   * run. Nothing is obliged to await this.
   */
  return transition.finished.catch(() => undefined)
}
