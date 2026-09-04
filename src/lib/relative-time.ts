/**
 * "1 week ago", "50 days ago".
 *
 * Built on `Intl.RelativeTimeFormat` rather than a table of strings, so
 * pluralisation is handled correctly wherever the reader's locale expects it,
 * and `numeric: 'auto'` says "yesterday" where that is the natural word instead
 * of insisting on "1 day ago".
 */

const TAG = 'en-GB'

/** The ladder, largest first. Whichever fits is the unit used. */
const UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'year', seconds: 365 * 24 * 60 * 60 },
  { unit: 'month', seconds: 30 * 24 * 60 * 60 },
  { unit: 'week', seconds: 7 * 24 * 60 * 60 },
  { unit: 'day', seconds: 24 * 60 * 60 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
]

/**
 * How long ago, in words.
 *
 * Anything under a minute is "just now" rather than a count of seconds: a
 * legal document that claims to have changed forty seconds ago is telling the
 * reader nothing they can use.
 */
export function timeAgo(when: Date | string, now: Date = new Date()): string {
  const then = typeof when === 'string' ? new Date(when) : when
  if (Number.isNaN(then.getTime())) return ''

  const elapsed = Math.round((now.getTime() - then.getTime()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(TAG, { numeric: 'auto' })

  if (Math.abs(elapsed) < 60) return formatter.format(0, 'second')

  for (const { unit, seconds } of UNITS) {
    if (Math.abs(elapsed) < seconds) continue
    return formatter.format(-Math.trunc(elapsed / seconds), unit)
  }

  return formatter.format(0, 'second')
}

/**
 * The date itself, written out.
 *
 * Gregorian, and said so rather than left to default: the effective date of a
 * legal document has to line up with the one on a contract, and a locale
 * quietly resolving to another calendar would make two true statements that
 * disagree.
 */
export function longDate(when: Date | string): string {
  const date = typeof when === 'string' ? new Date(when) : when
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(TAG, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    calendar: 'gregory',
  }).format(date)
}
