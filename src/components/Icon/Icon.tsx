import type { CSSProperties } from 'react'

/**
 * Every Material Symbol the site uses, and only those.
 *
 * The font comes from Google Fonts cut to exactly this list — the `<link>` in
 * `index.html` names them — so adding a name here without adding it there
 * renders nothing at all.
 *
 * The codepoints are Google's own, checked against the upstream `.codepoints`
 * manifest for the variable font. The usual way to write one of these is to
 * put the literal string `dark_mode` in the element and let a ligature turn it
 * into the moon, and that is *not* what happens here: the ligature route
 * depends on which shaping features a browser applies by default, and it can
 * flash the raw text `dark_mode` across the bar if the font is slow. The
 * codepoint is the same glyph with nothing in between.
 */
const CODEPOINTS = {
  add: '\ue145',
  arrow_drop_down: '\ue5c5',
  arrow_forward: '\ue5c8',
  auto_awesome: '\ue65f',
  badge: '\uea67',
  call: '\uf0d4',
  check: '\ue668',
  check_circle: '\uf0be',
  close: '\ue5cd',
  close_small: '\uf508',
  code: '\ue86f',
  crop_21_9: '\u{fff0a}',
  copy_all: '\ue2ec',
  dark_mode: '\ue51c',
  delete: '\ue92e',
  description: '\ue873',
  edit: '\uf097',
  filter_list: '\ue152',
  filter_list_off: '\ueb57',
  folder_open: '\ue2c8',
  history_edu: '\uea3e',
  language: '\uea07',
  light_mode: '\ue518',
  link: '\ue250',
  location_on: '\uf1db',
  mail: '\ue159',
  open_in_new: '\ue89e',
  person: '\uf0d3',
  picture_as_pdf: '\ue415',
  print: '\ue8ad',
  psychology: '\uea4a',
  remove: '\ue15b',
  rocket_launch: '\ueb9b',
  save: '\ue161',
  school: '\ue80c',
  star: '\uf09a',
  translate: '\ue8e2',
  undo: '\ue166',
  upload: '\uf09b',
  verified: '\uef76',
  visibility: '\ue8f4',
  visibility_off: '\ue8f5',
  volume_down: '\ue04d',
  volume_off: '\ue04f',
  work: '\ue943',
  notifications: '\ue7f5',
  logout: '\ue9ba',
  search: '\uef7a',
  schedule: '\uefd6',
  apartment: '\uea40',
  trending_up: '\ue8e5',
} as const

export type IconName = keyof typeof CODEPOINTS

/**
 * A Material Symbol.
 *
 * Fill is *not* a prop. It is `--symbol-fill`, a custom property the caller
 * sets from CSS — `group-hover:[--symbol-fill:1]` — because the whole point is
 * for it to interpolate: the moon thickens into its filled self under the
 * pointer instead of cutting to it, and a React state change per pointer event
 * could not do that even if it were free.
 */
function Icon({
  name,
  size = 24,
  className = '',
  style,
}: {
  name: IconName
  size?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbol shrink-0 select-none ${className}`}
      style={{ fontSize: `${size}px`, width: `${size}px`, height: `${size}px`, ...style }}
    >
      {CODEPOINTS[name]}
    </span>
  )
}

export default Icon
