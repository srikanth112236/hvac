import { useEffect, useRef, useState } from 'react'
import type { SiteMediaAsset } from '@hvac/shared'
import { cn } from '@/lib/cn'
import { Select } from '@/components/ui'
import { MediaPicker } from '@/admin/MediaPicker'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

type Tool = { label: string; title: string; run: () => void; className?: string }

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

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
  placeholder = 'Write the story…',
  minHeight = 300,
}: RichTextEditorProps) {
  const surface = useRef<HTMLDivElement>(null)
  const savedRange = useRef<Range | null>(null)
  const [mode, setMode] = useState<'visual' | 'html'>('visual')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [formatValue, setFormatValue] = useState('')

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

  const rememberSelection = () => {
    const node = surface.current
    const selection = window.getSelection()
    if (!node || !selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (node.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange()
    }
  }

  const restoreSelection = () => {
    const node = surface.current
    if (!node) return
    node.focus()
    const range = savedRange.current
    if (!range) return
    const selection = window.getSelection()
    if (!selection) return
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const exec = (command: string, argument?: string) => {
    restoreSelection()
    document.execCommand(command, false, argument)
    emit()
    rememberSelection()
  }

  const execStyled = (command: string, argument: string) => {
    restoreSelection()
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(command, false, argument)
    emit()
    rememberSelection()
  }

  const insertHtml = (html: string) => {
    restoreSelection()
    document.execCommand('insertHTML', false, html)
    emit()
    rememberSelection()
  }

  const link = () => {
    const url = window.prompt('Link URL', 'https://')
    if (!url) return
    exec('createLink', url)
  }

  const image = () => {
    rememberSelection()
    setPickerOpen(true)
  }

  const table = () => {
    const rows = Math.max(1, Math.min(12, Number(window.prompt('Table body rows', '3')) || 3))
    const columns = Math.max(1, Math.min(8, Number(window.prompt('Table columns', '3')) || 3))
    const header = `<tr>${Array.from(
      { length: columns },
      (_, index) =>
        `<th style="border:1px solid #c9c1b3;padding:8px;text-align:left">Column ${index + 1}</th>`,
    ).join('')}</tr>`
    const body = Array.from(
      { length: rows },
      () =>
        `<tr>${Array.from(
          { length: columns },
          () => '<td style="border:1px solid #c9c1b3;padding:8px">Cell</td>',
        ).join('')}</tr>`,
    ).join('')
    insertHtml(
      `<table style="width:100%;border-collapse:collapse;margin:16px 0"><thead>${header}</thead><tbody>${body}</tbody></table><p></p>`,
    )
  }

  const tools: (Tool | 'divider')[] = [
    { label: 'B', title: 'Bold', run: () => exec('bold'), className: 'font-bold' },
    { label: 'I', title: 'Italic', run: () => exec('italic'), className: 'italic' },
    { label: 'U', title: 'Underline', run: () => exec('underline'), className: 'underline' },
    {
      label: 'S',
      title: 'Strikethrough',
      run: () => exec('strikeThrough'),
      className: 'line-through',
    },
    { label: 'x²', title: 'Superscript', run: () => exec('superscript') },
    { label: 'x₂', title: 'Subscript', run: () => exec('subscript') },
    'divider',
    { label: '• List', title: 'Bulleted list', run: () => exec('insertUnorderedList') },
    { label: '1. List', title: 'Numbered list', run: () => exec('insertOrderedList') },
    { label: 'Quote', title: 'Block quote', run: () => exec('formatBlock', '<blockquote>') },
    { label: 'Code', title: 'Code block', run: () => exec('formatBlock', '<pre>') },
    'divider',
    { label: 'Indent', title: 'Indent', run: () => exec('indent') },
    { label: 'Outdent', title: 'Outdent', run: () => exec('outdent') },
    { label: 'Left', title: 'Align left', run: () => exec('justifyLeft') },
    { label: 'Centre', title: 'Align centre', run: () => exec('justifyCenter') },
    { label: 'Right', title: 'Align right', run: () => exec('justifyRight') },
    { label: 'Justify', title: 'Justify', run: () => exec('justifyFull') },
    'divider',
    { label: 'Link', title: 'Insert link', run: link },
    { label: 'Unlink', title: 'Remove link', run: () => exec('unlink') },
    { label: 'Image', title: 'Insert image', run: image },
    { label: 'Table', title: 'Insert table', run: table },
    { label: 'Rule', title: 'Divider line', run: () => exec('insertHorizontalRule') },
    'divider',
    { label: 'Clear', title: 'Clear formatting', run: () => exec('removeFormat') },
    { label: 'Undo', title: 'Undo', run: () => exec('undo') },
    { label: 'Redo', title: 'Redo', run: () => exec('redo') },
  ]

  const characters = value.replace(/<[^>]*>/g, '').trim().length
  const words = value
    .replace(/<[^>]*>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  return (
    <div className="border border-line bg-panel-2">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-line bg-panel/95 px-2 py-1.5 backdrop-blur">
        {mode === 'visual' ? (
          <>
            <Select
              aria-label="Text style"
              value={formatValue}
              containerClassName="w-28"
              className="h-7 px-1.5 py-0 text-[9px]"
              onChange={(event) => {
                const value = event.target.value
                setFormatValue(value)
                if (value) exec('formatBlock', `<${value}>`)
              }}
              options={[
                { value: 'p', label: 'Paragraph' },
                { value: 'h1', label: 'Heading 1' },
                { value: 'h2', label: 'Heading 2' },
                { value: 'h3', label: 'Heading 3' },
                { value: 'h4', label: 'Heading 4' },
              ]}
              placeholder="Format"
            />
            <span aria-hidden className="mx-1 h-4 w-px bg-line" />
            {tools.map((tool, index) =>
              tool === 'divider' ? (
                <span key={`divider-${index}`} aria-hidden className="mx-1 h-4 w-px bg-line" />
              ) : (
                <button
                  key={tool.label}
                  type="button"
                  title={tool.title}
                  aria-label={tool.title}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    rememberSelection()
                  }}
                  onClick={tool.run}
                  className={cn(
                    'h-7 rounded-[var(--radius-control)] px-2 font-mono text-[9px] uppercase tracking-[0.04em] text-fg-dim transition-colors duration-2 hover:bg-base hover:text-cold',
                    tool.className,
                  )}
                >
                  {tool.label}
                </button>
              ),
            )}
            <div className="ml-1 flex items-center gap-1">
              <label
                title="Text colour"
                className="flex h-7 w-8 cursor-pointer items-center justify-center border border-line"
              >
                <input
                  type="color"
                  aria-label="Text colour"
                  defaultValue="#12161a"
                  onMouseDown={rememberSelection}
                  onChange={(event) => execStyled('foreColor', event.target.value)}
                  className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                />
              </label>
              <label
                title="Highlight colour"
                className="flex h-7 w-8 cursor-pointer items-center justify-center border border-line"
              >
                <input
                  type="color"
                  aria-label="Highlight colour"
                  defaultValue="#e9dcc2"
                  onMouseDown={rememberSelection}
                  onChange={(event) => execStyled('hiliteColor', event.target.value)}
                  className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                />
              </label>
            </div>
          </>
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
          aria-label="Rich text body"
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={emit}
          onBlur={emit}
          onMouseUp={rememberSelection}
          onKeyUp={rememberSelection}
          onPaste={(event) => {
            // Paste as clean HTML rather than dragging in a page's stylesheet.
            event.preventDefault()
            const text =
              event.clipboardData.getData('text/html') || event.clipboardData.getData('text/plain')
            document.execCommand('insertHTML', false, text)
            emit()
          }}
          style={{ minHeight }}
          className="rich-surface px-4 py-4 text-[14px] leading-relaxed text-fg outline-none [&_a]:text-cold [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-cold/60 [&_blockquote]:pl-3 [&_blockquote]:text-fg-dim [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:font-display [&_h1]:text-[26px] [&_h1]:leading-tight [&_h1]:text-fg [&_h2]:mb-3 [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-[20px] [&_h2]:leading-tight [&_h2]:text-fg [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:font-display [&_h3]:text-[17px] [&_h3]:leading-tight [&_h3]:text-fg [&_h4]:mb-2 [&_h4]:mt-3 [&_h4]:font-semibold [&_h4]:text-fg [&_hr]:my-4 [&_hr]:border-line [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_li]:mb-1 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-line [&_pre]:bg-base [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[11px] [&_strong]:text-fg [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
        />
      ) : (
        <textarea
          aria-label="Rich text HTML"
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

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        defaultFolder="blog"
        title="Insert article image"
        onSelect={(asset: SiteMediaAsset) => {
          insertHtml(
            `<p><img src="${escapeAttribute(asset.url)}" alt="${escapeAttribute(asset.alt)}" style="max-width:100%;height:auto" /></p>`,
          )
          setPickerOpen(false)
        }}
      />
    </div>
  )
}
