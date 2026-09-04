import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Icon from '../Icon'
import { signOut } from '../../lib/account'
import { useCanHover } from '../../hooks/useCanHover'
import { useHoverMenu } from '../../hooks/useHoverMenu'

/**
 * What "Hello, Sam!" opens onto.
 *
 * A hover menu rather than a click one, because the thing it hangs off is not a
 * button any more — signed in, the bar's call to action has nothing left to ask
 * for, so pressing it does nothing and hovering it is the only gesture left to
 * mean something.
 *
 * The card is positioned rather than laid out. Unlike the SYNC AI panel, which
 * grows the bar it belongs to, this floats over whatever is beneath it: it is
 * a row or two, and pushing the whole page down by their height would be a lot
 * of movement to offer a logout.
 *
 * Signed out it is the wrapper and nothing else — no card, no handlers, so
 * there is no empty hover target sitting on the page's one call to action. It
 * still wraps, though, rather than the header choosing between this and a bare
 * button, and that is not a stylistic preference: swapping the element around
 * the button is what unmounts the button, and a label cannot morph out of a
 * value the node it is mounted in has never held. Logging out has to leave the
 * same button standing for the greeting to roll off it.
 */
function AccountMenu({
  enabled,
  children,
}: {
  /** Whether there is an account for the menu to be about. */
  enabled: boolean
  children: ReactNode
}) {
  /*
   * Its own instance, not the bar's. Two menus that shared one piece of state
   * would close each other, and the pointer moving from "Browse Jobs" to the
   * greeting is a perfectly ordinary path across the bar.
   */
  const menu = useHoverMenu()
  const canHover = useCanHover()
  const box = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const onLanding = useLocation().pathname === '/'

  useEffect(() => {
    if (!menu.open) return
    const away = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) menu.close()
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [menu])

  return (
    <div
      ref={box}
      className="relative"
      onClick={enabled && !canHover ? () => (menu.open ? menu.close() : menu.enter()) : undefined}
      onMouseEnter={enabled && canHover ? menu.enter : undefined}
      /*
       * On the wrapper, so the card counts as inside. It is absolutely
       * positioned but still a DOM child, and `mouseleave` does not fire for a
       * pointer moving onto a descendant — which is what lets the card be
       * reachable without a grace period.
       */
      onMouseLeave={enabled && canHover ? menu.leave : undefined}
    >
      {children}

      {enabled ? (
        <div
          className="account-menu"
          data-open={menu.open ? '' : undefined}
          inert={!menu.open}
          role="menu"
          aria-label="Account"
        >
          {onLanding ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                menu.close()
                void navigate('/profile')
              }}
              className="account-menu-item"
            >
              Profile
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              signOut()
              menu.close()
              void navigate('/')
            }}
            className="account-menu-item account-menu-quit"
          >
            Log out
            <Icon name="logout" size={18} />
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default AccountMenu
