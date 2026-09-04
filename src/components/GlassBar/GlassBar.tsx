import { useEffect, useState, type ReactNode } from 'react'
import { displacementMap, veilMask } from '../../lib/refraction'

/*
 * The header's material.
 *
 * Four things have to be true at once for a bar to read as glass rather than as
 * a translucent rectangle:
 *
 *   - the blur is graded, not flat. Content dissolves on its way up under the
 *     bar instead of hitting a wall at the edge;
 *   - the rim refracts. It draws up a bent, compressed sliver of whatever is
 *     directly below the bar;
 *   - colour behind glass stays colour. A blur on its own mutes everything and
 *     the result reads as gauze;
 *   - the top face catches light. One hairline along it is the difference
 *     between glass and frosted plastic. Nothing is drawn along the bottom:
 *     what the bar does to whatever passes behind it already says where it
 *     ends, and a line under that is a second answer to a settled question.
 *
 * All four land on one element, `.glass-pane`, and they have to. An element
 * with a `backdrop-filter` is a *backdrop root* for what is nested inside it,
 * so a stack of layered `backdrop-filter` divs — the usual way to build a
 * graded blur — leaves each inner layer filtering the layer above rather than
 * the page, and the result is nothing at all. Hence a single pane, and hence
 * the gradient blur being assembled inside the SVG filter below rather than
 * out of separate layers in CSS.
 */

/** The bar's height, and the space the maps below are drawn across. */
export const BAR = 72

/** The refracting band at the rim, in px. */
const LIP = 20

/**
 * Peak displacement at the rim is half of this — `feDisplacementMap` shifts by
 * `scale * (channel / 255 - 0.5)`, and the map's peak channel is 255.
 */
const SCALE = 40

/**
 * How far the maps overhang the start edge, and the step their width is
 * rounded up to.
 *
 * The maps are constant across the bar — only their vertical profile means
 * anything — so the tempting shortcut is to stretch them across some absurd
 * width once and never think about the viewport again. It costs a factor of
 * five in frame time: Chromium allocates and rasterises a primitive's whole
 * subregion whether or not the filter region then clips it away, so an
 * 8000px-wide map is an 8000px-wide surface rebuilt as the page scrolls. A
 * 1400px one is free. Hence a real width, tracked.
 */
const MAP_X = -32
const MAP_STEP = 256
const MAP_SLACK = 96

function mapWidth(viewport: number): number {
  return Math.ceil((viewport + MAP_SLACK) / MAP_STEP) * MAP_STEP
}

/**
 * The viewport is read rather than the header measured: the bar is full-bleed,
 * `innerWidth` includes the scrollbar the bar does not have, and erring wide is
 * free where erring narrow would leave the far end of the map blank — which a
 * filter reads not as "no displacement" but as "displace by the whole negative
 * scale".
 */
function useMapWidth(): number {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? mapWidth(1440) : mapWidth(window.innerWidth),
  )

  useEffect(() => {
    const read = () => setWidth(mapWidth(window.innerWidth))
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [])

  return width
}

const DISPLACEMENT = displacementMap(LIP / BAR)
const VEIL_MASK = veilMask(0.3, 0.82)

function GlassFilter({ width }: { width: number }) {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute size-0" width="0" height="0">
      <defs>
        {/*
         * sRGB is not optional. Filters interpolate in linearRGB by default,
         * which shifts the neutral 128 off centre and leaves the flat part of
         * the displacement map quietly moving everything it was meant to
         * leave alone.
         *
         * The region reaches above and below the bar on purpose, and no
         * further than it has to — every extra pixel of it is surface that
         * gets rasterised again on each frame. It is the backdrop that gets
         * sampled, and both halves of this need to reach outside the element:
         * an 18px blur draws from ~54px away, and the whole point of the rim
         * is to pull up content from below the bar. A region clipped to the
         * element would have nothing there to pull.
         */}
        <filter
          id="sync-glass"
          filterUnits="objectBoundingBox"
          x="-2%"
          y="-80%"
          width="104%"
          height="290%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="near" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="far" />

          <feImage
            href={VEIL_MASK}
            x={MAP_X}
            y="0"
            width={width}
            height={BAR}
            preserveAspectRatio="none"
            result="veilMask"
          />

          {/*
           * The heavy blur is cut to the mask and laid over the light one.
           * Where the mask is half opaque the two blend in equal parts, so two
           * fixed radii come out as a continuous ramp: heaviest under the row,
           * barely there at the rim, where the refraction needs something with
           * an edge left to bend.
           */}
          <feComposite in="far" in2="veilMask" operator="in" result="farCut" />
          <feComposite in="farCut" in2="near" operator="over" result="veiled" />

          <feImage
            href={DISPLACEMENT}
            x={MAP_X}
            y="0"
            width={width}
            height={BAR}
            preserveAspectRatio="none"
            result="map"
          />

          <feDisplacementMap
            in="veiled"
            in2="map"
            scale={SCALE}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}

function GlassBar({
  bare,
  expanded,
  children,
}: {
  /** The page is at the top, so there is nothing behind the bar to be glass over. */
  bare: boolean
  /**
   * A panel is open under the row, so the bar is taller than one rim.
   *
   * The pane covers whatever the bar currently is, panel included — one
   * surface, because two filtered surfaces edge to edge always show a seam:
   * each blurs its own backdrop and clamps at its own boundary, so the pixels
   * either side of the join come from different neighbourhoods however exactly
   * their washes agree. What changes is the *profile*: a gradient that thins
   * towards a rim is wrong once the rim is somewhere in the middle, and the
   * refraction would be drawing up page content the panel is covering. Both
   * stand down in `styles/glass.css` on this flag.
   */
  expanded?: boolean
  children: ReactNode
}) {
  const width = useMapWidth()

  return (
    <div className="glass" data-bare={bare ? '' : undefined} data-expanded={expanded ? '' : undefined}>
      <GlassFilter width={width} />
      <div className="glass-pane" aria-hidden="true" />
      <div className="glass-content">{children}</div>
    </div>
  )
}

export default GlassBar
