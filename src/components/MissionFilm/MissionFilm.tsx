import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon'
import TransportIcons from '../TransportIcons'
import { useScrollProgress } from '../../hooks/useScrollProgress'
import { asset } from '../../lib/asset'

/**
 * The film, and the title that rises onto it.
 *
 * Three boxes: a section two viewports tall, a stage stuck to the top of the
 * screen inside it, and the video filling the stage. The extra viewport of
 * height is not padding — it is the *timeline*. Scrolling through it moves
 * nothing on screen, because the stage is stuck; what it does is give the title
 * a distance to travel and the veil a distance to lift over, which is the only
 * way to choreograph anything to a scroll position.
 *
 * `--film` is that position, 0 to 1, written onto the section by
 * `useScrollProgress`. Everything else in `styles/motion.css` is a reading of
 * that one number.
 */
const SRC = asset('/video/mission.mp4')

/*
 * The ring's geometry, in the *button's* pixels.
 *
 * Its viewBox is 48 units for a 48px button, so one unit is one pixel and the
 * radius can be read straight off the box: 24 less half the stroke, which puts
 * the stroke's outer edge exactly on the button's edge. That matters because
 * the volume button draws its circle as a 1.5px CSS border on the same 48px
 * box — on a 56-unit viewBox the same numbers rendered a 37px ring beside a
 * 48px border, and the two buttons plainly did not match.
 *
 * The 56-unit grid belongs to the glyph inside, which is Apple's artwork and
 * keeps its own box.
 */
const SIZE = 48
const STROKE = 1.5
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * The circle both buttons wear.
 *
 * Drawn as SVG on both, and not as a CSS border on the volume one, because
 * Chrome rounds `border-width` to whole device pixels while an SVG stroke is a
 * vector and is not rounded. A 1.5px border computed to 1px next to a 1.5px
 * stroke, so the two circles were the same diameter and visibly different
 * weights. Same element, same result.
 */
function Ring({ valueRef }: { valueRef?: React.Ref<SVGCircleElement> }) {
  return (
    <svg className="film-ring -rotate-90" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
      <circle className="film-ring-track" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} />
      {valueRef ? (
        <circle
          ref={valueRef}
          className="film-ring-value"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
        />
      ) : null}
    </svg>
  )
}

function MissionFilm() {
  const section = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)

  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(true)
  const ring = useRef<SVGCircleElement>(null)

  /**
   * What the person asked for, as against what the observer would like.
   *
   * Declared before the observer that reads it, not after: a ref mutated
   * further down the component than the effect depending on it is a real
   * ordering hazard, and the linter is right to say so.
   */
  const playingIntent = useRef(true)

  useScrollProgress(section, '--film')

  /*
   * The ring, on a frame loop rather than on `timeupdate`.
   *
   * `timeupdate` is the obvious event and it fires roughly four times a second
   * — so the ring advanced in four visible steps per second and read as a
   * counter rather than as a sweep. There is no fixing that with a transition
   * either: a tween between two readings that far apart is always chasing a
   * number which has already moved, so the ring would lag the film it reports.
   *
   * A frame loop reads `currentTime` when the screen is about to paint, which
   * is exactly as often as it can matter, and it stops dead when the film is
   * paused or off screen.
   *
   * It writes the dash straight onto the circle. Sixty state updates a second
   * would re-render the section sixty times to move one number that nothing in
   * React reads.
   */
  useEffect(() => {
    const node = video.current
    const circle = ring.current
    if (!node || !circle || !playing) return

    let frame = 0
    const tick = () => {
      const { duration, currentTime } = node
      if (duration && !Number.isNaN(duration)) {
        const fraction = Math.min(Math.max(currentTime / duration, 0), 1)
        circle.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - fraction))
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  useEffect(() => {
    const node = video.current
    if (!node) return

    const onEnded = () => setPlaying(false)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    node.addEventListener('ended', onEnded)
    node.addEventListener('play', onPlay)
    node.addEventListener('pause', onPause)
    return () => {
      node.removeEventListener('ended', onEnded)
      node.removeEventListener('play', onPlay)
      node.removeEventListener('pause', onPause)
    }
  }, [])

  /*
   * Playing off screen is a battery bill for something nobody is watching, and
   * a soundtrack that starts from nowhere once it is unmuted.
   *
   * Pause, not stop: `currentTime` is left where it was, so scrolling back
   * picks the film up mid-sentence instead of starting it again. The only
   * thing that overrides this is somebody having pressed pause themselves.
   */
  useEffect(() => {
    const node = video.current
    const host = section.current
    if (!node || !host) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (playingIntent.current) void node.play().catch(() => undefined)
        } else {
          node.pause()
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  const onTransport = () => {
    const node = video.current
    if (!node) return
    if (node.paused) {
      playingIntent.current = true
      void node.play().catch(() => undefined)
    } else {
      playingIntent.current = false
      node.pause()
    }
  }

  const onVolume = () => {
    const node = video.current
    if (!node) return
    node.muted = !node.muted
    setMuted(node.muted)
  }

  return (
    <section ref={section} className="film relative h-[190svh]">
      <div className="sticky top-0 flex h-[100svh] w-full items-center">
        <div className="film-stage relative w-full overflow-hidden">
          {/*
           * No `autoPlay`. The observer starts it when the section is actually
           * on screen, pauses it on the way out and picks it up again on the
           * way back — with the attribute set it began at mount instead, so by
           * the time anybody scrolled down the film was already over.
           *
           * `playsInline` or iOS takes the film fullscreen the moment it plays,
           * which throws away the whole composition. `muted` because no browser
           * will autoplay with sound, and the volume control below is how that
           * gets handed back.
           */}
          <div className="film-media">
            <video
              ref={video}
              className="size-full object-cover"
              src={SRC}
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="The mission, and the story."
            />

          {/*
           * The veil. It starts heavy and lifts as the section is scrolled — but
           * never all the way: white type on an unknown frame of video is a
           * gamble, and the last tenth is what keeps the title legible when the
           * film cuts to something bright.
           */}
            <div className="film-veil" aria-hidden="true" />
          </div>

          <div className="film-copy">
            {/*
             * The credit sits above the title, as an eyebrow. Same size and
             * same weight it always had — only the order changed — but reading
             * it first sets who is speaking before the title says what about,
             * which is the whole reason the form exists.
             *
             * `<p>` before `<h2>` is also correct as markup: an eyebrow is not
             * a lower-level heading, and marking it up as one would put a
             * phantom rung in the document outline.
             */}
            <p className="mb-4 text-base text-white/70 sm:text-lg">Presented by the SYNC team</p>
            <h2 className="text-5xl font-bold tracking-[-0.035em] text-white sm:text-7xl">
              The mission, and the story.
            </h2>
          </div>

          <div className="film-controls">
            <button
              type="button"
              onClick={onTransport}
              aria-label={playing ? 'Pause the film' : 'Play the film'}
              className="film-button"
            >
              {/*
               * `-rotate-90` puts the dash's start at twelve o'clock; without
               * it the progress begins at three, which reads as broken.
               */}
              <Ring valueRef={ring} />
              <span className="relative size-11">
                <TransportIcons showing={playing ? 'pause' : 'play'} />
              </span>
            </button>

            <button
              type="button"
              onClick={onVolume}
              aria-label={muted ? 'Unmute the film' : 'Mute the film'}
              className="film-button group"
            >
              {/* The same circle, with no progress to draw inside it. */}
              <Ring />
              {/*
               * 20px against the transport's 44px box, and the gap is not a
               * mistake. The play glyph occupies about a third of its 56-unit
               * viewBox where a Material Symbol fills roughly five sixths of
               * its em — matched by their *boxes* the volume mark came out at
               * 3.2x the ink of the pause bars. These two numbers were picked
               * by measuring the rendered pixels of each until both drew a
               * 13px mark.
               */}
              <Icon
                name={muted ? 'volume_off' : 'volume_down'}
                size={20}
                className="group-hover:[--symbol-fill:1]"
              />
            </button>
            </div>
          </div>
        </div>
    </section>
  )
}

export default MissionFilm
