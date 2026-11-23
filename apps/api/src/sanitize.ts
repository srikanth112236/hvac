import sanitizeHtml from 'sanitize-html'

/**
 * Newsletter bodies arrive as HTML from the composer, but the API must not
 * trust that. This is the only place campaign HTML is accepted: scripts,
 * event handlers, iframes, forms and javascript: URLs are removed while the
 * inline styling the email template relies on is kept under a strict pattern.
 */
export function sanitizeNewsletterHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'small', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'blockquote', 'hr',
      'ul', 'ol', 'li', 'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'code', 'pre',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      table: ['cellpadding', 'cellspacing', 'border', 'role', 'width'],
      '*': ['style'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(/, /^[a-z]+$/i],
        'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgb\(/, /^[a-z]+$/i],
        'font-size': [/^\d+(\.\d+)?(px|pt|em|rem|%)$/i],
        'font-weight': [/^(normal|bold|[1-9]00)$/i],
        'font-family': [/^[\w\s,'"-]+$/],
        'text-align': [/^(left|right|center|justify)$/i],
        'text-decoration': [/^(none|underline|line-through)$/i],
        'line-height': [/^\d+(\.\d+)?(px|pt|em|rem|%)?$/i],
        margin: [/^[\d.\s]+(px|pt|em|rem|%)?([\s]+\S+)*$/i],
        padding: [/^[\d.\s]+(px|pt|em|rem|%)?([\s]+\S+)*$/i],
        border: [/^[\d.\s]+(px|pt|solid|dashed|none|#[0-9a-f]{3,8}|[a-z]+)*$/i],
        'border-radius': [/^\d+(\.\d+)?(px|pt|em|rem|%)$/i],
        width: [/^\d+(\.\d+)?(px|pt|em|rem|%)$/i, /^auto$/i],
        'max-width': [/^\d+(\.\d+)?(px|pt|em|rem|%)$/i],
        display: [/^(block|inline|inline-block|none|table|table-row|table-cell)$/i],
        'vertical-align': [/^(top|middle|bottom|baseline)$/i],
      },
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    },
  })
}
