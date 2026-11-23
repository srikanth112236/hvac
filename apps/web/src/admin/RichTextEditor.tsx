import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

type Tool = { label: string; title: string; run: () => void; className?: string }

/**
 * Dependency-free rich text composer.
 *
 * The toolbar drives `document.execCommand` against a contentEditable surface,
 * which keeps the stored value as plain HTML that can be previewed, emailed or
 * exported without a framework-specific serialiser. The HTML tab is the escape
 * hatch for pasting a designed email or hand-editing markup.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write the campaign…',
  minHeight = 300,
}: RichTextEditorProps) {
  const surface = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'visual' | 'html'>('visual')

  useEffect(() => {
    const node = surface.current
    if (!node) return
    if (document.activeElement === node) return
    if (node.innerHTML !== value) node.innerHTML = value
  }, [value, mode])

  const emit = () => {
    const node = surface.current
    if (node) onChange(node.innerHTML)
  }

  const exec = (command: string, argument?: string) => {
    const node = surface.current
    if (!node) return
    node.focus()
    document.execCommand(command, false, argument)
    emit()
  }

  const link = () => {
    const url = window.prompt('Link URL', 'https://')
    if (!url) return
    exec('createLink', url)
  }

  const tools: (Tool | 'divider')[] = [
    { label: 'B', title: 'Bold', run: () => exec('bold'), className: 'font-bold' },
    { label: 'I', title: 'Italic', run: () => exec('italic'), className: 'italic' },
    { label: 'U', title: 'Underline', run: () => exec('underline'), className: 'underline' },
    { label: 'S', title: 'Strikethrough', run: () => exec('strikeThrough'), className: 'line-through' },
    'divider',
    { label: 'H2', title: 'Heading', run: () => exec('formatBlock', '<h2>') },
    { label: 'P', title: 'Paragraph', run: () => exec('formatBlock', '<p>') },
    { label: 'Quote', title: 'Block quote', run: () => exec('formatBlock', '<blockquote>') },
    'divider',
    { label: '• List', title: 'Bulleted list', run: () => exec('insertUnorderedList') },
    { label: '1. List', title: 'Numbered list', run: () => exec('insertOrderedList') },
    { label: 'Link', title: 'Insert link', run: link },
    { label: 'Rule', title: 'Divider line', run: () => exec('insertHorizontalRule') },
    'divider',
    { label: 'Clear', title: 'Clear formatting', run: () => exec('removeFormat') },
    { label: 'Undo', title: 'Undo', run: () => exec('undo') },
  ]

  const characters = value.replace(/<[^>]*>/g, '').trim().length
  const words = value.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="border border-line bg-panel-2">
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-panel/40 px-2 py-1.5">
        {mode === 'visual' ? (
          tools.map((tool, index) =>
            tool === 'divider' ? (
              <span key={`divider-${index}`} aria-hidden className="mx-1 h-4 w-px bg-line" />
            ) : (
              <button
                key={tool.label}
                type="button"
                title={tool.title}
                aria-label={tool.title}
                onMouseDown={(event) => event.preventDefault()}
                onClick={tool.run}
                className={cn(
                  'h-7 rounded-[var(--radius-control)] px-2 font-mono text-[10px] uppercase tracking-[0.06em] text-fg-dim transition-colors duration-2 hover:bg-base hover:text-cold',
                  tool.className,
                )}
              >
                {tool.label}
              </button>
            ),
          )
        ) : (
          <span className="px-1 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
            HTML source · inline styles are welcome
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {(['visual', 'html'] as const).map((entry) => (
            <button
              key={entry}
              type="button"
              aria-pressed={mode === entry}
              onClick={() => setMode(entry)}
              className={cn(
                'h-7 px-2 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors duration-2',
                mode === entry ? 'bg-cold/[0.12] text-cold' : 'text-fg-faint hover:text-fg',
              )}
            >
              {entry === 'visual' ? 'Visual' : 'HTML'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'visual' ? (
        <div
          ref={surface}
          role="textbox"
          aria-multiline="true"
          aria-label="Campaign body"
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={emit}
          onBlur={emit}
          onPaste={(event) => {
            // Paste as clean HTML rather than dragging in a page's stylesheet.
            event.preventDefault()
            const text = event.clipboardData.getData('text/html') || event.clipboardData.getData('text/plain')
            document.execCommand('insertHTML', false, text)
            emit()
          }}
          style={{ minHeight }}
          className="rich-surface px-4 py-4 text-[14px] leading-relaxed text-fg outline-none [&_a]:text-cold [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-cold/60 [&_blockquote]:pl-3 [&_blockquote]:text-fg-dim [&_h2]:mb-3 [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-[20px] [&_h2]:leading-tight [&_h2]:text-fg [&_hr]:my-4 [&_hr]:border-line [&_li]:mb-1 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_strong]:text-fg [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
        />
      ) : (
        <textarea
          aria-label="Campaign HTML"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          style={{ minHeight }}
          className="w-full resize-y bg-transparent px-4 py-4 font-mono text-[12px] leading-relaxed text-fg-dim outline-none"
        />
      )}

      <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
        <span>
          {words} words · {characters} characters
        </span>
        <span>{mode === 'visual' ? 'Rich text' : 'Raw HTML'}</span>
      </div>
    </div>
  )
}
