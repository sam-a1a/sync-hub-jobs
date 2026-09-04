import { useLenis } from 'lenis/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pill } from './controls'
import type { Phase, SkyHandle } from './starfield'
import type { Cv } from '../../lib/profile/types'

const INTRO_MS = 2600
const LINE_MS = 1600

const SECTIONS = [
  'Reading your name…',
  'Reading your phone…',
  'Reading your headline…',
  'Reading your location…',
  'Reading what you do…',
  'Reading your summary…',
  'Reading your education…',
  'Reading your languages…',
]

interface Line {
  id: number
  text: string
  state: 'pre' | 'in' | 'out'
}

export function Reading({ cv, name, onDone, onBackground }: { cv: Cv; name: string; onDone: () => void; onBackground: () => void }) {
  const lenis = useLenis()
  const host = useRef<HTMLDivElement>(null)
  const sky = useRef<SkyHandle | null>(null)
  const phase = useRef<Phase>('warp')
  const [shown, setShown] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const [step, setStep] = useState(-1)
  const [introDone, setIntroDone] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [exitShown, setExitShown] = useState(false)
  const nextId = useRef(1)
  const exit = useRef<number[]>([])

  const setPhase = useCallback((next: Phase) => {
    phase.current = next
    sky.current?.setPhase(next)
  }, [])

  const say = useCallback((text: string) => {
    const id = nextId.current++
    setLines((current) => [...current.filter((l) => l.state !== 'out').map((l) => ({ ...l, state: 'out' as const })), { id, text, state: 'pre' }])
    requestAnimationFrame(() => setLines((current) => current.map((l) => (l.id === id ? { ...l, state: 'in' } : l))))
    window.setTimeout(() => setLines((current) => current.filter((l) => l.id === id || l.state !== 'out')), 1000)
  }, [])

  useEffect(() => {
    const node = host.current
    if (!node) return
    let cancelled = false
    import('./starfield')
      .then(({ mountSky }) => {
        if (cancelled) return
        sky.current = mountSky(node)
        sky.current.setPhase(phase.current)
      })
      .catch(() => undefined)
    lenis?.stop()
    const shownAt = window.setTimeout(() => setShown(true), 30)
    return () => {
      cancelled = true
      window.clearTimeout(shownAt)
      exit.current.forEach((t) => window.clearTimeout(t))
      sky.current?.dispose()
      sky.current = null
      lenis?.start()
    }
  }, [lenis])

  const leave = useCallback(() => {
    if (finishing) return
    setShown(false)
    exit.current.push(window.setTimeout(onBackground, 500))
  }, [finishing, onBackground])

  useEffect(() => {
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    at(500, () => say(`Hello, ${name}!`))
    at(500 + INTRO_MS, () => say('SYNC AI is now reading your CV.'))
    at(500 + INTRO_MS * 2, () => {
      setIntroDone(true)
      setPhase('drift')
    })
    at(3800, () => setExitShown(true))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [name, say, setPhase])

  useEffect(() => {
    if (!introDone || finishing) return
    let index = 0
    let round = 0
    const speak = () => {
      if (index < SECTIONS.length) {
        setStep(index)
        say(SECTIONS[index])
        index++
      } else {
        round++
        index = 0
        say(round === 1 ? 'Still reading. This can take a minute…' : 'Nearly there…')
      }
    }
    const first = window.setTimeout(speak, 0)
    const id = window.setInterval(speak, LINE_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [introDone, finishing, say])

  useEffect(() => {
    if (!introDone || finishing) return
    const ready = cv.parsing_status === 'ready'
    if (!ready && cv.parsing_status !== 'failed') return
    const start = window.setTimeout(() => {
      setFinishing(true)
      if (ready) {
        setStep(SECTIONS.length)
        say("Done. Here's what we found.")
        exit.current = [
          window.setTimeout(() => setPhase('jump'), 900),
          window.setTimeout(() => setShown(false), 1700),
          window.setTimeout(onDone, 2400),
        ]
      } else {
        say("We couldn't read this file.")
        exit.current = [window.setTimeout(() => setShown(false), 2200), window.setTimeout(onDone, 2900)]
      }
    }, 0)
    return () => window.clearTimeout(start)
  }, [cv.parsing_status, introDone, finishing, onDone, say, setPhase])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') leave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [leave])

  return createPortal(
    <div role="status" aria-live="polite" data-shown={shown ? '' : undefined} className="veil fixed inset-0 z-[60] flex flex-col items-center justify-center bg-paper/85 backdrop-blur-2xl">
      <div ref={host} aria-hidden="true" className="absolute inset-0 [&>canvas]:block [&>canvas]:size-full" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--paper)_120%)] opacity-60" />
      <div className="relative w-full max-w-3xl px-6 text-center">
        <p className="mb-6 text-xs font-medium tracking-[0.16em] text-teal-600 uppercase dark:text-teal-400">{introDone && !finishing ? 'SYNC AI is reading' : 'SYNC AI'}</p>
        <div className="relative h-[4.5em] text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-5xl">
          {lines.map((line) => (
            <span key={line.id} className="portal-line" data-state={line.state === 'pre' ? undefined : line.state}>
              {line.text}
            </span>
          ))}
        </div>
        <ol aria-hidden="true" className="mt-8 flex items-center justify-center gap-3">
          {SECTIONS.map((section, i) => (
            <li key={section} className="portal-step" data-on={introDone && i === step ? '' : undefined} data-done={introDone && i < step ? '' : undefined} />
          ))}
        </ol>
        <p className="mx-auto mt-6 max-w-md text-sm text-ink-muted">{cv.display_name}</p>
      </div>
      <div className={`absolute bottom-10 transition-opacity duration-700 ease-[var(--ease-standard)] ${exitShown && !finishing ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <Pill tone="ghost" onClick={leave}>
          Keep going while it reads
        </Pill>
      </div>
    </div>,
    document.body,
  )
}
