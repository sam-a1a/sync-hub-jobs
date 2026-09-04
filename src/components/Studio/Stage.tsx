import type { ReactNode } from 'react'

export function Stage({
  stageKey,
  dir,
  eyebrow,
  title,
  lede,
  aside,
  children,
  wide = false,
}: {
  stageKey: string
  dir: 'forward' | 'back'
  eyebrow: string
  title: ReactNode
  lede?: ReactNode
  aside?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div key={stageKey} data-dir={dir} className={`stage-enter grid gap-10 lg:items-start ${wide ? 'lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]' : 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]'} lg:gap-16`}>
      <div className="lg:sticky lg:top-28">
        <p className="text-xs font-medium tracking-[0.16em] text-teal-600 uppercase dark:text-teal-400">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-balance text-ink sm:text-5xl lg:text-[3.4rem] lg:leading-[1.04]">{title}</h1>
        {lede ? <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-muted">{lede}</p> : null}
        {aside ? <div className="mt-8">{aside}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function Card({ children, className = '', index = 0 }: { children: ReactNode; className?: string; index?: number }) {
  return (
    <div className={`studio-in rounded-[28px] bg-paper-raised/60 p-6 ring-1 ring-hairline backdrop-blur-xl sm:p-7 ${className}`} style={{ '--i': index } as React.CSSProperties}>
      {children}
    </div>
  )
}
