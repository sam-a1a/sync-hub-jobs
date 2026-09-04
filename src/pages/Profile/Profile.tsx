import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Icon, { type IconName } from '../../components/Icon'
import { IdCard } from '../../components/Studio/IdCard'
import { Reading } from '../../components/Studio/Reading'
import { Card, Stage } from '../../components/Studio/Stage'
import { Track, type Stop } from '../../components/Studio/Track'
import { Tray } from '../../components/Studio/Tray'
import { Chip, GlyphButton, NumberInput, Picker, Pill, Segmented, TextArea, TextInput, Toggle, fieldClass } from '../../components/Studio/controls'
import { firstName, useAccount } from '../../lib/account'
import { experienceLabel, missingRequirements, REQUIREMENT_PLACES, type StageKey } from '../../lib/profile/completeness'
import { LANGUAGES, LOCATIONS, MONTHS, PHONE_COUNTRIES, PROFICIENCIES, ROLES, SKILLS, languageName, locationLabel, roleLabel } from '../../lib/profile/reference'
import { deleteCv, draftFrom, hasReadCv, isParsing, makeCurrent, markBuilt, setProfile, uploadCv, useStudio } from '../../lib/profile/store'
import { EMPTY_EDUCATION, EMPTY_EXPERIENCE, type Cv, type Draft, type Education, type Experience, type Profile } from '../../lib/profile/types'

type Section = 'you' | 'work' | 'school' | 'skills' | 'languages' | 'links'

const SECTIONS: { key: Section; label: string; icon: IconName }[] = [
  { key: 'you', label: 'You', icon: 'person' },
  { key: 'work', label: 'Work', icon: 'work' },
  { key: 'school', label: 'School', icon: 'school' },
  { key: 'skills', label: 'Skills', icon: 'auto_awesome' },
  { key: 'languages', label: 'Languages', icon: 'translate' },
  { key: 'links', label: 'Links', icon: 'link' },
]

const ORDER: StageKey[] = ['start', 'found', 'you', 'work', 'school', 'skills', 'languages', 'links', 'ready']
const STOP_KEYS: StageKey[] = ['start', 'you', 'work', 'school', 'skills', 'languages', 'links', 'ready']

const said = (v: string): boolean => v.trim() !== ''

function sectionDone(profile: Profile, section: Section): boolean {
  switch (section) {
    case 'you':
      return [profile.full_name, profile.headline, profile.canonical_role_key, profile.location_key, profile.phone].every(said)
    case 'work':
      return profile.experiences.some((j) => said(j.job_title))
    case 'school':
      return profile.educations.some((s) => said(s.institution))
    case 'skills':
      return profile.skills.length + profile.unmapped_skills.length > 0
    case 'languages':
      return profile.languages.length > 0
    case 'links':
      return [profile.linkedin_url, profile.github_url, profile.portfolio_url].some(said)
  }
}

function summaryOf(profile: Profile, section: Section): string {
  switch (section) {
    case 'you':
      return [profile.full_name, roleLabel(profile.canonical_role_key), locationLabel(profile.location_key)].filter(said).join(' · ') || 'Name, headline, where you are'
    case 'work': {
      const n = profile.experiences.length
      const total = experienceLabel(profile)
      return n ? `${n} ${n === 1 ? 'role' : 'roles'}${total ? ` · ${total}` : ''}` : 'Where you have worked'
    }
    case 'school':
      return profile.educations[0]?.institution || 'Where you studied'
    case 'skills': {
      const n = profile.skills.length + profile.unmapped_skills.length
      return n ? profile.skills.slice(0, 4).join(', ') + (n > 4 ? ` +${n - 4}` : '') : 'What you are good at'
    }
    case 'languages':
      return profile.languages.length ? profile.languages.map((l) => languageName(l.code)).join(', ') : 'Which languages you speak'
    case 'links':
      return [profile.linkedin_url && 'LinkedIn', profile.github_url && 'GitHub', profile.portfolio_url && 'Portfolio'].filter(Boolean).join(', ') || 'Where to find you'
  }
}

function applyDraft(current: Profile, draft: Draft, use: Record<Section, boolean>): Profile {
  return {
    ...current,
    ...(use.you
      ? { full_name: draft.full_name, headline: draft.headline, summary: draft.summary, canonical_role_key: draft.canonical_role_key, location_key: current.location_key || draft.location_key, phone: draft.phone, phone_country: draft.phone_country }
      : {}),
    ...(use.work ? { experiences: draft.experiences } : {}),
    ...(use.school ? { educations: draft.educations } : {}),
    ...(use.skills ? { skills: draft.skills, unmapped_skills: draft.unmapped_skills } : {}),
    ...(use.languages ? { languages: draft.languages } : {}),
    ...(use.links ? { linkedin_url: draft.linkedin_url, github_url: draft.github_url, portfolio_url: draft.portfolio_url } : {}),
  }
}

const MONTH_OPTIONS = MONTHS.map((m, i) => ({ key: String(i + 1), label: m }))
const ROLE_OPTIONS = ROLES.map((r) => ({ key: r.key, label: r.label }))
const LOCATION_OPTIONS = LOCATIONS.map((l) => ({ key: l.key, label: l.label }))
const COUNTRY_OPTIONS = PHONE_COUNTRIES.map((c) => ({ key: c.code, label: c.name, meta: c.dial }))
const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ key: l.code, label: l.name }))
const PROFICIENCY_OPTIONS = PROFICIENCIES.map((p) => ({ key: p.key, label: p.label }))

function ProfilePage() {
  const account = useAccount()
  const { profile: stored, cvs, built } = useStudio()
  const name = account ? firstName(account) : 'there'
  const email = account?.email ?? ''

  const [stage, setStage] = useState<StageKey>('start')
  const [dir, setDir] = useState<'forward' | 'back'>('forward')
  const [values, setValues] = useState<Profile>(stored)
  const [reading, setReading] = useState<Cv | null>(null)
  const [found, setFound] = useState<{ cv: Cv; draft: Draft; use: Record<Section, boolean> } | null>(null)
  const [lit, setLit] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [fresh, setFresh] = useState(false)
  const landing = useRef(new Set<string>())
  const skipSave = useRef(true)

  const patch = useCallback((change: Partial<Profile>) => setValues((v) => ({ ...v, ...change })), [])
  const missing = useMemo(() => missingRequirements(values, hasReadCv(cvs)), [values, cvs])
  const complete = missing.length === 0

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    if (JSON.stringify(values) === JSON.stringify(stored)) return
    const pending = window.setTimeout(() => setSaved('saving'), 0)
    const id = window.setTimeout(() => {
      setProfile(values)
      setSaved('saved')
      setFresh(true)
      window.setTimeout(() => setFresh(false), 800)
      window.setTimeout(() => setSaved('idle'), 2400)
    }, 600)
    return () => {
      window.clearTimeout(pending)
      window.clearTimeout(id)
    }
  }, [values, stored])

  const go = useCallback(
    (next: StageKey) => {
      setDir(ORDER.indexOf(next) >= ORDER.indexOf(stage) ? 'forward' : 'back')
      setStage(next)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [stage],
  )

  useEffect(() => {
    for (const cv of cvs) if (isParsing(cv)) landing.current.add(cv.id)
    if (reading || found) return
    const landed = cvs.find((cv) => landing.current.has(cv.id) && !isParsing(cv))
    if (!landed) return
    landing.current.delete(landed.id)
    if (landed.parsing_status !== 'ready') return
    draftFrom(landed.id, account?.name || values.full_name || 'You')
      .then((draft) => {
        setFound({ cv: landed, draft, use: { you: true, work: true, school: true, skills: true, languages: true, links: true } })
        go('found')
      })
      .catch(() => undefined)
  }, [cvs, reading, found, account, values.full_name, go])

  useEffect(() => {
    if (stage !== 'found') return
    const timers = SECTIONS.map((s, i) => window.setTimeout(() => setLit((l) => new Set(l).add(s.key)), 520 + i * 160))
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      setLit(new Set())
    }
  }, [stage])

  const readingLive = reading ? (cvs.find((c) => c.id === reading.id) ?? reading) : null
  const overview = built && sectionDone(values, 'you')
  const stops: Stop[] = STOP_KEYS.map((key) => ({
    key,
    label: key === 'start' ? 'Your CV' : key === 'ready' ? 'Ready' : SECTIONS.find((s) => s.key === key)?.label ?? key,
    done: key === 'start' ? hasReadCv(cvs) : key === 'ready' ? built && complete : sectionDone(values, key as Section),
  }))
  const current = STOP_KEYS.indexOf(stage === 'found' ? 'start' : stage)
  const reachable = built ? STOP_KEYS.length - 1 : Math.max(current, STOP_KEYS.findIndex((k) => k !== 'start' && k !== 'ready' && !sectionDone(values, k as Section)))
  const stepIndex = SECTIONS.findIndex((s) => s.key === stage)

  const canContinue = (): boolean => {
    if (stage === 'you') return [values.full_name, values.headline, values.canonical_role_key, values.location_key, values.phone].every(said)
    if (stage === 'school') return values.educations.some((s) => said(s.institution))
    if (stage === 'languages') return values.languages.length > 0
    return true
  }

  const next = () => {
    const i = ORDER.indexOf(stage)
    go(ORDER[Math.min(ORDER.length - 1, i + 1 + (ORDER[i + 1] === 'found' ? 1 : 0))])
  }
  const back = () => {
    const i = ORDER.indexOf(stage)
    go(ORDER[Math.max(0, i - 1 - (ORDER[i - 1] === 'found' ? 1 : 0))])
  }

  const eyebrow = stepIndex >= 0 ? `Step ${stepIndex + 1} of ${SECTIONS.length}` : ''

  return (
    <div className="mx-auto w-full max-w-[1500px] px-5 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <Track stops={stops} current={current} reachable={reachable} lit={lit} onGo={(i) => go(STOP_KEYS[i])} />
        </aside>

        <main className="min-w-0">
          {stage === 'start' && !overview ? (
            <Stage stageKey="start" dir={dir} eyebrow="Let's begin" title={<>Hi {name}. Your profile starts with your CV.</>} lede="Drop it and SYNC AI reads it for you: every role, school and skill, in about a minute. You approve every word before anything is kept.">
              <div className="grid gap-5">
                <Tray cvs={cvs} onUpload={(file) => { const cv = uploadCv(file); landing.current.add(cv.id); setReading(cv) }} />
                <div className="flex items-center justify-between gap-4 px-1">
                  <p className="text-sm text-ink-muted">No CV to hand?</p>
                  <Pill tone="ghost" onClick={() => go('you')} icon="arrow_forward">
                    Build it by hand
                  </Pill>
                </div>
              </div>
            </Stage>
          ) : null}

          {stage === 'start' && overview ? (
            <Stage stageKey="overview" dir={dir} eyebrow="Your profile" title={<>Looking good, {name}.</>} lede={complete ? 'Everything a recruiter needs is here. Switch on Search when you are ready to be found.' : `${SECTIONS.filter((s) => sectionDone(values, s.key)).length} of ${SECTIONS.length} sections done. Finish the rest and you can apply.`} aside={<IdCard profile={values} email={email} missing={missing} />} wide>
              <div className="grid gap-4 sm:grid-cols-2">
                {SECTIONS.map((s, i) => {
                  const done = sectionDone(values, s.key)
                  return (
                    <button key={s.key} type="button" onClick={() => go(s.key)} className="studio-in group flex cursor-pointer items-start gap-4 rounded-[24px] bg-paper-raised/60 p-5 text-left ring-1 ring-hairline backdrop-blur-xl transition-[transform,box-shadow] duration-500 ease-[var(--ease-glide)] hover:-translate-y-0.5 hover:ring-teal-400/50" style={{ '--i': i } as CSSProperties}>
                      <span className={`mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full ${done ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400' : 'bg-paper text-ink-faint ring-1 ring-hairline'}`}>
                        <Icon name={s.icon} size={20} className="transition-transform duration-300 group-hover:[--symbol-fill:1]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-base font-semibold text-ink">
                          {s.label}
                          {done ? <Icon name="check_circle" size={16} className="text-teal-500 [--symbol-fill:1]" /> : null}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-ink-muted">{summaryOf(values, s.key)}</span>
                      </span>
                      <Icon name="edit" size={18} className="mt-1 text-ink-faint opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:[--symbol-fill:1]" />
                    </button>
                  )
                })}
                <div className="sm:col-span-2">
                  <Card index={6}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-ink">Your CVs</p>
                        <p className="text-sm text-ink-muted">The one marked current goes out with every application.</p>
                      </div>
                    </div>
                    <ul className="mt-4 grid gap-2">
                      {cvs.map((cv) => (
                        <li key={cv.id} className="row-in flex flex-wrap items-center gap-3 rounded-2xl bg-paper/60 px-4 py-3 ring-1 ring-hairline">
                          <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${cv.parsing_status === 'ready' ? 'bg-teal-400' : cv.parsing_status === 'failed' ? 'bg-brick' : 'reading-mark border-[1.5px] border-teal-400 border-t-transparent'}`} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{cv.display_name}</span>
                          {cv.is_current ? <Chip>Current</Chip> : null}
                          {cv.parsing_status === 'ready' && !cv.is_current ? <button type="button" onClick={() => makeCurrent(cv.id)} className="cursor-pointer text-xs font-medium text-teal-600 hover:underline dark:text-teal-400">Make current</button> : null}
                          {cv.parsing_status === 'failed' ? <span className="text-xs text-brick">Could not be read</span> : null}
                          {isParsing(cv) ? <span className="text-xs text-ink-muted">Reading…</span> : <GlyphButton label="Remove this CV" icon="delete" onClick={() => deleteCv(cv.id)} />}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4">
                      <Tray cvs={cvs} compact onUpload={(file) => { const cv = uploadCv(file); landing.current.add(cv.id); setReading(cv) }} />
                    </div>
                  </Card>
                </div>
              </div>
            </Stage>
          ) : null}

          {stage === 'found' && found ? (
            <Stage stageKey="found" dir={dir} eyebrow="SYNC AI" title="Here's what we found." lede={<>Everything below came from <span className="font-medium text-ink">{found.cv.display_name}</span>. Keep what fits. You can change any of it in the steps that follow.</>} wide>
              <div className="grid gap-4 sm:grid-cols-2">
                {SECTIONS.map((s, i) => {
                  const d = found.draft
                  const on = found.use[s.key]
                  const preview = summaryOf(d, s.key)
                  const count = s.key === 'work' ? d.experiences.length : s.key === 'school' ? d.educations.length : s.key === 'skills' ? d.skills.length + d.unmapped_skills.length : s.key === 'languages' ? d.languages.length : s.key === 'links' ? [d.linkedin_url, d.github_url, d.portfolio_url].filter(said).length : 1
                  return (
                    <div key={s.key} className={`found-in flex items-start gap-4 rounded-[24px] p-5 ring-1 backdrop-blur-xl transition-[opacity,box-shadow] duration-400 ${on ? 'bg-paper-raised/60 ring-hairline' : 'bg-paper-raised/30 opacity-60 ring-hairline/60'}`} style={{ '--i': i } as CSSProperties}>
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400">
                        <Icon name={s.icon} size={20} className="[--symbol-fill:1]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-baseline gap-2 text-base font-semibold text-ink">
                          {s.label}
                          <span className="text-xs font-medium text-ink-muted tabular-nums">{count} found</span>
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">{preview}</p>
                      </div>
                      <Toggle on={on} label={`Use ${s.label}`} onChange={(v) => setFound({ ...found, use: { ...found.use, [s.key]: v } })} />
                    </div>
                  )
                })}
              </div>
            </Stage>
          ) : null}

          {stage === 'you' ? (
            <Stage stageKey="you" dir={dir} eyebrow={eyebrow} title="Who you are." lede="The lines a recruiter reads first. Short and true beats long." aside={<IdCard profile={values} email={email} missing={missing} />}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="studio-in sm:col-span-2" style={{ '--i': 0 } as CSSProperties}>
                  <TextInput id="name" label="Full name" icon="person" value={values.full_name} onChange={(full_name) => patch({ full_name })} placeholder="As it appears on your ID" autoFocus />
                </div>
                <div className="studio-in sm:col-span-2" style={{ '--i': 1 } as CSSProperties}>
                  <TextInput id="headline" label="Headline" icon="badge" value={values.headline} onChange={(headline) => patch({ headline })} placeholder="One line on what you do and how" />
                </div>
                <div className="studio-in" style={{ '--i': 2 } as CSSProperties}>
                  <Picker id="role" label="What you do" icon="work" value={values.canonical_role_key} options={ROLE_OPTIONS} onChange={(canonical_role_key) => patch({ canonical_role_key })} placeholder="Pick the closest" />
                </div>
                <div className="studio-in" style={{ '--i': 3 } as CSSProperties}>
                  <Picker id="location" label="Where you are" icon="location_on" value={values.location_key} options={LOCATION_OPTIONS} onChange={(location_key) => patch({ location_key })} placeholder="Choose a place" />
                </div>
                <div className="studio-in grid grid-cols-[minmax(0,11rem)_1fr] gap-2 sm:col-span-2" style={{ '--i': 4 } as CSSProperties}>
                  <Picker id="phone-country" label="Country" value={values.phone_country} options={COUNTRY_OPTIONS} onChange={(phone_country) => patch({ phone_country })} />
                  <TextInput id="phone" label="Phone" icon="call" type="tel" value={values.phone} onChange={(phone) => patch({ phone })} placeholder="944 123 456" />
                </div>
                <div className="studio-in sm:col-span-2" style={{ '--i': 5 } as CSSProperties}>
                  <TextArea id="summary" label="Summary" value={values.summary} onChange={(summary) => patch({ summary })} rows={5} max={5000} placeholder="A short paragraph a recruiter reads before anything else." />
                </div>
              </div>
            </Stage>
          ) : null}

          {stage === 'work' ? (
            <Stage stageKey="work" dir={dir} eyebrow={eyebrow} title="Where you've worked." lede="Most recent first. Your total experience is worked out from these dates." aside={<Total profile={values} />}>
              <Timeline items={values.experiences} empty={EMPTY_EXPERIENCE} onChange={(experiences) => patch({ experiences })} addLabel="Add a role" emptyText="No roles yet. Add one, or go back and drop a CV." render={(job, update, id) => <JobFields job={job} update={update} id={id} />} head={(job) => ({ title: job.job_title || 'Untitled role', sub: job.company_name, when: job.start_year ? `${job.start_year} – ${job.is_current ? 'now' : (job.end_year ?? '')}` : '' })} />
            </Stage>
          ) : null}

          {stage === 'school' ? (
            <Stage stageKey="school" dir={dir} eyebrow={eyebrow} title="Where you studied." lede="A degree, a diploma, a bootcamp. One is enough to apply.">
              <Timeline items={values.educations} empty={EMPTY_EDUCATION} onChange={(educations) => patch({ educations })} addLabel="Add a school" emptyText="No education yet. One is needed to apply." render={(school, update, id) => <SchoolFields school={school} update={update} id={id} />} head={(school) => ({ title: school.institution || 'Untitled', sub: [school.degree, school.field_of_study].filter(said).join(' · '), when: school.graduation_year ? String(school.graduation_year) : '' })} />
            </Stage>
          ) : null}

          {stage === 'skills' ? (
            <Stage stageKey="skills" dir={dir} eyebrow={eyebrow} title="What you're good at." lede="Pick from the platform's list so screening can measure them. Anything else goes under Other.">
              <div className="grid gap-6">
                <Card index={0}>
                  <p className="text-sm font-medium text-ink-muted">Skills</p>
                  <SkillCloud values={values.skills} onChange={(skills) => patch({ skills })} suggestions={SKILLS} placeholder="Type to search the list" />
                </Card>
                <Card index={1}>
                  <p className="text-sm font-medium text-ink-muted">Other skills</p>
                  <SkillCloud values={values.unmapped_skills} onChange={(unmapped_skills) => patch({ unmapped_skills })} placeholder="Anything the list lacks. Enter adds one." />
                </Card>
              </div>
            </Stage>
          ) : null}

          {stage === 'languages' ? (
            <Stage stageKey="languages" dir={dir} eyebrow={eyebrow} title="Which languages you speak." lede="And how well. One is needed to apply.">
              <div className="grid gap-3">
                {values.languages.map((row, i) => (
                  <Card key={`${row.code}-${i}`} index={i} className="flex flex-wrap items-center gap-4">
                    <div className="w-44">
                      <Picker id={`language-${i}`} value={row.code} options={LANGUAGE_OPTIONS} onChange={(code) => patch({ languages: values.languages.map((r, j) => (j === i ? { ...r, code } : r)) })} icon="translate" />
                    </div>
                    <Segmented label="How well" options={PROFICIENCY_OPTIONS} value={row.proficiency} size="sm" onChange={(proficiency) => patch({ languages: values.languages.map((r, j) => (j === i ? { ...r, proficiency: proficiency as typeof r.proficiency } : r)) })} />
                    <GlyphButton label="Remove this language" icon="close" onClick={() => patch({ languages: values.languages.filter((_, j) => j !== i) })} className="ml-auto" />
                  </Card>
                ))}
                <div className="studio-in" style={{ '--i': values.languages.length } as CSSProperties}>
                  <Pill tone="outline" icon="add" onClick={() => patch({ languages: [...values.languages, { code: LANGUAGES.find((l) => !values.languages.some((r) => r.code === l.code))?.code ?? 'en', proficiency: 'intermediate' }] })}>
                    Add a language
                  </Pill>
                </div>
              </div>
            </Stage>
          ) : null}

          {stage === 'links' ? (
            <Stage stageKey="links" dir={dir} eyebrow={eyebrow} title="Where to find you." lede="Optional. Recruiters follow these; screening never does." aside={<IdCard profile={values} email={email} missing={missing} />}>
              <div className="grid gap-5">
                <div className="studio-in" style={{ '--i': 0 } as CSSProperties}><TextInput id="linkedin" label="LinkedIn" icon="link" type="url" value={values.linkedin_url} onChange={(linkedin_url) => patch({ linkedin_url })} placeholder="linkedin.com/in/you" /></div>
                <div className="studio-in" style={{ '--i': 1 } as CSSProperties}><TextInput id="github" label="GitHub" icon="code" type="url" value={values.github_url} onChange={(github_url) => patch({ github_url })} placeholder="github.com/you" /></div>
                <div className="studio-in" style={{ '--i': 2 } as CSSProperties}><TextInput id="portfolio" label="Portfolio" icon="open_in_new" type="url" value={values.portfolio_url} onChange={(portfolio_url) => patch({ portfolio_url })} placeholder="https://" /></div>
              </div>
            </Stage>
          ) : null}

          {stage === 'ready' ? (
            <Stage stageKey="ready" dir={dir} eyebrow="Last step" title={complete ? <>You're ready, {name}.</> : <>Almost there, {name}.</>} lede={complete ? 'This is what a recruiter sees. Switch on Search and they can find you; you can switch it off any time.' : 'A few things are still missing before you can apply. Each one is a tap away.'}>
              <div className="grid gap-5">
                <div className="studio-in" style={{ '--i': 0 } as CSSProperties}>
                  <IdCard profile={values} email={email} missing={missing} large />
                </div>
                {complete ? (
                  <Card index={1} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-ink">Let recruiters find me</p>
                      <p className="text-sm text-ink-muted">Adds you to Global search across every employer on SYNC.</p>
                    </div>
                    <Toggle on={values.is_searchable} label="Let recruiters find me" onChange={(is_searchable) => patch({ is_searchable })} />
                  </Card>
                ) : (
                  <Card index={1}>
                    <p className="text-sm font-medium text-ink-muted">Still to do</p>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {missing.map((r) => (
                        <li key={r}>
                          <button type="button" onClick={() => go(REQUIREMENT_PLACES[r].stage)} className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm text-ink transition-colors duration-200 hover:bg-[var(--hover-wash)]">
                            <span aria-hidden="true" className="track-dot" />
                            {REQUIREMENT_PLACES[r].label}
                            <Icon name="arrow_forward" size={16} className="ml-auto text-ink-faint transition-transform duration-300 group-hover:translate-x-0.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            </Stage>
          ) : null}
        </main>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-5 pb-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4">
          <p className="pointer-events-auto flex items-center gap-2 text-sm text-ink-muted" aria-live="polite">
            <span aria-hidden="true" className={`saved-mark inline-flex size-5 items-center justify-center rounded-full ${saved === 'idle' ? 'opacity-0' : 'opacity-100'} ${saved === 'saved' ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400' : 'text-ink-faint'}`} data-fresh={fresh ? '' : undefined}>
              {saved === 'saved' ? <Icon name="check" size={14} className="[--symbol-fill:1]" /> : <span className="reading-mark size-3 rounded-full border-[1.5px] border-current border-t-transparent" />}
            </span>
            {saved === 'saving' ? 'Saving' : saved === 'saved' ? 'Saved' : ''}
          </p>
          <div className="pointer-events-auto flex items-center gap-2">
            {stage !== 'start' ? (
              <Pill tone="ghost" onClick={stage === 'found' ? () => { setFound(null); go('start') } : back}>
                Back
              </Pill>
            ) : null}
            {stage === 'found' && found ? (
              <Pill icon="auto_awesome" onClick={() => { setValues((v) => applyDraft(v, found.draft, found.use)); setFound(null); go('you') }}>
                Use what we found
              </Pill>
            ) : null}
            {stage !== 'start' && stage !== 'found' && stage !== 'ready' ? (
              <Pill onClick={next} disabled={!canContinue()} icon="arrow_forward">
                Continue
              </Pill>
            ) : null}
            {stage === 'ready' ? (
              <Pill icon="check" onClick={() => { markBuilt(); go('start') }}>
                Done
              </Pill>
            ) : null}
          </div>
        </div>
      </div>

      {readingLive ? <Reading cv={readingLive} name={name} onDone={() => setReading(null)} onBackground={() => setReading(null)} /> : null}
    </div>
  )
}

function Total({ profile }: { profile: Profile }) {
  const total = experienceLabel(profile)
  return (
    <div className="studio-in rounded-[24px] bg-paper-raised/60 p-5 ring-1 ring-hairline backdrop-blur-xl" style={{ '--i': 2 } as CSSProperties}>
      <p className="text-xs font-medium tracking-[0.12em] text-ink-muted uppercase">Total experience</p>
      <p className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-ink tabular-nums">{total ?? '—'}</p>
      <p className="mt-1 text-xs text-ink-faint">From the dates on the right. Correct a date to change it.</p>
    </div>
  )
}

function Timeline<T>({
  items,
  empty,
  onChange,
  addLabel,
  emptyText,
  render,
  head,
}: {
  items: T[]
  empty: T
  onChange: (items: T[]) => void
  addLabel: string
  emptyText: string
  render: (item: T, update: (patch: Partial<T>) => void, id: string) => React.ReactNode
  head: (item: T) => { title: string; sub: string; when: string }
}) {
  const [open, setOpen] = useState<number | null>(items.length === 0 ? null : 0)
  const update = (i: number, patch: Partial<T>) => onChange(items.map((item, j) => (j === i ? { ...item, ...patch } : item)))
  const remove = (i: number) => {
    onChange(items.filter((_, j) => j !== i))
    setOpen(null)
  }
  const add = () => {
    onChange([...items, empty])
    setOpen(items.length)
  }
  return (
    <div className="relative grid gap-3">
      {items.length === 0 ? (
        <div className="studio-in rounded-[24px] border border-dashed border-hairline px-6 py-10 text-center text-sm text-ink-muted">{emptyText}</div>
      ) : null}
      {items.map((item, i) => {
        const h = head(item)
        const isOpen = open === i
        return (
          <div key={i} className="row-in overflow-hidden rounded-[24px] bg-paper-raised/60 ring-1 ring-hairline backdrop-blur-xl transition-[box-shadow] duration-300 focus-within:ring-teal-400/50">
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)} className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left">
              <span aria-hidden="true" className={`track-dot ${i === 0 ? '' : ''}`} data-state={h.title && h.title !== 'Untitled role' && h.title !== 'Untitled' ? 'done' : 'ahead'}>
                <Icon name="check" size={13} className="[--symbol-fill:1]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-ink">{h.title}</span>
                <span className="block truncate text-sm text-ink-muted">{[h.sub, h.when].filter(Boolean).join(' · ')}</span>
              </span>
              <Icon name="arrow_drop_down" size={22} className={`shrink-0 text-ink-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className="unfold" data-open={isOpen ? '' : undefined}>
              <div>
                <div className="grid gap-4 px-5 pt-1 pb-5">
                  {render(item, (p) => update(i, p), `entry-${i}`)}
                  <div className="flex justify-end">
                    <Pill tone="ghost" icon="delete" onClick={() => remove(i)}>
                      Remove
                    </Pill>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
      <div className="studio-in" style={{ '--i': items.length } as CSSProperties}>
        <Pill tone="outline" icon="add" onClick={add}>
          {addLabel}
        </Pill>
      </div>
    </div>
  )
}

function JobFields({ job, update, id }: { job: Experience; update: (patch: Partial<Experience>) => void; id: string }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput id={`${id}-title`} label="Role" icon="work" value={job.job_title} onChange={(job_title) => update({ job_title })} placeholder="Senior software engineer" />
        <TextInput id={`${id}-company`} label="Company" icon="apartment" value={job.company_name} onChange={(company_name) => update({ company_name })} placeholder="Where" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Picker id={`${id}-sm`} label="From" value={job.start_month ? String(job.start_month) : ''} options={MONTH_OPTIONS} onChange={(m) => update({ start_month: m ? Number(m) : null })} placeholder="Month" />
        <NumberInput id={`${id}-sy`} label="Year" value={job.start_year} onChange={(start_year) => update({ start_year })} placeholder="2021" />
        <Picker id={`${id}-em`} label="To" value={job.is_current ? '' : job.end_month ? String(job.end_month) : ''} options={MONTH_OPTIONS} onChange={(m) => update({ end_month: m ? Number(m) : null })} placeholder={job.is_current ? 'Now' : 'Month'} />
        <NumberInput id={`${id}-ey`} label="Year" value={job.is_current ? null : job.end_year} onChange={(end_year) => update({ end_year })} placeholder={job.is_current ? 'Now' : '2024'} disabled={job.is_current} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-ink">I still work here</span>
        <Toggle on={job.is_current} label="I still work here" onChange={(is_current) => update({ is_current, end_year: is_current ? null : job.end_year, end_month: is_current ? null : job.end_month })} />
      </div>
      <TextArea id={`${id}-desc`} label="What you did" value={job.description} onChange={(description) => update({ description })} rows={3} max={5000} placeholder="Two or three lines a recruiter can picture." />
    </>
  )
}

function SchoolFields({ school, update, id }: { school: Education; update: (patch: Partial<Education>) => void; id: string }) {
  return (
    <>
      <TextInput id={`${id}-inst`} label="Institution" icon="school" value={school.institution} onChange={(institution) => update({ institution })} placeholder="Damascus University" />
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_7rem]">
        <TextInput id={`${id}-degree`} label="Degree" value={school.degree} onChange={(degree) => update({ degree })} placeholder="Bachelor of Engineering" />
        <TextInput id={`${id}-field`} label="Field" value={school.field_of_study} onChange={(field_of_study) => update({ field_of_study })} placeholder="Informatics" />
        <NumberInput id={`${id}-year`} label="Graduated" value={school.graduation_year} onChange={(graduation_year) => update({ graduation_year })} placeholder="2019" />
      </div>
    </>
  )
}

function SkillCloud({ values, onChange, suggestions, placeholder }: { values: string[]; onChange: (next: string[]) => void; suggestions?: readonly string[]; placeholder: string }) {
  const [typed, setTyped] = useState('')
  const query = typed.trim().toLowerCase()
  const matches = suggestions ? suggestions.filter((s) => !values.includes(s) && (!query || s.toLowerCase().includes(query))).slice(0, query ? 8 : 12) : []
  const add = (raw: string) => {
    const clean = raw.trim()
    if (!clean || values.includes(clean)) return
    if (suggestions && !suggestions.includes(clean)) return
    onChange([...values, clean])
    setTyped('')
  }
  return (
    <div className="mt-3 grid gap-3">
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <Chip key={v} onRemove={() => onChange(values.filter((x) => x !== v))}>
            {v}
          </Chip>
        ))}
        {values.length === 0 ? <span className="text-sm text-ink-faint">Nothing yet.</span> : null}
      </div>
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add(suggestions ? (matches[0] ?? '') : typed)
          } else if (e.key === 'Backspace' && typed === '' && values.length) onChange(values.slice(0, -1))
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className={fieldClass}
      />
      {matches.length ? (
        <div className="flex flex-wrap gap-2">
          {matches.map((m, i) => (
            <button key={m} type="button" onClick={() => add(m)} className="chip-in cursor-pointer rounded-full border border-hairline px-3.5 py-1.5 text-sm text-ink-muted transition-[border-color,color,transform] duration-300 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:border-teal-400 hover:text-ink" style={{ animationDelay: `${i * 30}ms` }}>
              {m}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default ProfilePage
