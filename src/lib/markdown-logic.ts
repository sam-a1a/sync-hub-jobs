/**
 * The small part of Markdown a legal document actually uses — the parsing and
 * text logic, kept apart from `Markdown` itself (in `markdown.tsx`) so this
 * module exports nothing but plain functions. A file mixing a component with
 * other exports loses fast refresh for whatever else is in it.
 */

export type Block =
  | { kind: 'heading'; level: 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }

const HEADING = /^(#{2,3})\s+(.*)$/
const BULLET = /^[-*]\s+(.*)$/
const NUMBERED = /^\d+[.)]\s+(.*)$/

/**
 * Lines into blocks.
 *
 * Paragraphs are joined with spaces rather than kept as separate lines,
 * because the stored text is hard-wrapped for the sake of whoever edits it and
 * those line endings mean nothing to a reader.
 */
export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = []
  const lines = source.replace(/\r\n?/g, '\n').split('\n')

  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ').trim() })
    paragraph = []
  }

  const flushList = () => {
    if (!list) return
    blocks.push({ kind: 'list', ordered: list.ordered, items: list.items })
    list = null
  }

  const flush = () => {
    flushParagraph()
    flushList()
  }

  for (const raw of lines) {
    const line = raw.trim()

    if (line === '') {
      flush()
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      const [, hashes = '', text = ''] = heading
      flush()
      blocks.push({ kind: 'heading', level: hashes.length === 2 ? 2 : 3, text: text.trim() })
      continue
    }

    const bullet = BULLET.exec(line)
    const numbered = NUMBERED.exec(line)
    const item = bullet ?? numbered
    if (item) {
      const ordered = numbered !== null
      const text = (item[1] ?? '').trim()

      flushParagraph()
      if (list && list.ordered !== ordered) flushList()
      list ??= { ordered, items: [] }
      list.items.push(text)
      continue
    }

    if (list && list.items.length > 0) {
      list.items[list.items.length - 1] += ` ${line}`
      continue
    }

    paragraph.push(line)
  }

  flush()
  return blocks
}

export const BOLD_OR_LINK = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))/g
export const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/

export function isSafeHref(href: string): boolean {
  return /^(https?:|mailto:|\/)/i.test(href)
}

/**
 * The same inline markers, resolved to characters instead of to elements.
 *
 * `**bold**` loses its asterisks, because nothing carries weight in a
 * clipboard. A link keeps its label and gains its address in brackets — the
 * reason to copy a clause is usually to paste it somewhere that cannot be
 * clicked. Same-site and `mailto:` links keep only their label.
 */
export function inlineText(text: string): string {
  return text.replace(BOLD_OR_LINK, (token) => {
    const link = LINK.exec(token)
    if (!link) return token.slice(2, -2)

    const [, label = '', href = ''] = link
    return isSafeHref(href) && /^https?:/i.test(href) ? `${label} (${href})` : label
  })
}

/**
 * The whole document as text, for the clipboard.
 *
 * It has to carry the section numbers, and this is the one place they are not
 * free: on the page they come from CSS counters, so a selection dragged across
 * the article copies the headings without them. The counters are walked again
 * here, by the same rule the stylesheet uses.
 */
export function plainText(source: string): string {
  const blocks = parseMarkdown(source)
  const parts: string[] = []

  let section = 0
  let subsection = 0

  for (const block of blocks) {
    if (block.kind === 'heading') {
      if (block.level === 2) {
        section += 1
        subsection = 0
        parts.push(`${section}. ${inlineText(block.text)}`)
      } else {
        subsection += 1
        parts.push(`${section}.${subsection}. ${inlineText(block.text)}`)
      }
      continue
    }

    if (block.kind === 'paragraph') {
      parts.push(inlineText(block.text))
      continue
    }

    parts.push(
      block.items
        .map((item, index) => `${block.ordered ? `${index + 1}.` : '•'} ${inlineText(item)}`)
        .join('\n'),
    )
  }

  return parts.join('\n\n')
}

/**
 * Anchors for every heading, keyed by the block that carries them.
 *
 * One function rather than a slug helper called twice, because the contents
 * rail and the headings it points at have to agree — and a slug alone cannot
 * make them: two sections with the same words slugify to the same thing, so
 * both need to know their position among the headings to come out distinct.
 */
export function headingIds(blocks: Block[]): Map<number, string> {
  const ids = new Map<number, string>()
  const taken = new Set<string>()
  let ordinal = 0

  blocks.forEach((block, index) => {
    if (block.kind !== 'heading') return
    ordinal += 1

    const base = slugify(block.text) || `section-${ordinal}`
    let id = base
    let suffix = 2
    while (taken.has(id)) id = `${base}-${suffix++}`

    taken.add(id)
    ids.set(index, id)
  })

  return ids
}

/** A heading's anchor, as far as the characters allow. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/** The `##` headings, for building a contents rail. */
export function outline(source: string): { text: string; id: string }[] {
  const blocks = parseMarkdown(source)
  const ids = headingIds(blocks)

  return blocks.flatMap((block, index) =>
    block.kind === 'heading' && block.level === 2
      ? [{ text: block.text, id: ids.get(index) ?? '' }]
      : [],
  )
}
