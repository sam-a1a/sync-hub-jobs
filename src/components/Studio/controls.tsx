import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import Icon, { type IconName } from '../Icon'

export const fieldClass =
  'h-12 w-full rounded-2xl border border-hairline bg-paper-raised/70 px-4 text-[15px] text-ink backdrop-blur-md ' +
  'placeholder:text-ink-faint focus:border-teal-400 focus:outline-none focus:ring-4 focus:ring-teal-400/15 ' +
  'transition-[border-color,box-shadow,background-color] duration-300 ease-[var(--ease-standard)]'

export function Field({ label, htmlFor, hint, children }: { label: ReactNode; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <label htmlFor={htmlFor} className="text-[13px] font-medium tracking-[0.01em] text-ink-muted">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ink-faint">{hint}</p> : null}
    </div>
  )
}

export function TextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  icon,
  type = 'text',
  hint,
  autoFocus,
}: {
  id: string
  label: ReactNode
  value: string
  onChange: (next: string) => void
  placeholder?: string
  icon?: IconName
  type?: 'text' | 'url' | 'tel' | 'email'
  hint?: string
  autoFocus?: boolean
}) {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="relative">
        {icon ? <Icon name={icon} size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-faint" /> : null}
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          className={`${fieldClass} ${icon ? 'pl-11' : ''}`}
        />
      </div>
    </Field>
  )
}

export function TextArea({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  max,
}: {
  id: string
  label: ReactNode
  value: string
  onChange: (next: string) => void
  placeholder?: string
  rows?: number
  max?: number
}) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="relative">
        <textarea
          id={id}
          value={value}
          rows={rows}
          placeholder={placeholder}
          maxLength={max}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
          className={`${fieldClass} h-auto resize-none py-3 leading-relaxed`}
        />
        {max ? <span className="pointer-events-none absolute right-3 bottom-2 text-[11px] text-ink-faint tabular-nums">{value.length}/{max}</span> : null}
      </div>
    </Field>
  )
}

export function NumberInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string
  label: ReactNode
  value: number | null
  onChange: (next: number | null) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <Field label={label} htmlFor={id}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const digits = event.target.value.replace(/\D/g, '').slice(0, 4)
          onChange(digits === '' ? null : Number(digits))
        }}
        className={`${fieldClass} tabular-nums disabled:opacity-40`}
      />
    </Field>
  )
}

export interface Option {
  key: string
  label: string
  meta?: string
}

export function Picker({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = 'Choose',
  icon,
  floating = true,
}: {
  id: string
  label?: ReactNode
  value: string
  options: Option[]
  onChange: (key: string) => void
  placeholder?: string
  icon?: IconName
  floating?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const listId = useId()
  const searchable = options.length > 8
  const chosen = options.find((o) => o.key === value) ?? null
  const shown = query.trim().toLowerCase()
  const rows = shown ? options.filter((o) => o.label.toLowerCase().includes(shown) || o.meta?.toLowerCase().includes(shown)) : options

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    const focus = window.setTimeout(() => search.current?.focus(), 30)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.clearTimeout(focus)
    }
  }, [open])

  const choose = (key: string) => {
    onChange(key)
    setOpen(false)
    setQuery('')
  }

  const onKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      setOpen(false)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) setOpen(true)
      else setActive((a) => Math.min(rows.length - 1, a + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      const row = rows[active]
      if (row) choose(row.key)
    }
  }

  const control = (
    <div ref={box} className="relative" onKeyDown={onKey}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={`${fieldClass} group flex cursor-pointer items-center gap-3 text-left ${icon ? 'pl-11' : ''}`}
      >
        {icon ? <Icon name={icon} size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-faint" /> : null}
        <span className={`min-w-0 flex-1 truncate ${chosen ? 'text-ink' : 'text-ink-faint'}`}>{chosen?.label ?? placeholder}</span>
        <Icon name="arrow_drop_down" size={22} className={`shrink-0 text-ink-muted transition-transform duration-300 ease-[var(--ease-standard)] ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`unfold ${floating ? 'absolute inset-x-0 top-full z-30' : ''}`} data-open={open ? '' : undefined}>
        <div>
          <div className="mt-2 rounded-2xl bg-paper-raised p-1.5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6)] ring-1 ring-hairline">
            {searchable ? (
              <input
                ref={search}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActive(0)
                }}
                placeholder="Type to find"
                aria-label="Type to find"
                className="mb-1 h-10 w-full rounded-xl bg-paper px-3 text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            ) : null}
            <ul id={listId} role="listbox" data-lenis-prevent className="max-h-60 overflow-y-auto overscroll-contain">
              {rows.length === 0 ? <li className="px-3 py-2 text-sm text-ink-faint">Nothing matches.</li> : null}
              {rows.map((row, i) => (
                <li key={row.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={row.key === value}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(row.key)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-150 ${i === active ? 'bg-[var(--hover-wash)] text-ink' : 'text-ink-muted'} ${row.key === value ? 'font-medium text-ink' : ''}`}
                  >
                    <span className="truncate">{row.label}</span>
                    {row.meta ? <span className="shrink-0 text-xs text-ink-faint tabular-nums">{row.meta}</span> : null}
                    {row.key === value ? <Icon name="check" size={16} className="shrink-0 text-teal-500" /> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  return label ? (
    <Field label={label} htmlFor={id}>
      {control}
    </Field>
  ) : (
    control
  )
}

export function Segmented({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: {
  options: Option[]
  value: string
  onChange: (key: string) => void
  label: string
  size?: 'sm' | 'md'
}) {
  const box = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null)
  const index = options.findIndex((o) => o.key === value)

  useLayoutEffect(() => {
    const node = box.current
    if (!node) return
    const place = () => {
      const child = node.children[index + 1] as HTMLElement | undefined
      if (!child) {
        setPill(null)
        return
      }
      setPill({ x: child.offsetLeft, w: child.offsetWidth })
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(node)
    return () => ro.disconnect()
  }, [index, options.length])

  return (
    <div ref={box} role="radiogroup" aria-label={label} className="relative inline-flex max-w-full flex-wrap gap-1 rounded-full bg-paper-raised/70 p-1 ring-1 ring-hairline backdrop-blur-md">
      <span aria-hidden="true" className="seg-pill" style={pill ? { transform: `translateX(${pill.x}px)`, width: pill.w, left: 0, opacity: 1 } : { opacity: 0 }} />
      {options.map((option) => {
        const on = option.key === value
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.key)}
            className={`relative z-10 cursor-pointer rounded-full font-medium whitespace-nowrap transition-colors duration-300 ease-[var(--ease-standard)] ${size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} ${on ? 'text-paper' : 'text-ink-muted hover:text-ink'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full transition-colors duration-300 ease-[var(--ease-standard)] disabled:cursor-not-allowed disabled:opacity-40 ${on ? 'bg-teal-500' : 'bg-hairline'}`}
    >
      <span aria-hidden="true" className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.3)] transition-transform duration-400 ease-[var(--ease-spring)] ${on ? 'translate-x-6' : ''}`} />
    </button>
  )
}

export function Chip({ children, onRemove, tone = 'teal' }: { children: ReactNode; onRemove?: () => void; tone?: 'teal' | 'plain' }) {
  return (
    <span className={`chip-in inline-flex items-center gap-1 rounded-full py-1.5 pl-3.5 text-sm font-medium ${onRemove ? 'pr-1.5' : 'pr-3.5'} ${tone === 'teal' ? 'bg-teal-500/15 text-teal-700 ring-1 ring-teal-500/25 dark:text-teal-300' : 'bg-paper-raised text-ink ring-1 ring-hairline'}`}>
      {children}
      {onRemove ? (
        <button type="button" aria-label={`Remove ${typeof children === 'string' ? children : ''}`} onClick={onRemove} className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full transition-colors duration-[var(--hover-fade)] hover:bg-teal-600 hover:text-white">
          <Icon name="close" size={14} />
        </button>
      ) : null}
    </span>
  )
}

export function GlyphButton({ label, icon, onClick, className = '' }: { label: string; icon: IconName; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`group inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-[background-color,color,scale] duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:bg-[var(--hover-wash)] hover:text-ink active:scale-90 ${className}`}
    >
      <Icon name={icon} size={20} className="transition-[scale] duration-[var(--hover-fade)] group-hover:scale-110 group-hover:[--symbol-fill:1]" />
    </button>
  )
}

export function Pill({
  children,
  onClick,
  tone = 'accent',
  disabled,
  icon,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  tone?: 'accent' | 'outline' | 'ghost'
  disabled?: boolean
  icon?: IconName
  type?: 'button' | 'submit'
}) {
  const tones = {
    accent: 'bg-teal-500 text-paper hover:bg-teal-400 disabled:hover:bg-teal-500',
    outline: 'border border-hairline text-ink hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400',
    ghost: 'text-ink-muted hover:bg-[var(--hover-wash)] hover:text-ink',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`group inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform,opacity] duration-300 ease-[var(--ease-standard)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${tones[tone]}`}
    >
      {icon ? <Icon name={icon} size={20} className="transition-transform duration-300 group-hover:[--symbol-fill:1]" /> : null}
      {children}
    </button>
  )
}

export function HoldButton({ children, onHeld, ms = 900 }: { children: ReactNode; onHeld: () => void; ms?: number }) {
  const [hold, setHold] = useState(0)
  const raf = useRef(0)
  const start = useRef(0)
  const stop = () => {
    cancelAnimationFrame(raf.current)
    setHold(0)
  }
  const begin = () => {
    start.current = performance.now()
    const tick = () => {
      const k = Math.min(1, (performance.now() - start.current) / ms)
      setHold(k)
      if (k >= 1) {
        setHold(0)
        onHeld()
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return (
    <button
      type="button"
      onPointerDown={begin}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') begin()
      }}
      onKeyUp={stop}
      className="relative inline-flex h-12 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-brick/40 px-6 text-[15px] font-semibold text-brick select-none"
    >
      <span aria-hidden="true" className="hold-fill absolute inset-0 bg-brick/20" style={{ '--hold': hold } as React.CSSProperties} />
      <span className="relative">{children}</span>
    </button>
  )
}
