import { useState, type CSSProperties } from 'react'
import { useLenis } from 'lenis/react'
import { Link } from 'react-router'
import BrandIcon, { type BrandName } from '../../components/BrandIcon/BrandIcon'
import Icon from '../../components/Icon'
import WarningModal from '../../components/WarningModal'
import { panelInputClass } from '../../components/ui/Field'
import { capitalise } from '../../lib/format'
import { SAMPLE_JOBS } from '../../lib/jobs'
import { STATUS_LABELS, statusOf } from '../../lib/status'
import { useStudio, withdrawApplication } from '../../lib/profile/store'
import { timeAgo } from '../../lib/relative-time'
import type { Application } from '../../lib/profile/types'

const BRANDS: Record<string, BrandName> = {
  google: 'google',
  meta: 'meta',
  stripe: 'stripe',
  airbnb: 'airbnb',
  spotify: 'spotify',
  figma: 'figma',
  notion: 'notion',
}

const PER_PAGE = 10

const PAGE_BTN =
  'inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-hairline px-5 text-sm font-semibold whitespace-nowrap text-ink transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:border-ink'

const PILL =
  'inline-flex items-center justify-center gap-2 rounded-full border border-hairline px-3 py-1 text-center text-xs font-medium whitespace-nowrap text-ink-muted'

const CHIP =
  'inline-flex cursor-pointer items-center rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)]'

const ACTIONS = ['Withdraw', 'Congratulations!']

const WIDEST_STATUS = STATUS_LABELS.reduce((a, b) => (b.length > a.length ? b : a))

const WIDEST_ACTION = ACTIONS.reduce((a, b) => (b.length > a.length ? b : a))

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

function jobFor(app: Application) {
  return (
    SAMPLE_JOBS.find((j) => `app_${j.id}` === app.id) ??
    SAMPLE_JOBS.find((j) => j.title.toLowerCase() === app.job.toLowerCase() && j.company.toLowerCase() === app.company.toLowerCase())
  )
}

function Row({ app, index, match, onWithdraw }: { app: Application; index: number; match: boolean; onWithdraw: () => void }) {
  const status = statusOf(app)
  const job = jobFor(app)
  const brand = BRANDS[app.company.trim().toLowerCase()]
  const acts = status.key === 'hired' || !status.done

  return (
    <li className="unfold" data-open={match ? '' : undefined}>
      <div>
        <div
          className="hero-in grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-5 border-t border-hairline py-8 sm:gap-x-8 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:py-10"
          style={{ '--i': Math.min(index, 6) } as CSSProperties}
        >
          <span
            aria-hidden="true"
            className="col-start-1 row-start-1 inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--hover-wash)] text-[13px] font-semibold text-ink"
          >
            {brand ? <BrandIcon name={brand} size={20} colour /> : initials(app.company)}
          </span>

          <div className="col-start-2 row-start-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              {job ? (
                <Link
                  to={`/jobs/${job.id}`}
                  className="cursor-pointer truncate text-base font-medium tracking-[-0.014em] text-ink transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:text-teal-600 dark:hover:text-teal-400"
                >
                  {capitalise(app.job)}
                </Link>
              ) : (
                <p className="truncate text-base font-medium tracking-[-0.014em] text-ink">{capitalise(app.job)}</p>
              )}
              <span className="lg:hidden">
                <span className={`${PILL} ${status.tone}`}>{status.label}</span>
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className={PILL}>{capitalise(app.company)}</span>
              <span className={PILL}>{capitalise(app.location)}</span>
              <span className={`${PILL} border-transparent bg-[var(--hover-wash)] text-ink-faint`}>
                Applied {capitalise(timeAgo(app.sent_at))}
              </span>
            </div>
          </div>

          <div
            className={`col-start-2 row-start-2 items-center gap-3 sm:gap-5 lg:col-start-3 lg:row-start-1 lg:grid lg:grid-cols-[auto_auto] lg:gap-x-5 lg:gap-y-0 ${acts ? 'flex' : 'hidden'}`}
          >
            <span aria-hidden="true" className="invisible col-start-1 row-start-1 hidden h-0 overflow-hidden lg:block">
              <span className={PILL}>{WIDEST_STATUS}</span>
            </span>
            <span aria-hidden="true" className="invisible col-start-2 row-start-1 hidden h-0 overflow-hidden lg:block">
              <span className="inline-flex h-10 items-center rounded-full border px-5 text-sm font-semibold whitespace-nowrap">
                {WIDEST_ACTION}
              </span>
            </span>

            <span className={`hidden lg:block ${acts ? 'lg:col-span-1' : 'lg:col-span-2'} col-start-1 row-start-2`}>
              <span className={`${PILL} ${status.tone} w-full`}>{status.label}</span>
            </span>

            {acts ? (
              <span className="col-start-2 row-start-2 flex w-full">
                {status.key === 'hired' ? (
                  <span className="inline-flex h-10 w-full cursor-default items-center justify-center rounded-full border border-emerald/40 px-5 text-center text-sm font-semibold whitespace-nowrap text-emerald">
                    Congratulations!
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onWithdraw}
                    className="group/w inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-full border border-hairline px-5 text-center text-sm font-semibold whitespace-nowrap text-ink-muted transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:border-brick hover:text-brick"
                  >
                    Withdraw
                    <span className="grid grid-cols-[0fr] items-center transition-[grid-template-columns] duration-[var(--hover-fade)] ease-[var(--ease-standard)] group-hover/w:grid-cols-[1fr]">
                      <span className="flex min-w-0 items-center overflow-hidden leading-none">
                        <Icon name="close_small" size={18} className="ms-1.5" />
                      </span>
                    </span>
                  </button>
                )}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  )
}

function Group({ title, options, picked, onToggle }: { title: string; options: string[]; picked: Set<string>; onToggle: (value: string) => void }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-[0.14em] text-ink-faint uppercase">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const on = picked.has(option)
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(option)}
              className={`${CHIP} ${on ? 'border-transparent bg-ink text-paper' : 'border-hairline text-ink-muted hover:border-ink hover:text-ink'}`}
            >
              {capitalise(option)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ApplicationsPage() {
  const { applications } = useStudio()
  const lenis = useLenis()
  const [query, setQuery] = useState('')
  const [filtering, setFiltering] = useState(false)
  const [companies, setCompanies] = useState<Set<string>>(new Set())
  const [cities, setCities] = useState<Set<string>>(new Set())
  const [statuses, setStatuses] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState<Application | null>(null)
  const [confirming, setConfirming] = useState(false)

  const moving = applications.filter((a) => !statusOf(a).done).length
  const needle = query.trim().toLowerCase()
  const picked = companies.size + cities.size + statuses.size

  const toggle = (set: Set<string>, apply: (next: Set<string>) => void) => (value: string) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    apply(next)
    setPage(1)
  }

  const matches = (a: Application): boolean => {
    const status = statusOf(a)
    if (needle && !`${a.job} ${a.company} ${a.location} ${status.label}`.toLowerCase().includes(needle)) return false
    if (companies.size && !companies.has(a.company)) return false
    if (cities.size && !cities.has(a.location)) return false
    if (statuses.size && !statuses.has(status.label)) return false
    return true
  }

  const hits = applications.filter(matches)
  const found = hits.length
  const pages = Math.max(1, Math.ceil(found / PER_PAGE))
  const current = Math.min(page, pages)
  const from = (current - 1) * PER_PAGE
  const onPage = new Set(hits.slice(from, from + PER_PAGE).map((a) => a.id))

  const goTo = (next: number) => {
    const wanted = Math.min(pages, Math.max(1, next))
    if (wanted === current) return

    if (typeof window === 'undefined' || window.scrollY < 4 || !lenis) {
      setPage(wanted)
      return
    }

    lenis.scrollTo(0, { onComplete: () => setPage(wanted) })
  }

  const clearAll = () => {
    setPage(1)
    setQuery('')
    setCompanies(new Set())
    setCities(new Set())
    setStatuses(new Set())
  }

  return (
    <div className="-mb-20 w-full px-6 sm:px-10 lg:px-14">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 pb-8">
        <div>
          <h1
            className="hero-in flex flex-wrap items-baseline gap-x-4 text-[2.75rem] leading-[1.05] font-bold tracking-[-0.038em] text-ink sm:text-5xl lg:text-6xl"
            style={{ '--i': 0 } as CSSProperties}
          >
            Applications
            <span className="text-3xl font-semibold text-ink-faint tabular-nums sm:text-4xl">{applications.length}</span>
          </h1>
          <p className="hero-in mt-3.5 text-[17px] text-ink-muted" style={{ '--i': 1 } as CSSProperties}>
            {applications.length
              ? `${moving} still moving. Newest first, and we tell you the moment one changes.`
              : 'Everything you apply to lands here, with the stage it has reached.'}
          </p>
        </div>

        {applications.length ? (
          <div className="hero-in flex w-full items-center gap-3 sm:w-auto" style={{ '--i': 1 } as CSSProperties}>
            <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
              <Icon name="search" size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                aria-label="Search applications"
                value={query}
                placeholder="Search Applications"
                onChange={(event) => {
                  setQuery(capitalise(event.target.value))
                  setPage(1)
                }}
                className={`${panelInputClass} ps-11 pe-11`}
              />
              <div className="unfold absolute end-2 top-1/2 -translate-y-1/2" data-open={query ? '' : undefined}>
                <div>
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-faint transition-[color,background-color,scale] duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:bg-[var(--hover-wash)] hover:text-ink active:scale-90"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-expanded={filtering}
              aria-label={filtering ? 'Hide filters' : 'Show filters'}
              onClick={() => setFiltering((was) => !was)}
              className={`relative inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl border transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] ${
                filtering || picked ? 'border-ink bg-ink text-paper' : 'border-hairline text-ink hover:border-ink'
              }`}
            >
              <Icon
                name="filter_list"
                size={22}
                className={`absolute transition-all duration-200 ease-[var(--ease-out)] ${filtering ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}
              />
              <Icon
                name="filter_list_off"
                size={22}
                className={`absolute transition-all duration-200 ease-[var(--ease-out)] ${filtering ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
              />
            </button>
          </div>
        ) : null}
      </header>

      {applications.length ? (
        <div className="unfold" data-open={filtering ? '' : undefined}>
          <div>
            <div className="grid gap-7 border-t border-hairline py-8">
              <Group title="Company" options={unique(applications.map((a) => a.company))} picked={companies} onToggle={toggle(companies, setCompanies)} />
              <Group title="Location" options={unique(applications.map((a) => a.location))} picked={cities} onToggle={toggle(cities, setCities)} />
              <Group title="Status" options={unique(applications.map((a) => statusOf(a).label))} picked={statuses} onToggle={toggle(statuses, setStatuses)} />
              <div className="unfold" data-open={picked ? '' : undefined}>
                <div>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex h-10 cursor-pointer items-center rounded-full border border-hairline px-5 text-sm font-semibold text-ink-muted transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:border-ink hover:text-ink"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {applications.length === 0 ? (
        <div
          className="hero-in flex flex-col items-center justify-center border-t border-hairline py-24 text-center"
          style={{ '--i': 2 } as CSSProperties}
        >
          <Icon name="work" size={32} className="text-ink-faint" />
          <p className="mt-4 text-base text-ink-muted">Finish your profile first, then apply to anything on the site.</p>
          <Link
            to="/profile"
            className="mt-6 inline-flex h-11 cursor-pointer items-center rounded-full border border-hairline px-6 text-[15px] font-semibold text-ink transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:border-ink"
          >
            Go to your profile
          </Link>
        </div>
      ) : (
        <>
          <ul className="grid">
            {applications.map((app, i) => (
              <Row
                key={app.id}
                app={app}
                index={i + 2}
                match={onPage.has(app.id)}
                onWithdraw={() => {
                  setPending(app)
                  setConfirming(true)
                }}
              />
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-8">
            <p className="text-sm text-ink-muted tabular-nums">
              Showing {found ? from + 1 : 0}&ndash;{Math.min(from + PER_PAGE, found)} of {found}
            </p>
            <div className="flex items-center gap-2">
              <div className="unfold-x" data-open={current > 1 ? '' : undefined} inert={current <= 1}>
                <div>
                  <button type="button" onClick={() => goTo(current - 1)} className={PAGE_BTN}>
                    Previous
                  </button>
                </div>
              </div>
              <div className="unfold-x" data-open={current < pages ? '' : undefined} inert={current >= pages}>
                <div>
                  <button type="button" onClick={() => goTo(current + 1)} className={PAGE_BTN}>
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="unfold" data-open={found === 0 ? '' : undefined}>
            <div>
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Icon name="search" size={32} className="text-ink-faint" />
                <p className="mt-4 text-base text-ink-muted">Nothing matches what you are looking for.</p>
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-6 inline-flex h-11 cursor-pointer items-center rounded-full border border-hairline px-6 text-[15px] font-semibold text-ink transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:border-ink"
                >
                  Clear Search
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <WarningModal
        open={confirming}
        icon="undo"
        title="Withdraw this application?"
        body={pending ? `${capitalise(pending.job)} at ${capitalise(pending.company)} comes off your list, and they stop considering you for it.` : ''}
        confirmLabel="Withdraw"
        onConfirm={() => {
          if (pending) withdrawApplication(pending.id)
          setConfirming(false)
        }}
        onClose={() => setConfirming(false)}
      />
    </div>
  )
}

export default ApplicationsPage
