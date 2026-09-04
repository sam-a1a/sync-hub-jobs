/*
 * The optics behind the header's glass.
 *
 * Apple's Liquid Glass is not a blur. A blur says "there is something behind
 * this"; glass says "there is something behind this and it is being bent". The
 * bending is the whole tell, and it happens almost entirely at the edges — the
 * middle of a glass slab is flat, so light passes straight through it and only
 * the curved lip refracts.
 *
 * The browser has no refraction primitive, but it has `feDisplacementMap`,
 * which moves each pixel of an input by an amount read out of a second image's
 * colour channels. So the job is to draw the refraction as a picture: an image
 * whose red channel says how far to shift horizontally and whose green channel
 * says how far to shift vertically, with 128 meaning "leave this pixel alone".
 *
 * The header is a full-bleed bar. Its side edges are off-screen and its top
 * edge is flush with the viewport, which leaves exactly one lip that anybody
 * can see: the bottom one. That makes every map in here one-dimensional — they
 * vary down the bar and are constant across it — and a one-dimensional map is
 * just a gradient. Which is why what comes out of this file is a handful of SVG
 * data URIs rather than a canvas: no DOM, no raster, nothing to regenerate on
 * resize, and nothing that falls over in a test environment with no canvas.
 */

/** Crown glass, near enough. Apple's material reads a little softer than this. */
const INDEX = 1.5

/**
 * The height of the glass surface across the lip, with `u` running from 0 at
 * the very rim to 1 where the surface has flattened out into the slab.
 *
 *   h(u) = (1 - (1 - u)^4)^(1/4)
 *
 * A quarter-power squircle rather than a circle, because a circular edge meets
 * the flat interior at a visible crease and Apple's does not. The fourth power
 * is the same family as the iOS corner shape: it arrives at the flat part
 * tangentially, so the refraction fades out instead of stopping.
 */
function slope(u: number): number {
  const remaining = (1 - u) ** 4
  return (1 - u) ** 3 / (1 - remaining) ** 0.75
}

/**
 * Snell's law, applied once, to a ray arriving straight on.
 *
 * The surface tilts by `atan(slope)` away from horizontal, so that is also the
 * angle of incidence for a vertical ray. The ray leaves at `asin(sin i / n)`,
 * and the difference between the two is how far off course it now is. Tangent
 * of that turns the angle into a sideways offset per unit of glass thickness
 * the thickness itself is folded into the scale the filter is given, so what
 * comes back here is a shape, not a distance.
 */
function bend(u: number): number {
  const incidence = Math.atan(slope(u))
  const refracted = Math.asin(Math.sin(incidence) / INDEX)
  return Math.tan(incidence - refracted)
}

/**
 * The rim is sampled at `RIM` rather than at 0. The slope is vertical at the
 * very edge — a real cabochon does bend light through ninety degrees there —
 * and one infinite sample would dominate the normalisation below and flatten
 * every other stop to nothing. This is the cutoff where the curve is steep
 * enough to read as glass and still leaves the rest of the lip visible.
 */
const RIM = 0.045

/** The dimensions are arbitrary: every one of these gets stretched to fit. */
function dataUri(stops: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="256" viewBox="0 0 4 256" preserveAspectRatio="none">` +
    `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>` +
    `<rect width="4" height="256" fill="url(#g)"/>` +
    `</svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * The bar's displacement map, top to bottom.
 *
 * Everything above the lip is the flat interior of the slab and sits at the
 * neutral 128 — it has to be drawn rather than left out, because a filter reads
 * absence as zero, and zero is a channel's way of saying "displace this by the
 * full negative scale". The map covers the whole bar for that reason.
 *
 * Inside the lip the green channel climbs to 255 at the rim. Positive, which
 * under `feDisplacementMap` means each pixel is sampled from *below* itself:
 * the content just under the bar is drawn up into the lip and compressed there,
 * which is what looking through the rounded edge of a glass slab does. Red is
 * left flat — a full-width bar bends nothing sideways.
 */
export function displacementMap(lip: number, steps = 28): string {
  const start = (1 - lip) * 100

  const bends: number[] = []
  for (let step = 0; step <= steps; step += 1) {
    bends.push(bend(1 - (step / steps) * (1 - RIM)))
  }

  // Normalised to a peak of 1, so the filter's `scale` is the displacement in
  // pixels at the rim and stays that whatever the curve above does.
  const peak = Math.max(...bends)

  const flat = `<stop offset="0%" stop-color="rgb(128,128,128)"/>`
  const ramp = bends
    .map((amount, step) => {
      const green = Math.round(128 + (amount / peak) * 127)
      const offset = (start + (step / steps) * lip * 100).toFixed(2)
      return `<stop offset="${offset}%" stop-color="rgb(128,${green},128)"/>`
    })
    .join('')

  return dataUri(flat + ramp)
}

/**
 * A mask for one of the blur levels: opaque down to `solid`, gone by `fade`,
 * both as fractions of the bar.
 *
 * Real glass over a page is not uniformly frosted. It reads as thick where it
 * meets the chrome and thins toward the rim, so content dissolves on its way up
 * under the bar rather than crossing a hard line. Stacking two of these over a
 * light base blur is how that gradient gets built inside a single filter — and
 * it has to be a single filter, because the bar is a view-transition element
 * and a named element is a backdrop root: nothing nested inside one has a
 * backdrop left to filter.
 */
export function veilMask(solid: number, fade: number): string {
  return dataUri(
    `<stop offset="0%" stop-color="#000" stop-opacity="1"/>` +
      `<stop offset="${(solid * 100).toFixed(1)}%" stop-color="#000" stop-opacity="1"/>` +
      `<stop offset="${(fade * 100).toFixed(1)}%" stop-color="#000" stop-opacity="0"/>` +
      `<stop offset="100%" stop-color="#000" stop-opacity="0"/>`,
  )
}
