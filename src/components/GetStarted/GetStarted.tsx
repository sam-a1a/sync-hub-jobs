import { useRef, type CSSProperties } from 'react'
import FlairButton from '../FlairButton'
import PartnerMarquee from '../PartnerMarquee'
import { useReveal } from '../../hooks/useReveal'
import { useStartAction } from '../../lib/account'

/**
 * The last thing on the page, and the shortest.
 *
 * One sentence and one button on an otherwise empty screen. Everything above
 * it has been making a case; this is the only section with nothing to say,
 * which is what gives it its weight — a closing ask surrounded by argument
 * reads as one more paragraph.
 *
 * It carries no tone of its own, which is the point: the stories section above
 * paints the page and releases it on the way out, so arriving here is the
 * colour coming back.
 */
/**
 * The closing line, one word at a time.
 *
 * Split so that each word can light up as the reader reaches it — the
 * sentence is read *to* them as they scroll into it. Plain spans with the
 * spaces kept, so it is still one sentence to anything that reads the page
 * aloud.
 */
const LINE = 'Let SYNC find the position you were made for.'
const WORDS = LINE.split(' ')

function GetStarted() {
  const start = useStartAction()

  /*
   * Three arrivals on their own travel: the statement, which lights up rather
   * than moves; the button, which rises to meet it; and the wall, last.
   */
  const head = useRef<HTMLHeadingElement>(null)
  const cta = useRef<HTMLDivElement>(null)
  const wall = useRef<HTMLDivElement>(null)
  useReveal(head, { start: 0.94, end: 0.42 })
  useReveal(cta)
  useReveal(wall)

  return (
    /*
     * Less above than below, and the gap it closes is a shared one. The stories
     * section already ends on 28/36 of its own padding, so a matching 32/44
     * here stacked the two into a gulf with nothing in it. The bottom keeps its
     * full measure: below is the footer, which needs the separation.
     */
    <section className="px-6 pt-16 pb-32 text-center lg:pt-20 lg:pb-44">
      <h2
        ref={head}
        className="mx-auto max-w-[18ch] text-4xl font-bold tracking-[-0.03em] text-ink sm:text-6xl"
      >
        {WORDS.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="reveal-word"
            style={{ '--i': i, '--n': WORDS.length } as CSSProperties}
          >
            {word}
            {i < WORDS.length - 1 ? ' ' : ''}
          </span>
        ))}
      </h2>

      {/*
       * One button, and two words.
       *
       * One word, and not one from the sentence above it.
       *
       * "Find your role" and then "Find Yours" both restated the heading, which
       * had already said it better — and the heading's verb belongs to SYNC,
       * not to you: it is the thing doing the finding. What is left for a
       * reader to do is start, so the button says that and nothing else. Set
       * large because it is the last thing on the page and the only thing left
       * to do; the bar's button is one option among several, this one is the
       * whole point of the section it sits in. The second button is gone for the
       * same reason — a closing ask with an alternative beside it is not an
       * ask, it is a menu, and the quieter option is where people go to not
       * decide.
       */}
      <div ref={cta} className="reveal-item mt-9 flex justify-center">
        <FlairButton href="#" size="large" onClick={start}>
          Begin
        </FlairButton>
      </div>

      {/*
       * The same wall as under the hero, closing the page the way it opened.
       * One component, so the two cannot drift apart — see `PartnerMarquee`.
       */}
      <div ref={wall} className="reveal-item mt-20">
        <PartnerMarquee />
      </div>
    </section>
  )
}

export default GetStarted
