import { useEffect, useState } from 'react'
import Icon from '../Icon'
import Morph, { Counter } from '../Morph'
import Collapse from '../ui/Collapse'
import Button from '../ui/Button'
import Field, { inputClass } from '../ui/Field'
import { asName } from '../../lib/format'
import { signIn } from '../../lib/account'
import { useMedia } from '../../hooks/useMedia'
import type { View } from './authView'

/**
 * Signing in, resetting, and joining — one panel, three views.
 *
 * Resetting is not somewhere else. It is the same box asking for one fewer
 * thing, so the password field folds away and the words around it change rather
 * than the whole panel being replaced by a different one. Joining is the same
 * box asking for more. Everything that leaves does so by folding, which is why
 * nothing in here is mounted conditionally.
 *
 * Ported from the site's `AuthPanel`, with its `motion/react` springs written
 * as CSS — see `Morph` and `ui/Collapse`.
 */
const INTRO: Record<View, string> = {
  signIn: 'An account keeps the roles you have saved and prefills your applications.',
  reset: 'Please enter your email address and we will send you the password reset instructions.',
  create: 'A few details now, and we will not ask for them again.',
  createPassword: 'Something only you know, and you are in.',
}

const NARROW = '(width < 40rem)'

/*
 * Two labels each: the long one is what a screen reader is given, the short one
 * is what is drawn. "An uppercase letter" and "Uppercase" say the same thing to
 * somebody watching a chip go teal, and only one of them fits on a line with
 * three others.
 */
const RULES = [
  { id: 'length', label: 'At least 8 characters', short: '8+ characters', test: (v: string) => v.length >= 8 },
  { id: 'upper', label: 'An uppercase letter', short: 'Uppercase', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'A lowercase letter', short: 'Lowercase', test: (v: string) => /[a-z]/.test(v) },
  { id: 'digit', label: 'A digit', short: 'Digit', test: (v: string) => /\d/.test(v) },
] as const

/**
 * Deliberately not one of the long ones. A form's job is to catch the typo, not
 * to adjudicate RFC 5322 — anything stricter starts rejecting real addresses,
 * and the server has the only opinion that settles it anyway.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const UNDER_FIELD =
  'cursor-pointer text-xs font-medium text-ink-muted underline underline-offset-4 ' +
  'transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-ink'

const FOOT_LINK =
  'cursor-pointer font-medium text-ink underline underline-offset-4 ' +
  'transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-teal-600 dark:hover:text-teal-400'

/** Matches the input's own colour transition, so the text is gone before it changes. */
const FADE_MS = 200

/**
 * Which of the two the create view is on, said inline rather than on a line of
 * its own.
 *
 * A row to itself is the obvious build and it costs twenty pixels of a panel
 * that, with the keyboard up, has about three hundred — which is the whole
 * reason the view was split in the first place. The dot is the separator the
 * footer and the byline already use, so the site has one.
 */
function Step({ of }: { of: '1' | '2' }) {
  return (
    <>
      <span className="font-medium text-ink">Step {of} of 2</span>
      <span aria-hidden className="px-1.5 text-ink-faint">
        &middot;
      </span>
    </>
  )
}

/**
 * A password field with the eye on it. Two of these — one to sign in with, one
 * to choose — and they are the same box, so it is written once.
 *
 * The characters fade out, the type changes while there is nothing on screen to
 * change, and they fade back in as themselves: what moves is the text, not the
 * field around it. The colour goes to transparent through an inline style
 * rather than a class, because two Tailwind colour utilities on one element are
 * settled by stylesheet order and not by the order they were written in.
 */
function PasswordBox({
  id,
  autoComplete,
  value,
  onChange,
}: {
  id: string
  autoComplete: 'current-password' | 'new-password'
  value: string
  onChange: (value: string) => void
}) {
  const [reveal, setReveal] = useState(false)
  const [swapping, setSwapping] = useState(false)

  const toggle = () => {
    setSwapping(true)
    window.setTimeout(() => {
      setReveal((was) => !was)
      setSwapping(false)
    }, FADE_MS)
  }

  return (
    <div className="relative">
      <input
        id={id}
        type={reveal ? 'text' : 'password'}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={swapping ? { color: 'transparent' } : undefined}
        className={`${inputClass} pe-11`}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={reveal ? 'Hide password' : 'Show password'}
        className="absolute end-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors duration-200 ease-[var(--ease-out)] hover:bg-paper-sunken hover:text-ink"
      >
        {/*
         * Both glyphs are always there, stacked, and they cross over. Swapping
         * one for the other leaves a frame with nothing in it, which on a
         * control this small reads as a flicker.
         */}
        <Icon
          name="visibility"
          size={18}
          className={`absolute transition-all duration-200 ease-[var(--ease-out)] ${
            reveal ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
          }`}
        />
        <Icon
          name="visibility_off"
          size={18}
          className={`absolute transition-all duration-200 ease-[var(--ease-out)] ${
            reveal ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
          }`}
        />
      </button>
    </div>
  )
}

function AuthPanel({
  active,
  onDone,
  onView,
}: {
  /**
   * Whether the panel is being shown. Not a mount switch — the host decides
   * that — but the moment everything resets: a panel that reopens where it was
   * left is one showing somebody an error about something they have forgotten
   * doing.
   */
  active: boolean
  /** Through: signed in, registered, or sent the reset. */
  onDone: () => void
  /** Which of the three views is up, for the host's heading. */
  onView?: (view: View) => void
}) {
  const stepped = useMedia(NARROW)

  const [view, setView] = useState<View>('signIn')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)

  /*
   * The second half of two views: working, done, and the wait before the mail
   * can be asked for again.
   *
   * One state for both outcomes rather than a boolean each. They are the same
   * shape — a heading, an explanation, the spam note, a way back and a resend
   * on a timer — and holding them apart would mean two copies of that block
   * kept in step by hand.
   */
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<null | 'reset' | 'created'>(null)
  const [wait, setWait] = useState(0)

  /*
   * Everything resets when the panel is put away — a panel that reopens where
   * it was left is one showing somebody an error about something they have
   * forgotten doing.
   *
   * Adjusted during render rather than in an effect. React's own pattern for
   * "a prop changed, throw the state away": an effect would leave one frame
   * showing the old form, which on a modal that has just closed is a frame of
   * somebody's half-typed password fading out.
   */
  const [wasActive, setWasActive] = useState(active)
  if (active !== wasActive) {
    setWasActive(active)
    if (!active) {
      setView('signIn')
      setName('')
      setEmail('')
      setPassword('')
      setConfirm('')
      setTouched(false)
      setSending(false)
      setDone(null)
      setWait(0)
    }
  }

  /*
   * The host is told in the same handler that changes the view, not from an
   * effect watching it. An effect would report a frame late, so the modal's
   * heading would roll one beat behind the panel it names.
   */
  const go = (next: View) => {
    setView(next)
    setTouched(false)
    setDone(null)
    setSending(false)
    setWait(0)
    onView?.(next)
  }

  /*
   * The resend countdown. One interval for the whole run rather than a timeout
   * per second, so the ticks cannot drift apart from each other, and it clears
   * itself the moment it reaches zero.
   */
  const counting = wait > 0
  useEffect(() => {
    if (!counting) return
    const id = window.setInterval(() => setWait((left) => Math.max(0, left - 1)), 1000)
    return () => window.clearInterval(id)
  }, [counting])

  /*
   * Stands in for the request. The button has to be unavailable while it is in
   * flight — a mail that can be asked for four times in a second sends four
   * emails — and the wait is what makes that visible rather than merely true.
   */
  const send = (outcome: 'reset' | 'created') => {
    setSending(true)
    window.setTimeout(() => {
      setSending(false)
      if (outcome === 'created') signIn({ name, email })
      setDone(outcome)
      setWait(60)
    }, 1400)
  }

  /*
   * Whether the form is still asking for anything.
   *
   * Every section folds on this as well as on its own view, and the redundancy
   * is the point. `done` is what swaps the form for the confirmation, so a
   * section that consults only `view` stays open *underneath* it — which is how
   * creating an account came to show "check your email to verify your account"
   * with the name, password and confirm fields still sitting below it, inviting
   * somebody to fill in a form that had already been sent.
   */
  const asking = done === null

  const met = RULES.map((rule) => rule.test(password))
  const emailReady = EMAIL.test(email)
  const matches = confirm.length > 0 && confirm === password

  const identified = name.trim().length > 1 && emailReady
  const chosen = met.every(Boolean) && matches

  const ready =
    view === 'reset'
      ? emailReady
      : view === 'createPassword'
        ? chosen
        : view === 'create'
          ? identified && (stepped || chosen)
          : emailReady && password.length > 0

  const submitLabel =
    view === 'reset'
      ? 'Send Instructions'
      : view === 'create' && stepped
        ? 'Continue'
        : view === 'create' || view === 'createPassword'
          ? 'Create Account'
          : 'Sign in'

  /* The first word of whatever was typed, for the welcome. */
  const [greeting = 'there'] = name.trim().split(/\s+/)

  const resendLabel = done === 'created' ? 'Request new email' : 'Resend'

  return (
    <>
      {/* One intro per view, and only one of them open at a time. */}
      <Collapse open={view === 'signIn' && asking}>
        <p className="pb-5 text-sm text-ink-muted">{INTRO.signIn}</p>
      </Collapse>
      <Collapse open={view === 'reset' && asking}>
        <p className="pb-5 text-sm text-ink-muted">{INTRO.reset}</p>
      </Collapse>
      <Collapse open={view === 'create' && asking}>
        <p className="pb-5 text-sm text-ink-muted">
          {stepped ? <Step of="1" /> : null}
          {INTRO.create}
        </p>
      </Collapse>
      <Collapse open={view === 'createPassword' && asking}>
        <p className="pb-5 text-sm text-ink-muted">
          <Step of="2" />
          {INTRO.createPassword}
        </p>
      </Collapse>

      <form
        /*
         * No `gap` on the form. A collapsed `Collapse` is still a grid item, so
         * a gap here is paid twice for every folded-away section — before it
         * and after it — whether or not it has any height. That is where the
         * create view's extra four centimetres of white space came from. The
         * spacing lives inside each section instead, so a section that is not
         * showing costs exactly nothing.
         */
        className="grid"
        /*
         * The browser's own validation is off, and it has to be. Every view's
         * fields stay mounted and folded away, so a form that is complete for
         * the view on screen still holds three empty `required` inputs
         * belonging to the views that are not — and the browser refuses to
         * submit, then tries to focus the offending field to explain why, and
         * cannot, because it is collapsed. "An invalid form control is not
         * focusable", and nothing happens at all.
         *
         * `required` stays on the inputs: it is what tells a screen reader the
         * field is needed. What decides whether this can be submitted is
         * `ready`, which only ever looks at the view actually being shown.
         */
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          setTouched(true)
          if (!ready) return
          if (view === 'reset') {
            send('reset')
            return
          }
          if (view === 'create' && stepped) {
            go('createPassword')
            return
          }
          if (view === 'create' || view === 'createPassword') {
            send('created')
            return
          }
          /*
           * Signing in is the panel's job, not the modal's: the modal knows
           * when it closed, but only this knows *which view* closed it and
           * therefore whether a name was ever given. Somebody who signed in
           * has one derived from the address instead.
           */
          signIn({ name: '', email })
          onDone()
        }}
      >
        <Collapse open={view === 'create' && asking}>
          <div className="pb-5">
            <Field label="Full Name" htmlFor="account-name" required>
              <input
                id="account-name"
                type="text"
                autoComplete="name"
                value={name}
                /*
                 * Cleaned and capitalised on every keystroke rather than on
                 * blur. `asName` returns the same length it was given, so the
                 * caret stays where it was — a formatter that shortens the
                 * string sends the cursor to the end mid-word.
                 */
                onChange={(event) => setName(asName(event.target.value))}
                className={inputClass}
              />
            </Field>
          </div>
        </Collapse>

        {/*
         * Every view that is still collecting asks for this, so it folds only
         * for the second create step — which already has it — and for the
         * confirmation, which quotes it back.
         */}
        <Collapse open={asking && view !== 'createPassword'}>
          <div className="pb-5">
            <Field
              label="Email Address"
              htmlFor="account-email"
              required
              error={touched && !emailReady ? 'Enter a valid email address.' : null}
            >
              <input
                id="account-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Collapse>

        <Collapse open={view === 'signIn' && asking}>
          <div className="pb-5">
            <Field label="Password" htmlFor="account-password" required>
              <PasswordBox
                id="account-password"
                autoComplete="current-password"
                value={password}
                onChange={setPassword}
              />
              <div className="flex items-center justify-end pt-2">
                <button type="button" onClick={() => go('reset')} className={UNDER_FIELD}>
                  Forgot Password?
                </button>
              </div>
            </Field>
          </div>
        </Collapse>

        <Collapse open={(view === 'createPassword' || (view === 'create' && !stepped)) && asking}>
          <div className="grid gap-5 pb-5">
            <Field label="Password" htmlFor="account-new-password" required>
              <PasswordBox
                id="account-new-password"
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
              />
              {/*
               * The rules are stated up front and each answers for itself,
               * rather than one message appearing after a failed submit. A list
               * visible before you type is a specification; the same list shown
               * afterwards is a telling-off.
               */}
              {/*
               * Chips on a wrapping line, not a stacked checklist.
               *
               * Four rows of "An uppercase letter — not met yet" cost 108px of
               * a panel that has three more fields under it, and the tail was
               * saying in words what the mark beside it already said in colour.
               * The same four rules wrap into two short lines and read at a
               * glance, which is the only way anybody reads a rule list while
               * typing a password.
               *
               * The long label goes to `aria-label`, so nothing is lost to
               * anybody who is listening rather than looking.
               */}
              <ul className="flex flex-wrap gap-1.5 pt-3">
                {RULES.map((rule, index) => (
                  <li
                    key={rule.id}
                    className="rule"
                    data-met={met[index] ? '' : undefined}
                    aria-label={`${rule.label}${met[index] ? ': met' : ': not met yet'}`}
                  >
                    <span className="rule-mark" aria-hidden="true">
                      <Icon name="check" size={12} />
                    </span>
                    <span aria-hidden="true">{rule.short}</span>
                  </li>
                ))}
              </ul>
            </Field>

            <Field
              label="Confirm Password"
              htmlFor="account-confirm"
              required
              error={confirm.length > 0 && !matches ? 'The two passwords do not match.' : null}
            >
              <PasswordBox
                id="account-confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={setConfirm}
              />
            </Field>
          </div>
        </Collapse>

        {/* The button goes once the mail is away — there is nothing left to submit. */}
        <Collapse open={asking}>
          {/*
           * The centring row is what makes the collapse symmetrical. The
           * button is `inline-flex`, so on its own it sits at the start of the
           * line and shrinking it from `w-full` to a circle pulls the right
           * edge in while the left stays put — it walks off to one side. A
           * flex parent with `justify-center` holds the middle still and lets
           * both edges travel.
           */}
          <div className="mt-3 flex justify-center">
            <Button type="submit" className="w-full" busy={sending} disabled={!ready}>
            {/*
             * The label still rolls between views — the spinner is the
             * button's job now, not the label's, so this only ever carries
             * words.
             */}
              <Morph token={view}>{submitLabel}</Morph>
            </Button>
          </div>
        </Collapse>
      </form>

      {/*
       * What replaces the form once the mail is away. It opens into the space
       * the form gives up, on the same curve, so the panel appears to change
       * its mind rather than to be replaced.
       *
       * One block for both outcomes: a heading, what was sent and where, the
       * spam note, the way back, and a resend on a timer. Only the words
       * differ, so only the words are branched.
       */}
      <Collapse open={!asking}>
        <div className="grid gap-3 text-center">
          <p className="text-lg font-semibold tracking-tight text-ink">
            {done === 'created' ? `Welcome to SYNC Hub, ${greeting}!` : 'We sent it!'}
          </p>

          {/*
           * The address is named. "Check your email" is advice; "check
           * sam@example.com" is also a receipt — it is the one chance somebody
           * has to notice they typed it wrong, and the only place the form can
           * still show them what it heard.
           */}
          <p className="text-sm text-ink-muted">
            {done === 'created'
              ? 'Kindly, check your Email Address to verify your account. We sent it to '
              : 'A password reset email has been sent to '}
            <span className="font-medium text-ink">{email}</span>
            {done === 'created' ? '.' : ', check your Email and follow the instructions.'}
          </p>

          <p className="text-sm text-ink-muted">Kindly, also check your Spam folder.</p>

          {done === 'created' ? (
            <p className="text-sm text-ink-muted">Happy to have you!</p>
          ) : null}

          <Button onClick={() => go('signIn')} className="mt-5 w-full">
            Back to Login
          </Button>

          {/*
           * Room between the way out and the way to try again. They are two
           * different answers to "what now", and set close together they read
           * as one block of controls to work through.
           */}
          <p className="pt-6 text-sm text-ink-muted">
            Did not receive an Email?{' '}
            <button
              type="button"
              onClick={() => send(done ?? 'reset')}
              disabled={wait > 0 || sending}
              className={`${FOOT_LINK} disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60`}
            >
              {/*
               * Only the digits move. The words either side are the same words
               * before and after every tick, and re-rendering them would make
               * the reader check whether they had changed.
               */}
              {wait > 0 ? (
                <span className="inline-flex items-center gap-1">
                  {resendLabel} in <Counter value={wait} />s
                </span>
              ) : (
                resendLabel
              )}
            </button>
          </p>
        </div>
      </Collapse>

      {/*
       * The footer folds away once the reset is sent. It carries the way back
       * to sign-in, and so does the sent block — two of the same button, one
       * above the other, is not a choice, it is a stutter.
       */}
      <Collapse open={asking}>
        <p className="mt-6 border-t border-hairline pt-5 text-center text-sm text-ink-muted">
          <Morph token={view}>
            {view === 'signIn' ? (
              <>
                Not on SYNC Hub yet?{' '}
                <button type="button" onClick={() => go('create')} className={FOOT_LINK}>
                  Join Us!
                </button>
              </>
            ) : view === 'createPassword' ? (
              <button type="button" onClick={() => go('create')} className={FOOT_LINK}>
                Back a Step
              </button>
            ) : (
              <button type="button" onClick={() => go('signIn')} className={FOOT_LINK}>
                Back to Login
              </button>
            )}
          </Morph>
        </p>
      </Collapse>
    </>
  )
}

export default AuthPanel
