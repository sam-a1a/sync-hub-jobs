import { useRef, type CSSProperties } from 'react'
import PartnerMarquee from '../PartnerMarquee'
import { useReveal } from '../../hooks/useReveal'

/**
 * The logo wall under the hero, with the line that frames it.
 *
 * The marquee itself lives in `PartnerMarquee` because the closing section
 * shows the same one; all this adds is the sentence above it.
 */
function TrustedBy() {
  const section = useRef<HTMLElement>(null)
  useReveal(section)

  return (
    /*
     * Asymmetric: more above than below. The CTA sits directly overhead and is
     * asking for a decision, so the wall needs room to read as a separate
     * thought rather than as the buttons' footnote. Below it the gallery brings
     * its own generous padding, and doubling up there would open a hole.
     */
    /*
     * `relative` because the hero's field reaches down into this section's
     * top padding, so the two dissolve into each other rather than meeting at
     * an edge. A positioned section paints above the field; an unpositioned
     * one would have the canvas drawn over its heading.
     */
    <section ref={section} className="relative pt-28 pb-16 lg:pt-36 lg:pb-20">
      <h2
        className="reveal-item px-6 text-center text-lg font-medium text-ink"
        style={{ '--i': 0 } as CSSProperties}
      >
        The best teams are already here.
      </h2>

      {/* The wall arrives a beat after its line, as the second thing said. */}
      <div className="reveal-item mt-10" style={{ '--i': 1 } as CSSProperties}>
        <PartnerMarquee />
      </div>
    </section>
  )
}

export default TrustedBy
