import BrandIcon, { type BrandName } from '../BrandIcon'

/**
 * The walking logo wall, on its own so two sections can share it.
 *
 * It appears under the hero and again under the closing ask, and both have to
 * be the same object — same marks, same gap, same speed, same fade at the
 * edges. Two copies of this markup would drift apart the first time either was
 * touched, and a logo wall that is subtly different in two places reads as a
 * mistake rather than as a motif.
 */
const PARTNERS: { name: BrandName; label: string }[] = [
  { name: 'google', label: 'Google' },
  { name: 'meta', label: 'Meta' },
  { name: 'stripe', label: 'Stripe' },
  { name: 'airbnb', label: 'Airbnb' },
  { name: 'spotify', label: 'Spotify' },
  { name: 'figma', label: 'Figma' },
]

/**
 * One pass of the list.
 *
 * Rendered four times over — the count is pinned to the divisor in
 * `marquee-walk`, so the two move together or the loop drifts. Only the first
 * is read out; the rest exist so the loop has something to join onto, and a
 * screen reader that met the same six names four times would learn nothing
 * after the first.
 */
function Row({ silent }: { silent?: boolean }) {
  return (
    <ul className="marquee-row" aria-hidden={silent || undefined}>
      {PARTNERS.map((partner) => (
        <li key={partner.name}>
          <span className="inline-flex items-center gap-2.5 whitespace-nowrap text-ink-muted/70 transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:text-ink">
            <BrandIcon name={partner.name} size={24} />
            <span className="text-lg font-semibold tracking-[-0.02em]">{partner.label}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function PartnerMarquee({ className = '' }: { className?: string }) {
  return (
    /*
     * Full-bleed, and deliberately outside any gutter its section has. The
     * marks have to reach the screen's edges to dissolve at them — inset by a
     * margin they would fade out early, in the middle of the page, which reads
     * as a bug rather than as a horizon.
     */
    <div className={`marquee ${className}`}>
      <div className="marquee-track">
        <Row />
        <Row silent />
        <Row silent />
        <Row silent />
      </div>
    </div>
  )
}

export default PartnerMarquee
