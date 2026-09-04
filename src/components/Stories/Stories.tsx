import { useRef, type CSSProperties } from 'react'
import BrandIcon, { type BrandName } from '../BrandIcon'
import { useReveal } from '../../hooks/useReveal'
import { useSectionTone } from '../../hooks/useSectionTone'

/**
 * The outcome wall: a face, a mark, and something the person said.
 *
 * Each card is one colour all the way through — the photograph is duotoned
 * into the card's own hue rather than sitting inside a frame of it. That is
 * what makes three portraits taken in three different rooms read as one set,
 * and it is why the wash is a blend mode over the image rather than a tint
 * beside it.
 *
 * `image` is optional. Without one the card is the gradient alone, which is a
 * finished-looking placeholder rather than a hole; drop a portrait in and the
 * duotone applies itself.
 */
type Story = {
  company: BrandName
  label: string
  quote: string
  person: string
  role: string
  tone: string
  image?: string
}

/*
 * PLACEHOLDER CONTENT — all of it.
 *
 * The portraits are stock, the names and roles are invented, and only the
 * companies are real. That combination is a fabricated testimonial: it puts a
 * stranger's face and made-up words next to a real company's mark. It is fine
 * as a layout while the section is being built and must not ship. Replace each
 * entry with a quote you were actually given, from a person who agreed to be
 * named and photographed.
 */
const STORIES: Story[] = [
  {
    company: 'stripe',
    label: 'Stripe',
    quote:
      'It read six years of half-finished side projects and found the one thing they had in common. I had never put that on a CV.',
    person: 'Placeholder Name',
    role: 'Staff Engineer',
    tone: 'story-tone-coral',
    image: '/images/stories/stripe.jpg',
  },
  {
    company: 'figma',
    label: 'Figma',
    quote:
      'Every role it sent me was one I would have applied to anyway. The difference was that it found them in a week, not a year.',
    person: 'Placeholder Name',
    role: 'Product Designer',
    tone: 'story-tone-ocean',
    image: '/images/stories/figma.jpg',
  },
  {
    company: 'notion',
    label: 'Notion',
    quote:
      'I stopped writing cover letters and started having conversations. That is the whole of what changed, and it changed everything.',
    person: 'Placeholder Name',
    role: 'Operations Lead',
    tone: 'story-tone-amber',
    image: '/images/stories/notion.jpg',
  },
]

function Stories() {
  const section = useRef<HTMLElement>(null)
  useSectionTone(section, 'stories')

  const head = useRef<HTMLDivElement>(null)
  const row = useRef<HTMLUListElement>(null)
  useReveal(head)
  useReveal(row)

  return (
    <section ref={section} className="py-28 lg:py-36">
      <div ref={head} className="mx-auto max-w-3xl px-6 text-center">
        <h2
          className="reveal-item text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl"
          style={{ '--i': 0 } as CSSProperties}
        >
          From search to signed.
        </h2>
        <p
          className="reveal-item mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-muted"
          style={{ '--i': 1 } as CSSProperties}
        >
          Real talent landed roles. See what happens when SYNC gets involved.
        </p>
      </div>

      {/*
       * A scrolling row on a phone, a grid from `sm` up. The switch is in
       * `styles/motion.css` — it changes `display`, the gutters and the snap
       * behaviour together, which is more than a handful of variant classes
       * can say clearly.
       */}
      <ul ref={row} className="stories-row mt-16">
        {STORIES.map((story, i) => (
          <li
            key={story.label}
            className={`story reveal-item ${story.tone}`}
            style={{ '--i': i } as CSSProperties}
          >
            {story.image ? <img src={story.image} alt="" className="story-photo" /> : null}
            {/*
             * The wash. `mix-blend-mode: color` keeps the photograph's own
             * light and shade and replaces only its hue, which is what a
             * duotone is — a flat overlay at any opacity would grey the face
             * out instead of colouring it.
             */}
            <span className="story-wash" aria-hidden="true" />

            <div className="story-body">
              <span className="flex items-center gap-2 text-white">
                <BrandIcon name={story.company} size={20} />
                <span className="text-sm font-semibold tracking-[-0.01em]">{story.label}</span>
              </span>

              <div className="mt-auto">
                <blockquote className="text-lg leading-snug text-white">
                  &ldquo;{story.quote}&rdquo;
                </blockquote>
                <p className="mt-3 text-sm text-white/70">
                  {story.person}, {story.role}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default Stories
