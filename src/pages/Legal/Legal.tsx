import { useEffect, useMemo, type MouseEvent } from 'react'
import LegalActions from '../../components/LegalActions'
import { Markdown } from '../../lib/markdown'
import { outline, plainText } from '../../lib/markdown-logic'
import { longDate, timeAgo } from '../../lib/relative-time'
import { prefersReducedMotion } from '../../lib/transition'
import type { LegalDocument } from '../../lib/legal/content'
import { useActiveSection } from './useActiveSection'

/**
 * The terms and the privacy policy, which are the same page twice.
 *
 * The typography follows the reference: one very large title, a stated
 * effective date under a rule, then numbered sections that get their numbers
 * from CSS counters rather than from the stored text. It sits in the site's
 * own gutter like every other page, and spends the width it gains on a
 * contents rail that stays put while the document scrolls — a legal document
 * is something people arrive at looking for one clause, and twenty numbered
 * headings with nowhere to jump from is the wrong shape for that.
 */

/**
 * Take the reader to a section.
 *
 * Through Lenis rather than through the anchor's own behaviour. A bare
 * `href="#id"` is a native instant jump, and with Lenis driving the scroll the
 * two disagree for a frame — the page arrives, Lenis notices it did not put it
 * there, and the correction reads as a flash. Handing the move to Lenis makes
 * it the same eased travel as every other scroll on the site.
 *
 * No offset for the sticky header: Lenis reads the target's own
 * `scroll-margin-top` and subtracts it, exactly as a native jump would.
 */
function scrollToSection(id: string, immediate: boolean): void {
  const target = document.getElementById(id)
  if (!target) return

  const lenis = (window as unknown as { lenis?: { scrollTo: (target: Element, options?: object) => void } }).lenis

  if (lenis) lenis.scrollTo(target, { immediate })
  else target.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' })
}

function LegalPage({ document: doc }: { document: LegalDocument }) {
  const sections = useMemo(() => outline(doc.body), [doc.body])
  const active = useActiveSection(useMemo(() => sections.map((s) => s.id), [sections]))

  useEffect(() => {
    window.document.title = `${doc.title} — SYNC Hub`
  }, [doc.title])

  /*
   * What the Copy button puts on the clipboard: the title, the effective date
   * and the numbered body. The date is included because a pasted legal
   * document that does not say which version it is is a quotation nobody can
   * check.
   */
  const documentText = useMemo(
    () => `${doc.title}\n\nLast updated: ${longDate(doc.effectiveAt)}\n\n${plainText(doc.body)}`,
    [doc.title, doc.effectiveAt, doc.body],
  )

  /*
   * A link somebody was sent, rather than one they clicked. Waits for the next
   * frame and then goes — without animating, because travelling from a top the
   * reader never saw is not a journey.
   */
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return

    const frame = requestAnimationFrame(() => scrollToSection(id, true))
    return () => cancelAnimationFrame(frame)
  }, [])

  function onSectionClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    // Anything but a plain left click belongs to the browser, so that opening
    // a section in a new tab still lands on the section.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    event.preventDefault()
    scrollToSection(id, prefersReducedMotion())

    /*
     * `replaceState`, not `pushState`. The address stays shareable, but a
     * reader who has skimmed eight sections gets one Back out of the document
     * rather than eight back through their own scrolling.
     */
    window.history.replaceState(null, '', `#${id}`)
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-16 sm:py-24 print:px-0 print:py-0">
      <header>
        {/*
         * The actions sit beside the title rather than under it, and are
         * top-aligned rather than baseline-aligned — against a large title
         * there is no baseline for a small pill to share, and aligning the
         * tops of the two blocks is what actually reads as level. They fall
         * below the title on a narrow screen, where there is no room to the
         * side of it.
         */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
          <h1 className="text-[clamp(2.5rem,6vw,4rem)] leading-[1.02] font-bold tracking-[-0.04em] text-ink">
            {doc.title}
          </h1>
          <LegalActions title={doc.title} text={documentText} className="shrink-0 sm:mt-2 print:hidden" />
        </div>

        {/*
         * The date and how long ago it was, together. The date alone makes a
         * reader do arithmetic to find out whether they have seen this
         * version; the relative phrase alone is not something anyone can put
         * in an email.
         */}
        <p className="mt-6 text-[15px] text-ink-muted">
          Last updated: <span className="text-ink">{longDate(doc.effectiveAt)}</span>
          <span aria-hidden className="mx-2 text-ink-faint">
            —
          </span>
          {timeAgo(doc.effectiveAt)}
        </p>
      </header>

      <div className="mt-10 border-t border-hairline pt-10 lg:mt-12 lg:pt-12">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-16">
          <article className="legal-body">
            <Markdown source={doc.body} />
          </article>

          {/*
           * Second in the source so a screen reader and a narrow screen both
           * meet the document before its index, and pulled to the first
           * column on a wide one — where a rail belongs.
           */}
          {sections.length > 0 ? (
            <nav aria-label="Contents" className="hidden lg:col-start-2 lg:row-start-1 lg:block print:hidden">
              <div className="sticky top-28">
                <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Contents</p>
                {/*
                 * The section being read wears the hover state. Nothing else:
                 * no bar, no weight change, no indent. A rail that moves as
                 * you scroll competes with the words for attention, and the
                 * point of marking your place is that you can find it without
                 * looking for it.
                 */}
                <ol className="mt-4 grid gap-2.5">
                  {sections.map((section, index) => {
                    const here = section.id === active

                    return (
                      <li key={section.id} className="flex gap-2 text-sm">
                        <span
                          className={`tabular-nums transition-colors duration-300 ease-[var(--ease-out)] ${
                            here ? 'text-ink-muted' : 'text-ink-faint'
                          }`}
                        >
                          {index + 1}.
                        </span>
                        <a
                          href={`#${section.id}`}
                          onClick={(event) => onSectionClick(event, section.id)}
                          aria-current={here ? 'true' : undefined}
                          className={`transition-colors duration-300 ease-[var(--ease-out)] hover:text-ink ${
                            here ? 'text-ink' : 'text-ink-muted'
                          }`}
                        >
                          {section.text}
                        </a>
                      </li>
                    )
                  })}
                </ol>
              </div>
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default LegalPage
