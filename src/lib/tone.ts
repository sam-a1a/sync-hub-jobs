import { useSyncExternalStore } from 'react'

/**
 * Which word the headline is on, and the colour that goes with it.
 *
 * The rotating word is the page's clock. Its pill changes tint every few
 * seconds, and anything else that wants to change colour with it — the field
 * behind the hero, chiefly — should be reading the same value rather than
 * keeping its own timer that drifts out of step within a minute.
 *
 * A module-level store with a listener set, like the theme and the account,
 * because it is one value written from one place and read from wherever. The
 * word component writes it; nothing that reads it needs to be inside any
 * particular subtree.
 */
export const TONES = ['discover', 'match', 'apply', 'land', 'rise', 'grow'] as const

export type Tone = (typeof TONES)[number]

/**
 * The accent for each tone, in each appearance.
 *
 * These are *not* the pill's tints — those are pastels, chosen to sit under
 * ink, and a pastel drawn as a one-pixel line on white is invisible. These are
 * the same hues at the strength a hairline needs: the palette's teal, emerald,
 * ocean, apricot and steel, plus an amber for "grow" that keeps to the warm
 * side of the family. Dark gets each one a step lighter, because on black a
 * mid-tone reads as a shadow.
 */
export const TONE_ACCENTS: Record<Tone, { light: string; dark: string }> = {
  discover: { light: '#2ba69c', dark: '#51c2ba' },
  match: { light: '#2fa786', dark: '#4cc9a3' },
  apply: { light: '#3a8fb5', dark: '#5fb0d6' },
  land: { light: '#e98a4a', dark: '#f4a261' },
  rise: { light: '#26647e', dark: '#6d9cb3' },
  grow: { light: '#d9a441', dark: '#eec06a' },
}

let current: Tone = TONES[0]

const listeners = new Set<() => void>()

function announce(): void {
  for (const listener of listeners) listener()
}

export function subscribeToTone(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getTone(): Tone {
  return current
}

export function setTone(tone: Tone): void {
  if (tone === current) return
  current = tone
  announce()
}

export function useTone(): Tone {
  return useSyncExternalStore(subscribeToTone, getTone, getTone)
}
