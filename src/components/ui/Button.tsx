import type { ReactNode, Ref } from 'react'

/**
 * Interactive controls are the only fully-rounded shape on the site.
 * `:active` scales down: a button that does not answer a press feels dead.
 *
 * A disabled one keeps its pointer events rather than dropping them. The
 * `disabled` attribute already refuses the click, and dropping the events as
 * well hands the cursor to whatever is underneath — so the one moment the
 * cursor has something to say, it says nothing.
 */
const BUTTON_BASE =
  'button relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full whitespace-nowrap font-medium select-none ' +
  'transition-[transform,background-color,border-color,color,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ' +
  'active:scale-[0.97] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'

type ButtonTone = 'accent' | 'outline' | 'ghost'

/*
 * Each tone spells out what hover does when the control is disabled, because
 * otherwise it still does it. `:hover` does not stop applying to a disabled
 * button, and the doubled variant is a specificity higher, so it wins.
 */
const TONE: Record<ButtonTone, string> = {
  accent: 'bg-teal-600 text-white hover:bg-teal-700 disabled:hover:bg-teal-600',
  outline:
    'border border-hairline text-ink hover:border-ink disabled:hover:border-hairline',
  ghost: 'text-ink hover:bg-[var(--hover-wash)] disabled:hover:bg-transparent',
}

const SIZE = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-13 px-7 text-base',
} as const

function Button({
  ref,
  children,
  tone = 'accent',
  size = 'md',
  type = 'button',
  onClick,
  disabled,
  busy,
  className = '',
}: {
  /** For whoever has to put focus on it — a dialog's safe default, say. */
  ref?: Ref<HTMLButtonElement>
  children: ReactNode
  tone?: ButtonTone
  size?: keyof typeof SIZE
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
  /**
   * Work is in flight. The button draws itself in to a circle around its own
   * spinner — the label is not replaced by one, the button *becomes* one.
   */
  busy?: boolean
  className?: string
}) {
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      data-busy={busy ? '' : undefined}
      className={`${BUTTON_BASE} ${TONE[tone]} ${SIZE[size]} ${className}`}
    >
      {/*
       * The label is a box of its own so it can be faded and scaled out
       * without the button's own padding going with it — and it keeps its
       * width while it leaves, so the shrink is the button closing around it
       * rather than the text reflowing on the way.
       */}
      <span className="button-label">{children}</span>

      {/*
       * Absolutely centred, so it is in the middle of the circle at the end of
       * the shrink and in the middle of the pill at the start of it. Laid out
       * in flow it would be pushed around by the label it is replacing.
       */}
      <span className="button-spinner" aria-hidden="true">
        <span className="spinner" />
      </span>
    </button>
  )
}

export default Button
