/*
 * The hamburger, and the X it becomes.
 *
 * Drawn here rather than swapped between two icons, because a swap has no
 * middle: the bars *are* the X's arms, and the only way to show that is to move
 * them there. Three 24-unit bars with rounded ends, spanning 40 to 216, centred
 * at 64, 128 and 192 of a 256 box. Rects rather than one path, because each bar
 * has to move on its own — and because a rect has a real bounding box, which is
 * what `transform-box: fill-box` needs to turn each bar about its own centre.
 *
 * Translating the outer two by 64 lands both exactly on the middle, so the
 * rotation that follows is about the icon's own centre and the arms cross where
 * they should.
 *
 * The sequencing is in `styles/motion.css`, and it is the whole trick: opening,
 * the bars close ranks first and only then swing; closing, they swing back
 * first and only then spread. Doing both at once reads as a scribble.
 */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="menu-icon"
      data-open={open ? '' : undefined}
      viewBox="0 0 256 256"
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect className="menu-icon-bar menu-icon-top" x="40" y="52" width="176" height="24" rx="12" />
      <rect
        className="menu-icon-bar menu-icon-middle"
        x="40"
        y="116"
        width="176"
        height="24"
        rx="12"
      />
      <rect
        className="menu-icon-bar menu-icon-bottom"
        x="40"
        y="180"
        width="176"
        height="24"
        rx="12"
      />
    </svg>
  )
}

export default MenuIcon
