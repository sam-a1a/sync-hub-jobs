import Icon from '../Icon'
import { completionPercent, type Requirement } from '../../lib/profile/completeness'
import { PHONE_COUNTRIES, locationLabel, roleLabel } from '../../lib/profile/reference'
import type { Profile } from '../../lib/profile/types'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
}

const RADIUS = 17
const CIRC = 2 * Math.PI * RADIUS

export function IdCard({ profile, email, missing, large = false }: { profile: Profile; email: string; missing: readonly Requirement[]; large?: boolean }) {
  const role = roleLabel(profile.canonical_role_key)
  const location = locationLabel(profile.location_key)
  const dial = PHONE_COUNTRIES.find((c) => c.code === profile.phone_country)?.dial ?? ''
  const percent = completionPercent(missing)
  const links = [
    { label: 'LinkedIn', href: profile.linkedin_url },
    { label: 'GitHub', href: profile.github_url },
    { label: 'Portfolio', href: profile.portfolio_url },
  ].filter((l) => l.href.trim() !== '')

  return (
    <div className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br from-teal-600 to-teal-900 text-white ring-1 ring-white/10 ${large ? 'p-7 sm:p-8' : 'p-5'}`}>
      <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex items-start gap-4">
        <span className={`flex shrink-0 items-center justify-center rounded-2xl bg-white/12 font-semibold tracking-[-0.02em] ring-1 ring-white/15 ${large ? 'size-16 text-2xl' : 'size-12 text-base'}`}>{initials(profile.full_name)}</span>
        <div className="min-w-0 flex-1">
          <p className={`truncate font-semibold tracking-[-0.025em] ${large ? 'text-2xl' : 'text-lg'}`}>{profile.full_name.trim() || <span className="text-white/50">Your name</span>}</p>
          <p className="mt-0.5 truncate text-sm text-white/75">{[role, profile.headline.trim()].filter(Boolean).join(' · ') || 'What you do'}</p>
        </div>
        <svg viewBox="0 0 40 40" className="size-10 shrink-0" role="img" aria-label={`${percent}% complete`}>
          <circle cx="20" cy="20" r={RADIUS} fill="none" strokeWidth="3" className="stroke-white/20" />
          <circle cx="20" cy="20" r={RADIUS} fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - percent / 100)} transform="rotate(-90 20 20)" className="stroke-white transition-[stroke-dashoffset] duration-700 ease-[var(--ease-glide)]" />
          <text x="20" y="20" textAnchor="middle" dominantBaseline="central" className="fill-white text-[9px] font-semibold">{percent}</text>
        </svg>
      </div>
      <dl className="relative mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/70">
        <div className="flex items-center gap-1.5"><Icon name="location_on" size={15} /><dd>{location || 'Location'}</dd></div>
        <div className="flex items-center gap-1.5"><Icon name="call" size={15} /><dd>{profile.phone.trim() ? `${dial} ${profile.phone.trim()}` : 'Phone'}</dd></div>
        <div className="flex items-center gap-1.5"><Icon name="mail" size={15} /><dd className="truncate">{email}</dd></div>
      </dl>
      {links.length ? (
        <ul className="relative mt-4 flex flex-wrap gap-1.5">
          {links.map((l) => (
            <li key={l.label} className="chip-in">
              <a href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/20 px-2.5 py-1 text-xs font-medium transition-colors duration-[var(--hover-fade)] hover:border-white/60">
                <Icon name="link" size={13} />
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
