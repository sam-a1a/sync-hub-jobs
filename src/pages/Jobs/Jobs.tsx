import { useEffect, useState, type CSSProperties } from 'react'
import { useLenis } from 'lenis/react'
import { Link } from 'react-router'
import BrandIcon from '../../components/BrandIcon/BrandIcon'
import Icon from '../../components/Icon'
import { panelInputClass } from '../../components/ui/Field'
import { capitalise } from '../../lib/format'
import { SAMPLE_JOBS, type Job } from '../../lib/jobs'
import { useStudio } from '../../lib/profile/store'
import { statusOf } from '../../lib/status'
import { timeAgo } from '../../lib/relative-time'
import { BRANDS, CHIP, PILL, initials, unique } from './parts'

let resume: number | null = null

const RANGES: { key: string; days: number }[] = [
  { key: 'Today', days: 1 },
  { key: 'This Week', days: 7 },
  { key: 'This Month', days: 31 },
  { key: 'This Year', days: 365 },
]

function within(posted: string, key: string): boolean {
  const range = RANGES.find((r) => r.key === key)
  if (!range) return true
  return Date.now() - new Date(posted).getTime() <= range.days * 86400000
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

function Row({ job, index, match, tone, label }: { job: Job; index: number; match: boolean; tone?: string; label?: string }) {
  const brand = BRANDS[job.company.trim().toLowerCase()]

  return (
    <li className="unfold" data-open={match ? '' : undefined}>
      <div>
        <Link
          to={`/jobs/${job.id}`}
          onClick={() => {
            resume = window.scrollY
          }}
          className="hero-in group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-4 border-t border-hairline py-8 sm:gap-x-8 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:py-9"
          style={{ '--i': Math.min(index, 6) } as CSSProperties}
        >
          <span
            aria-hidden="true"
            className="col-start-1 row-start-1 inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--hover-wash)] text-[13px] font-semibold text-ink"
          >
            {brand ? <BrandIcon name={brand} size={20} colour /> : initials(job.company)}
          </span>

          <div className="col-start-2 row-start-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="truncate text-base font-medium tracking-[-0.014em] text-ink transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] group-hover:text-teal-600 dark:group-hover:text-teal-400">
                {capitalise(job.title)}
              </p>
              {label ? (
                <span className={`${PILL} ${tone ?? ''}`}>
                  {label === 'Applied' ? <Icon name="check" size={14} /> : null}
                  {label}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className={PILL}>{capitalise(job.company)}</span>
              <span className={PILL}>{capitalise(job.location)}</span>
              <span className={PILL}>{job.mode}</span>
              <span className={PILL}>{job.type}</span>
            </div>
          </div>

          <p className="col-start-2 row-start-2 text-sm whitespace-nowrap text-ink-faint lg:col-start-3 lg:row-start-1">
            {capitalise(timeAgo(job.posted_at))}
          </p>
        </Link>
      </div>
    </li>
  )
}

function JobsPage() {
  const jobs = SAMPLE_JOBS
  const { applications } = useStudio()
  const lenis = useLenis()
  const [query, setQuery] = useState('')
  const [filtering, setFiltering] = useState(false)
  const [locations, setLocations] = useState<Set<string>>(new Set())
  const [modes, setModes] = useState<Set<string>>(new Set())
  const [types, setTypes] = useState<Set<string>>(new Set())
  const [posted, setPosted] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (resume === null) return
    const y = resume
    resume = null
    const frame = requestAnimationFrame(() => {
      if (lenis) lenis.scrollTo(y, { immediate: true })
      else window.scrollTo(0, y)
    })
    return () => cancelAnimationFrame(frame)
  }, [lenis])

  const needle = query.trim().toLowerCase()
  const picked = locations.size + modes.size + types.size + posted.size

  const toggle = (set: Set<string>, apply: (next: Set<string>) => void) => (value: string) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    apply(next)
  }

  const matches = (job: Job): boolean => {
    if (needle && !`${job.title} ${job.company} ${job.location} ${job.mode} ${job.type}`.toLowerCase().includes(needle)) return false
    if (locations.size && !locations.has(job.location)) return false
    if (modes.size && !modes.has(job.mode)) return false
    if (types.size && !types.has(job.type)) return false
    if (posted.size && ![...posted].some((key) => within(job.posted_at, key))) return false
    return true
  }

  const applied = (job: Job) => {
    const application = applications.find((a) => a.id === `app_${job.id}`)
    if (!application) return undefined
    const status = statusOf(application)
    return status.key === 'withdrawn' ? undefined : { label: status.key === 'received' ? 'Applied' : status.label, tone: status.tone }
  }

  const found = jobs.filter(matches).length

  const clearAll = () => {
    setQuery('')
    setLocations(new Set())
    setModes(new Set())
    setTypes(new Set())
    setPosted(new Set())
  }

  return (
    <div className="-mb-20 w-full px-6 sm:px-10 lg:px-14">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 pb-8">
        <div>
          <h1
            className="hero-in flex flex-wrap items-baseline gap-x-4 text-[2.75rem] leading-[1.05] font-bold tracking-[-0.038em] text-ink sm:text-5xl lg:text-6xl"
            style={{ '--i': 0 } as CSSProperties}
          >
            Jobs
            <span className="text-3xl font-semibold text-ink-faint tabular-nums sm:text-4xl">{jobs.length}</span>
          </h1>
          <p className="hero-in mt-3.5 text-[17px] text-ink-muted" style={{ '--i': 1 } as CSSProperties}>
            Open roles across Syria, newest first.
          </p>
        </div>

        <div className="hero-in flex w-full items-center gap-3 sm:w-auto" style={{ '--i': 1 } as CSSProperties}>
          <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
            <Icon name="search" size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              aria-label="Search jobs"
              value={query}
              placeholder="Search Jobs"
              onChange={(event) => setQuery(capitalise(event.target.value))}
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
      </header>

      <div className="unfold" data-open={filtering ? '' : undefined}>
        <div>
          <div className="grid gap-7 border-t border-hairline py-8">
            <Group title="Location" options={unique(jobs.map((j) => j.location))} picked={locations} onToggle={toggle(locations, setLocations)} />
            <Group title="Work mode" options={unique(jobs.map((j) => j.mode))} picked={modes} onToggle={toggle(modes, setModes)} />
            <Group title="Type" options={unique(jobs.map((j) => j.type))} picked={types} onToggle={toggle(types, setTypes)} />
            <Group title="Posted" options={RANGES.map((r) => r.key)} picked={posted} onToggle={toggle(posted, setPosted)} />
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

      <ul className="grid">
        {jobs.map((job, i) => (
          <Row
            key={job.id}
            job={job}
            index={i + 2}
            match={matches(job)}
            tone={applied(job)?.tone}
            label={applied(job)?.label}
          />
        ))}
      </ul>

      <div className="unfold" data-open={found === 0 ? '' : undefined}>
        <div>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Icon name="search" size={32} className="text-ink-faint" />
            <p className="mt-4 text-base text-ink-muted">No role matches what you are looking for.</p>
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
    </div>
  )
}

export default JobsPage
