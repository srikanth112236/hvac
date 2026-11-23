# Security verification log

Date: 2026-11-23  
Scope: API, public web build, admin, customer portal, data stores  
Method: code review, targeted exploit requests against a running API, production-mode
checks, build verification. **Not** a formal penetration test.

## Results

| # | Finding | Control | Test result |
|---|---|---|---|
| 1 | Portal email ownership takeover | Production registration creates `unverified`, emails a hashed 24 h token; verification moves it to `pending`; admin approval then `active`; no session before active | Register → `201 status:unverified`; verify → `200`, stored `pending`; token reuse → `400`; login → `403 pending_approval` |
| 2 | Default production credentials | `assertProductionConfig()` fails closed | Production start without env exited with an explicit error |
| 3 | Public content leaks | `publicSiteContent()` blanks bank fields, filters unpublished records | Public `accountNumber`/`bankName` empty; drafts absent; admin endpoint still full |
| 4 | Public endpoints unthrottled | Per-route + global limiter | 320 rapid requests → 287 × `200`, 33 × `429` |
| 5 | Newsletter stored XSS | `sanitize-html` allowlist + sandboxed iframe preview | `<script>`, `onclick`, `onerror`, `javascript:` removed from test payload |
| 6 | Upload MIME/extension spoofing | Magic-byte detection, signature-derived extension, batch validation | HTML disguised as `image/png` → `400 invalid_image`, no file/directory written |
| 7 | No CSP / consent | Build-time meta CSP, `_headers`, consent banner, opt-in GA4 | CSP present in `dist/index.html`; banner shown; “Essential only” persists and hides it; no tag loaded without opt-in |
| 8 | PII retention/export/delete | Erasure endpoint + UI, retention jobs, export, backups excluding sessions | Erase returned counts and removed customer/site/quote; `/admin/export` downloads a bundle; `/admin/data-health` reports 0 issues |
| 9 | Async handler failures | `express-async-errors` before route registration | Forced async throw → JSON `500`; process remained healthy |
| 10 | Plaintext PII at rest | AES-256-GCM store encryption; production requires a 32+ char key | Fresh production boot wrote `ENC1:` files; restart with the correct key read them; a wrong key refused to start |

Additional checks:

| Check | Result |
|---|---|
| `GET /api/v1/media` (public listing) | `404` — removed; admin listing remains |
| ETag / 304 on `/api/v1/content` | `304` with matching `If-None-Match` |
| Business timezone | Date-only `2026-12-05` afternoon → `2026-12-05T18:00:00.000Z` (America/Chicago) |
| `GET /api/v1/ready` | `200`, content readable, data directory writable |
| Request logging | `x-request-id` + one JSON line per request |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass |
| `npm run audit` (`--audit-level=high`) | Exit 0; 0 high / 0 critical; 32 moderate |
| Vite dev + preview | `200`; API proxy `200` |
| Test data after run | Removed; stores returned to seed/empty state |

## Remaining risks

- Media files under `uploads/` are public images and are not encrypted.
- Sessions, rate limits and jobs are process-local; one API instance until a
  shared store is added.
- 32 moderate advisories remain (admin Tiptap 2, React Router 6, dev-only Vite
  advisories). No high or critical.
- No third-party penetration test has been performed.
- The original 10-phase gap matrix still has product-level items outside this
  security pass: SSR, RBAC/multi-user, technician PWA, database migration.
