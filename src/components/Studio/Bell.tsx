import { useEffect, useRef } from 'react'
import Icon from '../Icon'
import { useCanHover } from '../../hooks/useCanHover'
import { useHoverMenu } from '../../hooks/useHoverMenu'
import { timeAgo } from '../../lib/relative-time'
import { readAllNotifications, readNotification, useStudio } from '../../lib/profile/store'
import type { NotificationKind } from '../../lib/profile/types'

const GLYPH: Record<NotificationKind, 'auto_awesome' | 'close' | 'work'> = {
  cv_read: 'auto_awesome',
  cv_failed: 'close',
  application: 'work',
}

export function Bell() {
  const { notifications } = useStudio()
  const menu = useHoverMenu()
  const canHover = useCanHover()
  const box = useRef<HTMLDivElement>(null)
  const unread = notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (!menu.open) return
    const away = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) menu.close()
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [menu])

  return (
    <div ref={box} className="static sm:relative" onMouseEnter={canHover ? menu.enter : undefined} onMouseLeave={canHover ? menu.leave : undefined}>
      <button
        type="button"
        aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={menu.open}
        onClick={() => (menu.open ? menu.close() : menu.enter())}
        className="group relative inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-ink transition-[background-color,scale] duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:bg-[var(--hover-wash)] active:scale-90"
      >
        <Icon name="notifications" size={22} className="transition-transform duration-300 group-hover:[--symbol-fill:1]" />
        {unread ? <span aria-hidden="true" className="chip-in absolute top-2 right-2 size-2 rounded-full bg-teal-400 ring-2 ring-paper" /> : null}
      </button>
      <div
        role="dialog"
        aria-label="Notifications"
        data-open={menu.open ? '' : undefined}
        inert={!menu.open}
        className="bell-panel absolute top-full right-0 z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-3xl bg-paper-raised p-2 shadow-[0_30px_80px_-24px_rgb(0_0_0/0.7)] ring-1 ring-hairline"
      >
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <p className="text-sm font-semibold text-ink">Notifications</p>
          {unread ? (
            <button
              type="button"
              onClick={readAllNotifications}
              className="group/m relative cursor-pointer text-xs font-medium text-teal-600 dark:text-teal-400"
            >
              Mark all read
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-current transition-transform duration-[var(--hover-fade)] ease-[var(--ease-standard)] group-hover/m:scale-x-100"
              />
            </button>
          ) : null}
        </div>
        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-ink-muted">Nothing yet. We will tell you when a CV is read or an application moves.</p>
        ) : (
          <ul data-lenis-prevent className="max-h-[22rem] overflow-y-auto overscroll-contain">
            {notifications.map((n, i) => (
              <li key={n.id} className="row-in" style={{ animationDelay: `${i * 40}ms` }}>
                <button
                  type="button"
                  onClick={() => readNotification(n.id)}
                  className={`flex w-full cursor-pointer items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors duration-200 hover:bg-[var(--hover-wash)] ${n.read ? 'opacity-70' : ''}`}
                >
                  <span
                    className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full ${n.kind === 'cv_failed' ? 'bg-brick/15 text-brick' : 'bg-teal-500/15 text-teal-600 dark:text-teal-400'}`}
                  >
                    <Icon name={GLYPH[n.kind]} size={16} className="[--symbol-fill:1]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-ink">{n.title}</span>
                      {n.read ? null : <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-teal-400" />}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{n.body}</span>
                    <span className="mt-1 block text-[11px] text-ink-faint">{timeAgo(n.at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
