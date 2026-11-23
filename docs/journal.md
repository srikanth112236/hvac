# Journal editor

`/admin/blog` is the article index. Adding and editing happen on dedicated
routes (`/admin/blog/new`, `/admin/blog/:postId`) instead of inline cards on the
index.

## List

The index shows every article with status, category, author, publish/update
dates, filters and search. Published articles link to the live page.

## Editor

Each article has its own page with:

- headline, slug generator, excerpt and direct answer;
- a complete rich-text body editor;
- takeaways, related services and article FAQs;
- publication state, featured pin, category, author, dates and reading time;
- cover image from the media library;
- SEO title and description;
- delete action with confirmation.

Existing Markdown articles are converted to the rich editor when opened. Saving
stores plain text in `body` for reading time and search fallback, and sanitised
HTML in `bodyHtml` for the public article.

## Rich-text toolbar

The dependency-free editor supports:

- paragraphs, H1-H4, block quotes and code blocks;
- bold, italic, underline, strikethrough, superscript and subscript;
- bulleted and numbered lists;
- indent and outdent;
- left, centre, right and justified alignment;
- links, unlink, media-library images, tables and horizontal rules;
- text colour and highlight colour;
- clear formatting, undo and redo;
- visual and HTML source views, with word and character counts.

Article HTML is sanitised by the API with the same strict allowlist used for
newsletter HTML before it is stored. The public article renders sanitised
`bodyHtml`; older articles continue through the Markdown renderer when no HTML
body exists.

## Verification

`e2e/blog.spec.ts` covers the article index, separate new-article route, slug
generator, rich toolbar, editor body and existing-article edit route.
