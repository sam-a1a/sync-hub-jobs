import { useRef, type CSSProperties } from 'react'
import FlairButton from '../../components/FlairButton'
import GetStarted from '../../components/GetStarted'
import HeroField from '../../components/HeroField'
import HighlightGallery from '../../components/HighlightGallery'
import MissionFilm from '../../components/MissionFilm'
import RotatingWord from '../../components/RotatingWord'
import Stories from '../../components/Stories'
import TrustedBy from '../../components/TrustedBy'
import { useScrollProgress } from '../../hooks/useScrollProgress'
import { useStartAction } from '../../lib/account'
/**
 * The hero, and the highlights gallery under it.
 */
function Home() {
  const hero = useRef<HTMLElement>(null)
  const start = useStartAction()
  useScrollProgress(hero, '--hero', 'past')

  return (
    <>
      {/*
       * The hero and the field behind it.
       *
       * The wrapper is a stacking context of its own (`isolate`), so the field
       * can sit at a negative z-index *inside* it — under the headline, over
       * the page's paper — without falling behind the page background the way
       * a negative z-index in the root context would. The section keeps its
       * own drift; the field is a sibling of it rather than a child so that
       * the two can move at different rates on scroll, which is the whole of
       * the parallax.
       */}
      <div className="relative isolate">
        <HeroField />
        <section ref={hero} className="hero-drift px-6 py-24 text-center lg:py-32">
          {/*
           * The whole sentence as one accessible name. The visible line is built
           * out of three boxes with a word that changes every few seconds inside
           * it — read aloud, that is either a fragment or a stutter, so the
           * pieces are hidden and the sentence is stated once, in full.
           */}
          <h1
            aria-label="Where you and SYNC discover, match, apply, land, rise and grow together."
            className="mx-auto text-5xl leading-[1.08] font-bold tracking-[-0.035em] text-ink sm:text-6xl lg:text-7xl"
          >
            <span aria-hidden="true" className="hero-in block" style={{ '--i': 0 } as CSSProperties}>
              Where you and
            </span>
            {/*
             * Three columns, and the outer two are the same width.
             *
             * Centring the *line* is not the same as centring the pill, and the
             * difference is visible: "SYNC" is about 180px and "together." about
             * 340px, so a centred row puts the pill 80px left of the headline's
             * middle — which is exactly what looked wrong under "Where you and".
             * `1fr auto 1fr` makes the two side tracks equal whatever they hold,
             * so the middle track is dead centre by construction.
             *
             * It also stops the pill sliding. Its width changes with every word,
             * and in a centred row that moved the whole line; here the pill's
             * centre is fixed and the words either side step outwards
             * symmetrically instead.
             *
             * Only from `lg`. Equal side tracks are sized to the *wider* of the
             * two, so the row needs room for `together.` twice over — which it
             * has at 1024px and up, and does not below. Under that it falls back
             * to the centred flex row, where the pill being slightly off-centre
             * costs less than the line overflowing.
             */}
            <span
              aria-hidden="true"
              className="hero-in mt-[0.22em] flex flex-wrap items-center justify-center gap-x-[0.25em] gap-y-2
                lg:grid lg:grid-cols-[1fr_auto_1fr]"
              style={{ '--i': 1 } as CSSProperties}
            >
              <span className="lg:justify-self-end">SYNC</span>
              <RotatingWord />
              <span className="lg:justify-self-start">together.</span>
            </span>
          </h1>

          {/*
           * Three beats, and the last one is the whole promise.
           *
           * The line this replaced listed what the product does — understands,
           * matches, automates — which is a feature list wearing a sentence's
           * clothes. These say the same three things without naming any of them,
           * and they carry the rhythm the footer's blurb uses, so the two ends of
           * the page sound like one voice.
           */}
          <p
            className="hero-in mx-auto mt-7 max-w-xl text-lg leading-relaxed text-ink-muted lg:mt-9 lg:max-w-2xl lg:text-xl"
            style={{ '--i': 2 } as CSSProperties}
          >
            SYNC knows what makes you different. Finds where you belong. Handles the rest.
          </p>

          {/*
           * The step between saying what it does and showing who uses it.
           *
           * One button, alone. It had a quieter "I'm hiring" link beside it, and
           * a second option at the top of a page is a fork before anybody knows
           * enough to prefer a branch — the employer route belongs in the bar and
           * in the footer, where somebody looking for it will look. This is the
           * one thing to do.
           *
           * Same button as the bar's, deliberately: one call to action in the
           * product, one look for it.
           */}
          <div className="hero-in mt-10 flex justify-center" style={{ '--i': 3 } as CSSProperties}>
            <FlairButton href="#" onClick={start}>
              Find your Opportunity
            </FlairButton>
          </div>
        </section>
      </div>

      <TrustedBy />
      <HighlightGallery />
      <MissionFilm />
      <Stories />
      <GetStarted />
    </>
  )
}

export default Home
