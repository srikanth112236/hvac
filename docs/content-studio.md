# Content studio

The content studio is the single editor for public copy, collections, brand
identity, theme tokens and SEO. It lives at `/admin/content` and is split into
four workspaces:

1. **Pages & sections** — every single page and every collection record.
2. **Brand & contact** — business identity, contact details, logo, favicon,
   share image and global theme tokens.
3. **Billing identity** — bank, invoice prefix, terms and notes used by server
   PDFs.
4. **SEO & social** — title template, descriptions, canonical base, robots,
   sharing image and per-page SEO overrides.

The previous 17-tab editor is retained at `/admin/content/classic` as a
rollback path. It is not the default and should not receive new features.

## Architecture

- `apps/web/src/admin/contentRegistry.ts` is the page registry. It maps each
  public route or collection to one editor and is the single source for the
  page tree. Add a new record type here and wire its editor in
  `ContentStudioV2.tsx`.
- `apps/web/src/admin/contentStudioAdapter.ts` is the migration adapter. It
  fills optional fields introduced by the studio (`brand.logo`, favicon and
  social image) without rewriting old `content.json` files. The v2 studio
  normalises a draft as it loads it; saving persists the normalised shape.
- `apps/web/src/admin/ContentStudioV2.tsx` owns the four-workspace shell,
  draft state, validation, conflict handling and publishing.
- `apps/web/src/admin/ContentThemeTab.tsx` edits logo, favicon, share image,
  palette, button tokens and a live preview.
- Single pages use `PageStudio` in page mode. Collections reuse the existing
  specialised editors so every field still has a bespoke control.
- The document model remains `SiteContent` in `packages/shared/src/site.ts`.
  There is no second content model to keep in sync.

## Drafts and publishing

- Editing changes the in-memory draft and marks the page with a heat dot in
  the page tree. Draft state survives page/workspace switching.
- **Publish changes** validates the whole payload against
  `siteContentPayloadSchema` before sending it. Invalid fields are listed by
  path and publishing is blocked.
- Publishing sends `If-Match: <version>`. A concurrent publish returns `412`;
  the studio shows a conflict panel with **Reload live** and a link to the
  revision ledger.
- Every successful publish creates a revision. The ledger at
  `/admin/content/revisions` supports preview, field-level diff and restore.
  Restores publish a new version and keep the old snapshot. See
  `docs/revisions.md` for the version/page/field restore workspaces.
- The public site receives content through the existing bootstrap/SSR path.
  Open public tabs pick up the change through the content event and 10-second
  poll.

## Page coverage

The parity suite (`e2e/content-studio.spec.ts`) walks every registry entry,
asserts the four workspaces, opens each editor, checks the brand/theme panels
and verifies the classic fallback. It must pass before the studio is promoted.

| Editor         | Pages / collections                                                                          |
| -------------- | -------------------------------------------------------------------------------------------- |
| PageStudio     | Home, Services index, Process, About, Work index, AMC, Journal index, Systems index, Contact |
| Services       | Service detail records                                                                       |
| Work           | Work cases                                                                                   |
| Products       | System/product records                                                                       |
| Plans          | AMC plans                                                                                    |
| AMC detail     | Visit schedule, SLA, questions, inclusions                                                   |
| Process        | Delivery stages and extras                                                                   |
| FAQs           | Reusable questions                                                                           |
| Legal          | Policy documents                                                                             |
| Voices         | Testimonials and equipment brands                                                            |
| About sections | Shared about-page sections                                                                   |
| Journal        | Article records live on `/admin/blog`                                                        |

## Add page wizard

The page tree’s **Add** action creates a draft record of an existing template:
service detail, work case, system/product, legal page, FAQ or AMC plan. The
wizard asks for a title and slug, creates an unpublished record, selects its
collection and leaves publishing as an explicit action. New visual block types
still require code.

## Theme, logo and SEO

- Logo, wordmark, favicon and share image are stored on `SiteContent.brand`.
  The header falls back to the monogram when no logo is set.
- Theme tokens are stored on `SiteContent.theme`. Tokens are RGB triplets
  because the design system renders them with opacity. Button primary colours,
  ink and radius are separate fields.
- The server injects the published tokens into the first HTML response and
  sanitises the values before they reach the inline stylesheet. The client
  applies the same tokens after hydration.
- `theme.defaultVariant` is used as the server-rendered theme when no
  `?theme=` override is present and no saved visitor preference wins.
- SEO falls back to `brand.socialImage` and the logo for Open Graph and
  organization JSON-LD when no page-specific sharing image is configured.

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:ssr       # 51 routes × 2 themes = 102 checks
npx playwright test e2e/content-studio.spec.ts
```

The parity test is the promotion gate. If an editor is added to the registry,
add it to the test’s page id list at the same time.

Last promotion run: **19/19 registry editors opened**, 4/4 workspaces present,
0 page errors, classic fallback reachable; the full Playwright suite was
**11/11** and SSR hydration was **102/102** route checks.
