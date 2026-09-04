import { Fragment, type ReactNode } from 'react'
import { BOLD_OR_LINK, headingIds, isSafeHref, LINK, parseMarkdown } from './markdown-logic'

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let index = 0

  for (const match of text.matchAll(BOLD_OR_LINK)) {
    const at = match.index ?? 0
    if (at > last) nodes.push(text.slice(last, at))

    const token = match[0]
    const link = LINK.exec(token)
    const label = link?.[1] ?? ''
    const href = link?.[2] ?? ''

    if (link && isSafeHref(href)) {
      const external = /^https?:/i.test(href)
      nodes.push(
        <a
          key={`${keyPrefix}-${index++}`}
          href={href}
          {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
          className="font-medium text-ink underline underline-offset-4 transition-colors duration-300 ease-[var(--ease-standard)] hover:text-teal-600 dark:hover:text-teal-400"
        >
          {label}
        </a>,
      )
    } else if (link) {
      // Refused, but the words the author wrote still belong on the page.
      nodes.push(label)
    } else {
      nodes.push(<strong key={`${keyPrefix}-${index++}`}>{token.slice(2, -2)}</strong>)
    }

    last = at + token.length
  }

  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}


/** Renders one document body. */
export function Markdown({ source }: { source: string }) {
  const blocks = parseMarkdown(source)
  const ids = headingIds(blocks)

  return (
    <>
      {blocks.map((block, index) => {
        const key = `b${index}`

        if (block.kind === 'heading') {
          const Tag = block.level === 2 ? 'h2' : 'h3'
          return (
            <Tag key={key} id={ids.get(index)} className={`legal-h${block.level}`}>
              {inline(block.text, key)}
            </Tag>
          )
        }

        if (block.kind === 'paragraph') {
          return (
            <p key={key} className="legal-p">
              {inline(block.text, key)}
            </p>
          )
        }

        const List = block.ordered ? 'ol' : 'ul'
        return (
          <List key={key} className={block.ordered ? 'legal-ol' : 'legal-ul'}>
            {block.items.map((item, itemIndex) => (
              <li key={`${key}-${itemIndex}`}>
                <Fragment>{inline(item, `${key}-${itemIndex}`)}</Fragment>
              </li>
            ))}
          </List>
        )
      })}
    </>
  )
}
