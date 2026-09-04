import Icon from '../Icon'
import { useTheme } from '../../hooks/useTheme'

/**
 * Light or dark, in one button.
 *
 * The glyph shows what the button will *do*, not what is currently on: a moon
 * in daylight means "make it dark". The alternative convention — showing the
 * state you are in — puts a sun on a page that is plainly already bright, and
 * then the button reads as a label.
 *
 * Hover fills the glyph — `--symbol-fill` runs the font's own FILL axis from 0
 * to 1, so the outline thickens into a solid moon rather than being swapped
 * for a different drawing of one — and lifts it very slightly. Pressing sinks
 * the whole target.
 *
 * The two halves are deliberately opposite: the icon grows towards the pointer
 * on approach and the button gives way under it on contact. That is the shape
 * of a real button, and it is worth more than either move on its own.
 *
 * `scale` and not `transform`, in both places, because Tailwind v4 compiles
 * `scale-*` to the standalone property — a transition naming `transform` here
 * would animate nothing.
 *
 * All three run on `--hover-fade`, the same token the nav items use. The wash
 * behind this button and the wash behind "Browse Jobs" are the same gesture
 * and the pointer moves between them; they cannot be on different clocks.
 */
function ThemeToggle() {
  const { appearance, toggle } = useTheme()
  const next = appearance === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Switch to ${next} mode`}
      aria-label={`Switch to ${next} mode`}
      className="group relative inline-flex size-10 cursor-pointer items-center justify-center
        rounded-full text-ink transition-[color,background-color,scale]
        duration-[var(--hover-fade)] ease-[var(--ease-standard)]
        hover:bg-[var(--hover-wash)] active:scale-90"
    >
      <Icon
        name={appearance === 'dark' ? 'light_mode' : 'dark_mode'}
        size={22}
        className="group-hover:scale-110 group-hover:[--symbol-fill:1]"
      />
      <span className="sr-only">{appearance === 'dark' ? 'Dark' : 'Light'} mode</span>
    </button>
  )
}

export default ThemeToggle
