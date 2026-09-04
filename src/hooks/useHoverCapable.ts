import { useEffect, useState, useSyncExternalStore } from 'react'

const QUERY = '(hover: hover)'

/**
 * Whether this device has a pointer that can hover.
 *
 * Not "is this a phone". The question a hover menu actually needs answered is
 * whether something can rest over the trigger without committing to it, and
 * that is exactly what `(hover: hover)` reports — true for a mouse or a
 * trackpad at any screen size, false for touch on a large tablet.
 *
 * It is watched rather than read once because it genuinely changes: a tablet
 * with a keyboard case attached, or a laptop that is also a touchscreen,
 * flips this while the page is open.
 */
export function useHoverCapable(): boolean {
  const [media] = useState(() =>
    typeof window === 'undefined' || !window.matchMedia ? null : window.matchMedia(QUERY),
  )

  const capable = useSyncExternalStore(
    (onChange) => {
      if (!media) return () => {}
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => (media ? media.matches : true),
    /*
     * Hover is the server-side assumption. Guessing touch would render the
     * menu in its tap-to-open form and then swap handlers on hydration, which
     * is a worse first frame than the reverse on the rarer device.
     */
    () => true,
  )

  return capable
}

/**
 * Calls back on a pointer press outside `ref`, while `active`.
 *
 * For the tap-to-open case only. A hover menu closes by the pointer leaving,
 * and has no need of this; a tapped one has no "leaving" and would otherwise
 * stay open until the trigger was tapped again.
 *
 * `pointerdown` and not `click`: the menu should be gone by the time the press
 * completes, and a `click` listener also fires after a drag that merely ended
 * outside.
 */
export function useDismissOnOutsidePress(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!active) return

    const onPointerDown = (event: PointerEvent) => {
      const node = ref.current
      if (node && event.target instanceof Node && !node.contains(event.target)) onDismiss()
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [ref, active, onDismiss])
}
