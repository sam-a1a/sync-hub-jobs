import type { ReactNode } from 'react'

/**
 * Height, from nothing to whatever the content turns out to be, without ever
 * measuring it.
 *
 * A grid row sized in `fr` resolves against the content, so the browser can
 * interpolate `0fr` to `1fr` on its own. That matters more than it sounds:
 * animating `height` to `auto` in JS means measuring the target up front,
 * writing a pixel height every frame, and then — at the very end — swapping
 * back to `auto` and unmounting, which is a layout pass, a re-raster and a
 * React render all landing in the same frame. That last frame is exactly where
 * the stutter lives, and it gets worse the more of these run at once.
 *
 * Here nothing is measured, nothing unmounts, and no JavaScript runs per frame.
 * The inner element carries `min-h-0` because a grid item's automatic minimum
 * size is its content, which would keep the row from ever reaching zero.
 *
 * Staying mounted means the content is still focusable while folded away, so it
 * is made `inert` — collapsed is not the same as merely small.
 */
function Collapse({
  open,
  children,
  className = '',
}: {
  open: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-[340ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${className}`}
      style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

export default Collapse
