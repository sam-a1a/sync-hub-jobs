import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import BrandIcon from '../../components/BrandIcon/BrandIcon'
import Icon from '../../components/Icon'
import WarningModal from '../../components/WarningModal'
import { capitalise } from '../../lib/format'
import { SAMPLE_JOBS, type Ask } from '../../lib/jobs'
import { applyToJob, useStudio, withdrawApplication } from '../../lib/profile/store'
import { statusOf } from '../../lib/status'
import { timeAgo } from '../../lib/relative-time'
import { BRANDS, CHIP, PILL, initials } from './parts'

const LEVELS = ['Required', 'Preferred', 'Optional']

const WIDEST_LEVEL = LEVELS.reduce((a, b) => (b.length > a.length ? b : a))

const LEVEL: Record<string, string> = {
  Required: 'border-transparent bg-brick text-white',
  Preferred: 'border-transparent bg-steel text-white',
  Optional: 'border-transparent bg-ink-muted text-white',
}

function Section({ title, children, index }: { title: string; children: ReactNode; index: number }) {
  return (
    <section
      className="hero-in grid gap-x-16 gap-y-6 border-t border-hairline py-12 lg:grid-cols-[20rem_minmax(0,1fr)] lg:py-14"
      style={{ '--i': index } as CSSProperties}
    >
      <h2 className="text-xs font-bold tracking-[0.14em] text-ink-faint uppercase">{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function Asks({ title, rows }: { title: string; rows: Ask[] }) {
  return (
    <div className="w-full">
      <p className="text-xs font-bold tracking-[0.14em] text-ink-faint uppercase">{title}</p>
      <ul className="mt-3 grid w-full">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-6 border-t border-hairline py-3.5">
            <span className="text-base text-ink">{row.name}</span>
            <span className={`${PILL} ${LEVEL[row.level] ?? ''}`}>
              {LEVEL[row.level] ? (
                <span className="grid">
                  <span aria-hidden="true" className="invisible col-start-1 row-start-1">
                    {WIDEST_LEVEL}
                  </span>
                  <span className="col-start-1 row-start-1">{row.level}</span>
                </span>
              ) : (
                row.level
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function JobDetailPage() {
  const { jobId } = useParams()
  const { applications } = useStudio()
  const [applying, setApplying] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [sectioned, setSectioned] = useState(false)
  const [open, setOpen] = useState<string | null>('about')

  const job = SAMPLE_JOBS.find((j) => j.id === jobId)
  if (!job) return <Navigate to="/jobs" replace />

  const brand = BRANDS[job.company.trim().toLowerCase()]
  const application = applications.find((a) => a.id === `app_${job.id}`)
  const status = application ? statusOf(application) : null
  const live = status !== null && status.key !== 'withdrawn'

  const apply = () => {
    setApplying(true)
    applyToJob({ id: job.id, title: job.title, company: job.company, location: job.location })
    window.setTimeout(() => setApplying(false), 400)
  }

  const parts = [
    {
      key: 'about',
      title: 'About',
      body: (
        <div className="grid gap-5">
          {job.about.map((line) => (
            <p key={line} className="max-w-[68ch] text-[17px] leading-relaxed text-ink-muted">
              {line}
            </p>
          ))}
        </div>
      ),
    },
    {
      key: 'asks',
      title: 'Requirements',
      body: (
        <>
          <p className="text-base text-ink">{job.years}</p>
          <div className="mt-8 grid w-full gap-8">
            <Asks title="Skills" rows={job.skills} />
            <Asks title="Languages" rows={job.languages} />
          </div>
        </>
      ),
    },
    {
      key: 'questions',
      title: 'Questions',
      body: (
        <ul className="grid w-full gap-5">
          {job.questions.map((question) => (
            <li key={question.text}>
              <p className="text-base text-ink">{question.text}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-3 [.chip-body_&]:justify-center">
                <span className={PILL}>{question.kind}</span>
                <span className={`${PILL} ${LEVEL[question.required ? 'Required' : 'Optional']}`}>
                  <span className="grid">
                    <span aria-hidden="true" className="invisible col-start-1 row-start-1">
                      {WIDEST_LEVEL}
                    </span>
                    <span className="col-start-1 row-start-1">{question.required ? 'Required' : 'Optional'}</span>
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      ),
    },
  ]

  return (
    <div className="-mb-20 w-full px-6 sm:px-10 lg:px-14">
      <Link
        to="/jobs"
        className="hero-in inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-muted transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:text-ink"
        style={{ '--i': 0 } as CSSProperties}
      >
        <Icon name="arrow_forward" size={16} className="rotate-180" />
        Back to Jobs
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-8 pt-8 pb-10">
        <div className="min-w-0">
          <div className="hero-in flex items-center gap-4" style={{ '--i': 0 } as CSSProperties}>
            <span
              aria-hidden="true"
              className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--hover-wash)] text-sm font-semibold text-ink"
            >
              {brand ? <BrandIcon name={brand} size={26} colour /> : initials(job.company)}
            </span>
            <p className="text-sm text-ink-faint">Posted {capitalise(timeAgo(job.posted_at))}</p>
          </div>

          <h1
            className="hero-in mt-6 text-[2.75rem] leading-[1.05] font-bold tracking-[-0.038em] text-balance text-ink sm:text-5xl lg:text-6xl"
            style={{ '--i': 1 } as CSSProperties}
          >
            {capitalise(job.title)}
          </h1>

          <div className="hero-in mt-5 flex flex-wrap items-center gap-3" style={{ '--i': 2 } as CSSProperties}>
            <span className={PILL}>{capitalise(job.company)}</span>
            <span className={PILL}>{capitalise(job.location)}</span>
            <span className={PILL}>{job.mode}</span>
            <span className={PILL}>{job.type}</span>
            {status ? (
              <span className={`${PILL} ${status.tone}`}>
                {status.key === 'received' ? <Icon name="check" size={14} /> : null}
                {status.key === 'received' ? 'Applied' : status.label}
              </span>
            ) : null}
          </div>
        </div>

        <div className="hero-in flex flex-wrap items-center gap-3" style={{ '--i': 2 } as CSSProperties}>
          <button
            type="button"
            aria-pressed={sectioned}
            aria-label={sectioned ? 'Show everything at once' : 'Show one section at a time'}
            onClick={() => {
              setSectioned((was) => !was)
              setOpen('about')
            }}
            className={`inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl border transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:[--symbol-fill:1] ${
              sectioned ? 'border-ink bg-ink text-paper [--symbol-fill:1]' : 'border-hairline text-ink [--symbol-fill:0] hover:border-ink'
            }`}
          >
            <Icon name="crop_21_9" size={22} />
          </button>
          {live && !status.done ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="group/w inline-flex h-12 cursor-pointer items-center justify-center rounded-full border border-hairline px-6 text-[15px] font-semibold whitespace-nowrap text-ink-muted transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:border-brick hover:text-brick"
            >
              Withdraw
              <span className="grid grid-cols-[0fr] items-center transition-[grid-template-columns] duration-[var(--hover-fade)] ease-[var(--ease-standard)] group-hover/w:grid-cols-[1fr]">
                <span className="flex min-w-0 items-center overflow-hidden leading-none">
                  <Icon name="close_small" size={20} className="ms-2" />
                </span>
              </span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={apply}
            disabled={live}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 text-[15px] font-semibold whitespace-nowrap transition-[background-color,color,border-color] duration-[var(--hover-fade)] ease-[var(--ease-standard)] ${
              live
                ? 'cursor-default border border-emerald/40 bg-transparent text-emerald'
                : 'cursor-pointer border border-ink bg-ink text-paper hover:bg-transparent hover:text-ink'
            }`}
          >
            {live ? <Icon name="check" size={18} /> : null}
            {live ? 'Applied' : applying ? 'Sending…' : status ? 'Apply Again' : 'Apply'}
          </button>
        </div>
      </header>

      <div className="unfold" data-open={sectioned ? undefined : ''}>
        <div>
          {parts.map((part, i) => (
            <Section key={part.key} title={part.title} index={3 + i}>
              {part.body}
            </Section>
          ))}
        </div>
      </div>

      <div className="unfold" data-open={sectioned ? '' : undefined}>
        <div>
          <div className="border-t border-hairline py-8">
            <div className="flex flex-wrap justify-center gap-2">
              {parts.map((part) => {
                const on = open === part.key
                return (
                  <button
                    key={part.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setOpen(on ? null : part.key)}
                    className={`${CHIP} ${on ? 'border-transparent bg-ink text-paper' : 'border-hairline text-ink-muted hover:border-ink hover:text-ink'}`}
                  >
                    {part.title}
                  </button>
                )
              })}
            </div>
            {parts.map((part) => (
              <div key={part.key} className="unfold" data-open={open === part.key ? '' : undefined}>
                <div>
                  <div className="chip-body flex flex-col items-center pt-8 text-center">{part.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <WarningModal
        open={confirming}
        icon="undo"
        title="Withdraw this application?"
        body={`${capitalise(job.title)} at ${capitalise(job.company)} comes off your list, and they stop considering you for it.`}
        confirmLabel="Withdraw"
        onConfirm={() => {
          if (application) withdrawApplication(application.id)
          setConfirming(false)
        }}
        onClose={() => setConfirming(false)}
      />
    </div>
  )
}

export default JobDetailPage
