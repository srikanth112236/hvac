# Revision control

`/admin/content/revisions` is the content restore ledger. It is intentionally
separate from the content editor: one workspace publishes, one workspace
audits and restores.

## Two workspaces

**Versions** is the complete ledger. Every publish is one row with version,
published time, author, pages touched, field-change count, note and actions.
Filters cover free-text search (including changed field names and before/after
copy), page, author, date range and sort order. Rows are paginated and the
current live version is marked.

**Page by page** starts with every page exposed by the CMS page registry, the
same source used by the Content Studio page tree. The list includes all single
pages, collection pages and detail-editor pages, plus the global brand and SEO
scopes. It is not a second hardcoded page list: renaming a CMS page, adding a
collection or changing a route updates both workspaces.

Every current record with its own public route is also an independent card:

- service details at `/services/{id}`;
- legal documents at `/legal/{slug}`;
- journal articles at `/blog/{slug}`;
- work cases, system details and AMC plans with their public index and anchor
  routes.

Each card reads the live CMS record list, so adding a service or article adds a
page card immediately. Its timeline filters the revision changes to that exact
record path (for example `services.split-ac-installation`), instead of showing
the whole collection. Cards without history stay visible with **No content
changes yet**.

Collection cards remain as parents for page-level copy and collection-wide
changes. Historical pages that are no longer in the current CMS page tree, or
historical legal documents that were removed, remain visible when they have
revision history.

The ledger refreshes in the background and after any publish, so the page list
and revision counts stay synced with the live CMS. A page card shows its route,
revision count, last version and field-change count. Opening a page shows only
the revisions that touched that page or record, with the full before/after diff.

## Restore scopes

Every restore publishes a new version; no snapshot is deleted or overwritten.

| Scope            | What changes                                 | Use when                                                        |
| ---------------- | -------------------------------------------- | --------------------------------------------------------------- |
| Selected fields  | Only checked changed fields on the open page | A single headline, price or paragraph needs to go back          |
| Page             | Every content field owned by that page       | A page changed in several places, or records were added/removed |
| Complete version | The whole site content document              | A publish needs to be rolled back end to end                    |

Added and removed records cannot be restored as isolated fields. Restoring one
leaf of a record that no longer exists would produce invalid content, so the UI
disables those checkboxes and directs the operator to page or complete-version
restore. The API enforces the same rule.

The API also verifies that a field restore still has a valid parent in the live
document and validates the resulting `SiteContentPayload` before publishing.

## Safety

- The current live version is always visible.
- A selected-field restore is rejected if the parent record was removed later.
- A page restore leaves every other page untouched.
- A complete restore explicitly warns that it replaces all content.
- Every restore creates a new revision with a note such as
  `Restored 2 fields on Home from v21`.
- Restoring never affects CRM, invoices, quotations or newsletters; those
  modules keep their own operational histories.

## API

`GET /api/v1/admin/content/revisions`

`POST /api/v1/admin/content/revisions/:version/restore`

```json
{ "pageId": "home", "paths": ["home.heroTitle", "home.heroLead"] }
```

`pageId` and `paths` are optional. Without either, the complete version is
restored. With `pageId`, only that page is restored. With `paths`, only those
changed fields are restored.

Record-level page restore accepts `service:<id>`, `work-case:<id>`,
`product:<id>`, `plan:<id>`, `post:<id>` and `legal:<slug>`. It upserts only
that record so the page card can restore a single service, case, system, plan,
article or legal document without replacing its siblings.

## Verification

```bash
npm run typecheck
npm run lint
npm run test             # includes field-restore unit tests
npm run test:e2e         # includes revision ledger workspace test
npm run test:ssr
```
