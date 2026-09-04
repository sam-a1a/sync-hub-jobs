import type { ReactNode } from 'react'
import Collapse from './Collapse'

/**
 * Label above, help text under the label, error below the control. Never a
 * placeholder standing in for a label.
 */
function Field({
  label,
  htmlFor,
  help,
  error,
  required,
  children,
}: {
  label: ReactNode
  htmlFor: string
  help?: string | null
  error?: string | null
  required?: boolean
  children: ReactNode
}) {
  return (
    /*
     * `content-start` because a grid's rows stretch to fill it by default, and
     * a field beside a taller one is given exactly that to fill. The rows grew
     * to take up the slack — the label's row among them — and a label sitting
     * ten pixels taller than its text puts its own box ten pixels lower than
     * the one next to it. The field is a label and a control, top to bottom,
     * whatever room it has been handed.
     */
    <div className="grid content-start gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="ms-1 text-ink-muted" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {help ? <p className="-mt-1 text-xs text-ink-muted">{help}</p> : null}
      {children}
      {/*
       * The message opens the space it needs rather than taking it. A line of
       * text that blinks into existence shoves everything under it down by its
       * own height in one frame, which reads as the form breaking rather than
       * as the form answering.
       *
       * The negative margin cancels the grid's own gap so that the gap is part
       * of what grows: without it the 8px would arrive in one step and only the
       * text itself would ease in.
       */}
      <Collapse open={Boolean(error)} className="-mt-2">
        <p id={`${htmlFor}-error`} className="pt-2 text-xs text-brick">
          {error}
        </p>
      </Collapse>
    </div>
  )
}

/*
 * A near-symmetric curve, not one of the theme's. `--ease-out` is nine tenths
 * done in the first quarter of its duration — a movement curve, built so a
 * thing arrives quickly and settles. A colour has nowhere to arrive, so on
 * these it reads as a snap with a tail on it rather than as a fade.
 */
export const panelInputClass =
  'h-12 w-full rounded-2xl border border-hairline bg-paper-sunken px-4 text-base text-ink ' +
  'placeholder:text-ink-faint focus:border-ink focus:bg-paper-raised focus:outline-none ' +
  'transition-[color,border-color,background-color] duration-[var(--hover-fade)] ease-[var(--ease-standard)]'

export const inputClass =
  'h-11 w-full rounded-[12px] border border-hairline bg-paper-raised px-3.5 text-[15px] text-ink ' +
  'placeholder:text-ink-muted focus:border-teal-400 focus:outline-none ' +
  'transition-[color,border-color,background-color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'

export default Field
