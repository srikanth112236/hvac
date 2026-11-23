import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

function inline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g
  const nodes: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null
  let index = 0

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
    const token = match[0] ?? ''
    const key = `${keyPrefix}-${index++}`

    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (!linkMatch) {
        nodes.push(token)
      } else {
        const label = linkMatch[1]
        const href = linkMatch[2]
        if (!label || !href) {
          nodes.push(token)
        } else {
          const safe = href.startsWith('/') || /^https?:\/\//.test(href)
          if (!safe) {
            nodes.push(label)
          } else if (href.startsWith('/')) {
            nodes.push(
              <Link key={key} to={href}>
                {label}
              </Link>,
            )
          } else {
            nodes.push(
              <a key={key} href={href} target="_blank" rel="noreferrer">
                {label}
              </a>,
            )
          }
        }
      }
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    } else {
      nodes.push(token)
    }

    cursor = match.index + token.length
  }

  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

export function headingId(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/[`*]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Renders the Markdown subset the CMS editor documents: headings, lists, quotes, bold, italic, code and links. */
export function MarkdownArticle({ markdown, className }: { markdown: string; className?: string }) {
  const blocks = markdown.trim().split(/\n\s*\n/)

  return (
    <div className={`article-body ${className ?? ''}`}>
      {blocks.map((block, blockIndex) => {
        const lines = block
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
        if (!lines.length) return null

        const heading = /^(#{2,4})\s+(.+)$/.exec(lines[0] ?? '')
        if (heading && lines.length === 1) {
          const hashes = heading[1]
          const rawHeading = heading[2]
          if (!hashes || !rawHeading) return null
          const level = hashes.length
          const content = inline(rawHeading, `h-${blockIndex}`)
          const id = headingId(rawHeading)
          if (level === 2) {
            return (
              <h2 key={blockIndex} id={id} className="scroll-mt-[calc(var(--header-h)+24px)]">
                {content}
              </h2>
            )
          }
          if (level === 3) {
            return (
              <h3 key={blockIndex} id={id} className="scroll-mt-[calc(var(--header-h)+24px)]">
                {content}
              </h3>
            )
          }
          return <h4 key={blockIndex}>{content}</h4>
        }

        if (lines.every((line) => line.startsWith('> '))) {
          return (
            <blockquote key={blockIndex}>
              {inline(lines.map((line) => line.slice(2)).join(' '), `q-${blockIndex}`)}
            </blockquote>
          )
        }

        if (lines.every((line) => /^[-*]\s+/.test(line))) {
          return (
            <ul key={blockIndex}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{inline(line.replace(/^[-*]\s+/, ''), `u-${blockIndex}-${lineIndex}`)}</li>
              ))}
            </ul>
          )
        }

        if (lines.every((line) => /^\d+\.\s+/.test(line))) {
          return (
            <ol key={blockIndex}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{inline(line.replace(/^\d+\.\s+/, ''), `o-${blockIndex}-${lineIndex}`)}</li>
              ))}
            </ol>
          )
        }

        return <p key={blockIndex}>{inline(lines.join(' '), `p-${blockIndex}`)}</p>
      })}
    </div>
  )
}
