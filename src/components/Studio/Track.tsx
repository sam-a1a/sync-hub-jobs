import type { CSSProperties } from 'react'
import Icon from '../Icon'

export interface Stop {
  key: string
  label: string
  done: boolean
}

export function Track({
  stops,
  current,
  reachable,
  lit,
  onGo,
}: {
  stops: Stop[]
  current: number
  reachable: number
  lit: ReadonlySet<string>
  onGo: (index: number) => void
}) {
  const fill = stops.length > 1 ? current / (stops.length - 1) : 0
  return (
    <>
      <ol className="relative hidden lg:grid lg:gap-5" style={{ '--fill': fill } as CSSProperties}>
        <span aria-hidden="true" className="track-line">
          <span className="track-fill" />
        </span>
        {stops.map((stop, i) => {
          const state = i === current ? 'current' : stop.done ? 'done' : 'ahead'
          const can = i <= reachable
          return (
            <li key={stop.key} className="studio-in" style={{ '--i': i } as CSSProperties}>
              <button
                type="button"
                disabled={!can}
                aria-current={i === current ? 'step' : undefined}
                onClick={() => onGo(i)}
                className={`flex w-full items-center gap-3.5 rounded-full py-0.5 pr-3 text-left text-sm transition-colors duration-300 ease-[var(--ease-standard)] disabled:cursor-default ${i === current ? 'font-semibold text-ink' : stop.done ? 'text-ink-muted hover:text-ink' : 'text-ink-faint'} ${can && i !== current ? 'cursor-pointer' : ''}`}
              >
                <span aria-hidden="true" className="track-dot" data-state={state} data-lit={lit.has(stop.key) ? '' : undefined}>
                  {state === 'done' ? <Icon name="check" size={13} className="[--symbol-fill:1]" /> : null}
                </span>
                {stop.label}
              </button>
            </li>
          )
        })}
      </ol>
      <div className="flex items-center gap-3 lg:hidden">
        <ol className="flex items-center gap-1.5">
          {stops.map((stop, i) => (
            <li key={stop.key}>
              <button
                type="button"
                aria-label={stop.label}
                disabled={i > reachable}
                onClick={() => onGo(i)}
                className={`block h-1.5 rounded-full transition-[width,background-color] duration-400 ease-[var(--ease-glide)] ${i === current ? 'w-6 bg-teal-400' : stop.done ? 'w-2 bg-teal-600' : 'w-2 bg-hairline'}`}
              />
            </li>
          ))}
        </ol>
        <span className="text-sm font-medium text-ink">{stops[current]?.label}</span>
      </div>
    </>
  )
}
