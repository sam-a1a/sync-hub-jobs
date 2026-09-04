/**
 * Arrivals, scrubbed to the scroll.
 *
 * Every element that arrives on this page arrives the same way: it is told how
 * far into the viewport it has come, as a number from 0 to 1 on `--reveal`,
 * and the stylesheet turns that into whatever the element does with it — a
 * rise, a fade, a word lighting up. The number is written on every scroll
 * frame and never animated in time, so the motion is tied to the finger: stop
 * scrolling and it stops, scroll back and it reverses. That is the whole
 * difference between this and a "fade in when visible" observer, which fires
 * once, on its own clock, and cannot be argued with.
 *
 * Zero is the element's top at `start` of the viewport's height, one is its
 * top at `end`. The one thing that has to be handled is an element near the
 * foot of the page whose top can never climb that high — the page runs out
 * first. For those the finish line is moved to wherever the top *will* be at
 * the very end, so nothing is left half-arrived.
 *
 * One listener for everyone, and one measurement pass per frame, however many
 * elements register.
 */
export interface RevealOptions {
  /** Where the top of the element is, as a fraction of the viewport, at 0. */
  start?: number
  /** Where it is at 1. */
  end?: number
}

interface Entry {
  node: HTMLElement
  start: number
  end: number
}

const entries = new Set<Entry>()
let frame = 0

function measure(): void {
  frame = 0
  const height = window.innerHeight
  const remaining = document.documentElement.scrollHeight - height - window.scrollY

  for (const { node, start, end } of entries) {
    const top = node.getBoundingClientRect().top
    const from = height * start
    let to = height * end

    /* Where the top will be with nothing left to scroll. */
    const floor = top - remaining
    if (floor > to) to = floor - height * 0.02

    const value = to >= from ? 1 : Math.min(Math.max((from - top) / (from - to), 0), 1)
    node.style.setProperty('--reveal', value.toFixed(4))
  }
}

function schedule(): void {
  if (frame) return
  frame = requestAnimationFrame(measure)
}

function listen(): void {
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
}

function unlisten(): void {
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  cancelAnimationFrame(frame)
  frame = 0
}

/**
 * Starts driving `--reveal` on `node`; returns the stop.
 *
 * Measures once, synchronously, so an element registered before the browser
 * paints is never seen at rest for a frame before it is told to hide.
 */
export function registerReveal(node: HTMLElement, options: RevealOptions = {}): () => void {
  const entry: Entry = { node, start: options.start ?? 0.96, end: options.end ?? 0.64 }
  if (entries.size === 0) listen()
  entries.add(entry)
  measure()

  return () => {
    entries.delete(entry)
    node.style.removeProperty('--reveal')
    if (entries.size === 0) unlisten()
  }
}
