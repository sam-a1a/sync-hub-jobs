import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Icon from '../../components/Icon'
import WarningModal from '../../components/WarningModal'
import { panelInputClass } from '../../components/ui/Field'
import { changePassword, signIn, signOut, useAccount } from '../../lib/account'
import { asName } from '../../lib/format'
import { resetStudio, setProfile, useStudio } from '../../lib/profile/store'

const PREFS_KEY = 'sync.jobs.prefs'

const FADE_MS = 200

const FIELD = panelInputClass

type Prefs = { cv: boolean; moves: boolean }

const RULES = [
  { id: 'length', label: 'At least 8 characters', short: '8+ characters', test: (v: string) => v.length >= 8 },
  { id: 'upper', label: 'An uppercase letter', short: 'Uppercase', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'A lowercase letter', short: 'Lowercase', test: (v: string) => /[a-z]/.test(v) },
  { id: 'digit', label: 'A digit', short: 'Digit', test: (v: string) => /\d/.test(v) },
] as const

const ACTION =
  'inline-flex h-11 w-44 cursor-pointer items-center justify-center rounded-full border px-6 text-[15px] font-semibold whitespace-nowrap transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)]'

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { cv: true, moves: true }
    const v = JSON.parse(raw) as Partial<Prefs>
    return { cv: v.cv !== false, moves: v.moves !== false }
  } catch {
    return { cv: true, moves: true }
  }
}

function writePrefs(value: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(value))
  } catch {
    return
  }
}

function Section({ title, note, children, index }: { title: string; note: ReactNode; children: ReactNode; index: number }) {
  return (
    <section
      className="hero-in grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-6 border-t border-hairline py-12 last:pb-0 lg:grid-cols-[20rem_minmax(0,1fr)] lg:py-14 lg:last:pb-0"
      style={{ '--i': index } as CSSProperties}
    >
      <div>
        <h2 className="text-xs font-bold tracking-[0.14em] text-ink-faint uppercase">{title}</h2>
        <p className="mt-3.5 max-w-[34ch] text-sm leading-relaxed text-ink-muted">{note}</p>
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-0.5">{children}</div>
    </section>
  )
}

function Row({ children, align = 'center', className = '' }: { children: ReactNode; align?: 'center' | 'start'; className?: string }) {
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-6 py-4 sm:gap-12 ${align === 'start' ? 'items-start' : 'items-center'} ${className}`}
    >
      {children}
    </div>
  )
}

function Key({ title, note }: { title: string; note?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-base font-medium tracking-[-0.012em] break-words text-ink">{title}</p>
      {note ? <p className="mt-1 text-sm break-words text-ink-muted">{note}</p> : null}
    </div>
  )
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-[31px] w-[51px] shrink-0 cursor-pointer rounded-full transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] ${on ? 'bg-ink' : 'bg-hairline'}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 left-0.5 size-[27px] rounded-full transition-transform duration-400 ease-[var(--ease-spring)] ${on ? 'translate-x-5 bg-paper' : 'bg-ink-faint'}`}
      />
    </button>
  )
}

function Secret({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (next: string) => void }) {
  const [reveal, setReveal] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const toggle = () => {
    setSwapping(true)
    timer.current = window.setTimeout(() => {
      setReveal((was) => !was)
      setSwapping(false)
    }, FADE_MS)
  }

  return (
    <div className="relative">
      <input
        type={reveal ? 'text' : 'password'}
        autoComplete="new-password"
        aria-label={placeholder}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        style={swapping ? { color: 'transparent' } : undefined}
        className={`${FIELD} pe-12`}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={reveal ? 'Hide password' : 'Show password'}
        className="absolute end-2 top-1/2 inline-flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-ink-faint transition-colors duration-200 ease-[var(--ease-out)] hover:bg-[var(--hover-wash)] hover:text-ink"
      >
        <Icon
          name="visibility"
          size={18}
          className={`absolute transition-all duration-200 ease-[var(--ease-out)] ${reveal ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}
        />
        <Icon
          name="visibility_off"
          size={18}
          className={`absolute transition-all duration-200 ease-[var(--ease-out)] ${reveal ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
        />
      </button>
    </div>
  )
}

function SettingsPage() {
  const account = useAccount()
  const { profile } = useStudio()
  const navigate = useNavigate()

  const [keptName, setKeptName] = useState(account?.name ?? '')
  const [name, setName] = useState(account?.name ?? '')
  const [keptPrefs, setKeptPrefs] = useState(readPrefs)
  const [keptFindable, setKeptFindable] = useState(profile.is_searchable)
  const [findable, setFindable] = useState(profile.is_searchable)
  const [prefs, setPrefs] = useState(readPrefs)
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const pending = useRef<string | null>(null)

  const met = RULES.map((rule) => rule.test(next))
  const strong = met.every(Boolean)
  const matches = next.length > 0 && next === confirm
  const wantsPassword = next.length > 0 || confirm.length > 0

  const dirty =
    name !== keptName ||
    prefs.cv !== keptPrefs.cv ||
    prefs.moves !== keptPrefs.moves ||
    findable !== keptFindable ||
    wantsPassword
  const named = name.trim().length > 0
  const valid = named && (!wantsPassword || (strong && matches))
  const canSave = dirty && valid && !saving

  const save = (): Promise<void> => {
    if (!canSave) return Promise.resolve()
    setSaving(true)

    if (account && name !== keptName) signIn({ ...account, name })
    setKeptName(name)
    writePrefs(prefs)
    setKeptPrefs(prefs)
    if (findable !== keptFindable) setProfile({ ...profile, is_searchable: findable })
    setKeptFindable(findable)

    if (!wantsPassword) {
      setSaving(false)
      return Promise.resolve()
    }

    return changePassword(next)
      .then(() => {
        setNext('')
        setConfirm('')
      })
      .catch(() => undefined)
      .finally(() => setSaving(false))
  }

  const go = () => {
    const to = pending.current
    pending.current = null
    setLeaving(false)
    if (to) void navigate(to)
  }

  useEffect(() => {
    if (!dirty) return

    const intercept = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname) return
      event.preventDefault()
      event.stopPropagation()
      pending.current = url.pathname + url.search + url.hash
      setLeaving(true)
    }

    const hold = (event: BeforeUnloadEvent) => event.preventDefault()

    document.addEventListener('click', intercept, true)
    window.addEventListener('beforeunload', hold)
    return () => {
      document.removeEventListener('click', intercept, true)
      window.removeEventListener('beforeunload', hold)
    }
  }, [dirty])

  return (
    <div className="-mb-20 w-full px-6 sm:px-10 lg:px-14">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 pb-4">
        <div>
          <h1 className="hero-in text-[2.75rem] leading-[1.05] font-bold tracking-[-0.038em] text-ink sm:text-5xl lg:text-6xl" style={{ '--i': 0 } as CSSProperties}>
            Settings.
          </h1>
          <p className="hero-in mt-3.5 text-[17px] text-ink-muted" style={{ '--i': 1 } as CSSProperties}>
            Your changes wait here until you save them.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className={`hero-in inline-flex h-12 items-center justify-center rounded-full px-8 text-[15px] font-semibold whitespace-nowrap transition-[background-color,color,border-color] duration-[var(--hover-fade)] ease-[var(--ease-standard)] ${
            canSave
              ? 'cursor-pointer border border-ink bg-ink text-paper hover:bg-transparent hover:text-ink'
              : 'cursor-not-allowed border border-hairline bg-transparent text-ink-faint'
          }`}
          style={{ '--i': 1 } as CSSProperties}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </header>

      <Section title="Account" note="Your name, and the password you get in with. Your email address cannot be changed at the moment." index={2}>
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-3 py-2 sm:grid-cols-2">
          <div>
            <input
              type="text"
              autoComplete="name"
              aria-label={account?.name || 'Your name'}
              aria-invalid={!named}
              value={name}
              placeholder={account?.name || account?.email || ''}
              onChange={(event) => setName(asName(event.target.value))}
              className={FIELD}
            />
            <div className="unfold" data-open={named ? undefined : ''}>
              <div>
                <p className="pt-2.5 pb-3 text-sm text-brick">Name cannot be empty.</p>
              </div>
            </div>
          </div>
          <div className={`${FIELD} flex cursor-default items-center justify-between gap-4 border-transparent bg-[var(--hover-wash)]`}>
            <span className="truncate text-ink-muted">{account?.email ?? ''}</span>
            <span className="shrink-0 text-[13px] text-ink-faint">Cannot be changed</span>
          </div>
          <Secret value={next} placeholder="New Password" onChange={setNext} />
          <div>
            <Secret value={confirm} placeholder="Repeat New Password" onChange={setConfirm} />
            <div className="unfold" data-open={confirm.length > 0 && !matches ? '' : undefined}>
              <div>
                <p className="pt-2.5 pb-3 text-sm text-brick">The two passwords do not match.</p>
              </div>
            </div>
          </div>
        </div>
        <Row className="pt-8">
          <Key title="Let recruiters find me" note="Adds you to global search." />
          <Switch on={findable} label="Let recruiters find me" onChange={setFindable} />
        </Row>

        <div className="unfold" data-open={wantsPassword ? '' : undefined}>
          <div>
            <div className="pt-7 pb-2">
              <ul className="flex flex-wrap gap-1.5">
                {RULES.map((rule, index) => (
                  <li key={rule.id} className="rule" data-met={met[index] ? '' : undefined} aria-label={`${rule.label}${met[index] ? ': met' : ': not met yet'}`}>
                    <span className="rule-mark" aria-hidden="true">
                      <Icon name="check" size={12} />
                    </span>
                    <span aria-hidden="true">{rule.short}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Notifications" note="Sent to the address above. Nothing else reaches you from here." index={3}>
        <Row>
          <Key title="When a CV has been read" note="The moment SYNC AI is done with a file you dropped." />
          <Switch on={prefs.cv} label="When a CV has been read" onChange={(cv) => setPrefs({ ...prefs, cv })} />
        </Row>
        <Row>
          <Key title="When an application moves" note="Received, in review, and the answer." />
          <Switch on={prefs.moves} label="When an application moves" onChange={(moves) => setPrefs({ ...prefs, moves })} />
        </Row>
      </Section>

      <Section title="Leaving" note="Signing out leaves your profile where it is. Deleting does not." index={4}>
        <Row>
          <Key title="Sign out" note="On this device only." />
          <button
            type="button"
            onClick={() => {
              signOut()
              void navigate('/')
            }}
            className={`${ACTION} border-hairline text-ink hover:border-ink`}
          >
            Sign Out
          </button>
        </Row>
        <Row>
          <Key title="Delete your profile" note="Your profile, your CVs, your applications. Nothing asks twice." />
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={`${ACTION} border-brick/40 text-brick hover:border-brick hover:bg-brick/10`}
          >
            Delete Profile
          </button>
        </Row>
      </Section>

      <WarningModal
        open={confirming}
        title="Delete your profile?"
        body="Your profile, your CVs and everything you have applied to go with it. This cannot be undone."
        confirmLabel="Delete Profile"
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          resetStudio()
          signOut()
          void navigate('/')
        }}
      />

      <WarningModal
        open={leaving}
        icon="save"
        tone="ink"
        title="You have unsaved changes."
        body="Leave now and what you changed here goes back to how it was."
        dismiss="close"
        altLabel="Discard Changes"
        onAlt={() => {
          setName(keptName)
          setPrefs(keptPrefs)
          setNext('')
          setConfirm('')
          go()
        }}
        confirmLabel="Save Changes"
        confirmDisabled={!valid || saving}
        onConfirm={() => void save().then(go)}
        onClose={() => {
          pending.current = null
          setLeaving(false)
        }}
      />
    </div>
  )
}

export default SettingsPage
