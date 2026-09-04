import type { Profile } from './types'

export const REQUIREMENTS = ['cv', 'full_name', 'phone', 'headline', 'location', 'canonical_role', 'summary', 'education', 'language'] as const

export type Requirement = (typeof REQUIREMENTS)[number]

export type StageKey = 'start' | 'found' | 'you' | 'work' | 'school' | 'skills' | 'languages' | 'links' | 'ready'

export const REQUIREMENT_PLACES: Record<Requirement, { label: string; stage: StageKey }> = {
  cv: { label: 'A CV, read', stage: 'start' },
  full_name: { label: 'Your name', stage: 'you' },
  phone: { label: 'Phone', stage: 'you' },
  headline: { label: 'Headline', stage: 'you' },
  location: { label: 'Location', stage: 'you' },
  canonical_role: { label: 'What you do', stage: 'you' },
  summary: { label: 'Summary', stage: 'you' },
  education: { label: 'Education', stage: 'school' },
  language: { label: 'A language', stage: 'languages' },
}

const said = (value: string): boolean => value.trim() !== ''

export function missingRequirements(profile: Profile, hasReadCv: boolean): Requirement[] {
  const met: Record<Requirement, boolean> = {
    cv: hasReadCv,
    full_name: said(profile.full_name),
    phone: said(profile.phone) && said(profile.phone_country),
    headline: said(profile.headline),
    location: said(profile.location_key),
    canonical_role: said(profile.canonical_role_key),
    summary: said(profile.summary),
    education: profile.educations.length > 0,
    language: profile.languages.length > 0,
  }
  return REQUIREMENTS.filter((requirement) => !met[requirement])
}

export function completionPercent(missing: readonly Requirement[]): number {
  const total = REQUIREMENTS.length
  const met = total - missing.length
  return Math.floor((met * 100 + Math.floor(total / 2)) / total)
}

export function inWords(items: readonly string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function totalExperience(profile: Profile): { years: number; months: number } | null {
  const now = new Date()
  let months = 0
  for (const job of profile.experiences) {
    if (job.start_year === null) continue
    const start = job.start_year * 12 + ((job.start_month ?? 1) - 1)
    const end = job.is_current ? now.getFullYear() * 12 + now.getMonth() : job.end_year === null ? null : job.end_year * 12 + ((job.end_month ?? 12) - 1)
    if (end === null) continue
    months += Math.max(0, end - start + 1)
  }
  if (months === 0) return null
  return { years: Math.floor(months / 12), months: months % 12 }
}

export function experienceLabel(profile: Profile): string | null {
  const total = totalExperience(profile)
  if (!total) return null
  const parts = [total.years ? `${total.years} ${total.years === 1 ? 'yr' : 'yrs'}` : '', total.months ? `${total.months} mo` : ''].filter(Boolean)
  return parts.join(' ')
}
