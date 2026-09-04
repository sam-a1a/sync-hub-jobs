/**
 * Pictographs out.
 *
 * Nothing that takes a name has any use for them, and they arrive by accident
 * more often than not — a long-press on a phone keyboard, a paste out of a
 * chat. Two passes: the pictographs themselves, then the joiner and the
 * variation selector that glue sequences together, which are invisible on their
 * own and would otherwise be left behind as an empty string that still costs
 * length.
 */
export function stripEmoji(value: string): string {
  return value
    .replace(/\p{Extended_Pictographic}/gu, '')
    /*
     * Written as escapes, not as the characters themselves. A zero-width joiner
     * and a variation selector are invisible in source, and a linter is right
     * to refuse a character class it cannot show you — the two next to each
     * other also read as one combined character rather than as two alternatives.
     */
    .replace(/\u200D/g, '')
    .replace(/\uFE0F/g, '')
}

/**
 * First letter of each word, and nothing else touched.
 *
 * The rest of the word is left exactly as typed, which is the whole point: a
 * title-caser that lowercases what it does not capitalise turns McDonald into
 * Mcdonald and DHL into Dhl. Same length in as out, so applying it on every
 * keystroke does not move the caret.
 */
export function capitalise(value: string): string {
  return value.replace(/(^|\s)(\S)/g, (_, lead: string, first: string) => lead + first.toUpperCase())
}

/**
 * What is allowed to be in a person's name.
 *
 * Letters from any script, marks (the accents that sit on them), spaces, and
 * the three joiners a name can genuinely contain: the hyphen in Anne-Marie, the
 * apostrophe in O'Neill, the full stop in an initial. Digits, currency signs,
 * brackets and the rest are not name characters in any language, so they never
 * reach the field.
 *
 * `\p{L}\p{M}` rather than `A-Za-z`: the second one would quietly refuse every
 * name that is not written in English.
 */
export function nameOnly(value: string): string {
  return stripEmoji(value).replace(/[^\p{L}\p{M}\s'’.-]/gu, '')
}

/**
 * A name as it is being typed: cleaned, capitalised, and the same length out as
 * in so the caret does not jump to the end on every keystroke.
 *
 * Runs of spaces are left alone deliberately — collapsing them mid-type means
 * somebody who has just pressed space to start a surname has it taken away
 * again before they can type the next letter.
 */
export function asName(value: string): string {
  return capitalise(nameOnly(value))
}
