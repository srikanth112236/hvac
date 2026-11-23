# Security verification log

Date: 2026-11-23  
Scope: API, public web build, admin, customer portal, data stores  
Method: code review, targeted exploit requests against a running API, production-mode
checks, build verification. **Not** a formal penetration test.

## Results

| #   | Finding                         | Control                                                                                                                                                                                       | Test result                                                                                                                                                                                                  |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Portal email ownership takeover | Production registration creates `unverified`, emails a hashed 24 h token; verification moves it to `pending`; admin approval then `active`; no session before active                          | Register → `201 status:unverified`; verify → `200`, stored `pending`; token reuse → `400`; login → `403 pending_approval`                                                                                    |
| 2   | Default production credentials  | `assertProductionConfig()` fails closed                                                                                                                                                       | Production start without env exited with an explicit error                                                                                                                                                   |
| 3   | Public content leaks            | `publicSiteContent()` blanks bank fields, filters unpublished records                                                                                                                         | Public `accountNumber`/`bankName` empty; drafts absent; admin endpoint still full                                                                                                                            |
| 4   | Public endpoints unthrottled    | Per-route + global limiter                                                                                                                                                                    | 320 rapid requests → 287 × `200`, 33 × `429`                                                                                                                                                                 |
| 5   | Newsletter stored XSS           | `sanitize-html` allowlist + sandboxed iframe preview                                                                                                                                          | `<script>`, `onclick`, `onerror`, `javascript:` removed from test payload                                                                                                                                    |
| 6   | Upload MIME/extension spoofing  | Magic-byte detection, signature-derived extension, batch validation                                                                                                                           | HTML disguised as `image/png` → `400 invalid_image`, no file/directory written                                                                                                                               |
| 7   | No CSP / consent                | Build-time meta CSP, `_headers`, consent banner, opt-in GA4                                                                                                                                   | CSP present in `dist/index.html`; banner shown; “Essential only” persists and hides it; no tag loaded without opt-in                                                                                         |
| 8   | PII retention/export/delete     | Erasure endpoint + UI, retention jobs, export, backups excluding sessions                                                                                                                     | Erase returned counts and removed customer/site/quote; `/admin/export` downloads a bundle; `/admin/data-health` reports 0 issues                                                                             |
| 9   | Async handler failures          | `express-async-errors` before route registration                                                                                                                                              | Forced async throw → JSON `500`; process remained healthy                                                                                                                                                    |
| 10  | Plaintext PII at rest           | AES-256-GCM store encryption; production requires a 32+ char key                                                                                                                              | Fresh production boot wrote `ENC1:` files; restart with the correct key read them; a wrong key refused to start                                                                                              |
| 11  | Single shared admin account     | Multi-user RBAC with a shared permission matrix and write-role enforcement                                                                                                                    | Owner/manager/accountant tests: manager writes reminders, accountant is blocked from reminders, both blocked from export; viewer is blocked from writes and user management                                  |
| 12  | Dependency advisories           | Zod 4, React Router 7, Vite 8, unused Tiptap removed                                                                                                                                          | `npm audit` reports 0 vulnerabilities                                                                                                                                                                        |
| 13  | No second factor for staff      | Email OTP 2FA, hashed codes, expiry, attempt/resend caps; no SMS channel                                                                                                                      | Enable → mail captured → confirm; login → `requires2fa` with no cookie; wrong code `401`; correct code issues a session; test suite covers the flow                                                          |
| 14  | Client-only HTML for crawlers   | True SSR with live content, serialised content/theme bootstrap, server-generated title/canonical/OG/JSON-LD, hydration                                                                        | `x-render-mode: ssr`; one canonical, one description, one JSON-LD block; route title changes; unknown service returns `404`; `npm run test:ssr` passes 102/102 route×theme checks with no hydration errors   |
| 15  | Theme mismatch on SSR           | Server validates the `theme` query (`foundry` or `atelier`), injects matching `<html data-theme>`/classes and bootstrap theme; client hydrates that theme before adopting a stored preference | Both themes verified on all 51 public routes; hydrated `data-theme`/class matched the server response                                                                                                        |
| 16  | Portal modules partial          | Quotations, AMC, equipment history, support tickets and notification preferences included in the API integration flow                                                                         | Customer file exposes quote, AMC, equipment and report; quote acceptance, AMC renewal, preference toggles and desk ticket reply all return `200/201`; disabling billing email suppresses a new invoice email |
| 17  | Calculators duplicated          | Six standalone `/tools/<slug>` pages; service pages link to the tool instead of embedding a second calculator                                                                                 | `/tools` cards navigate to dedicated pages; `/tools/room-tonnage` renders the sizing form and enquiry hand-off; sitemap and SSR include all six                                                              |

Additional checks:

| Check                                  | Result                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `GET /api/v1/media` (public listing)   | `404` — removed; admin listing remains                                                            |
| ETag / 304 on `/api/v1/content`        | `304` with matching `If-None-Match`                                                               |
| Business timezone                      | Date-only `2026-12-05` afternoon → `2026-12-05T18:00:00.000Z` (America/Chicago)                   |
| `GET /api/v1/ready`                    | `200`, content readable, data directory writable                                                  |
| Request logging                        | `x-request-id` + one JSON line per request                                                        |
| `npm run typecheck`                    | Pass                                                                                              |
| `npm run lint`                         | Pass                                                                                              |
| `npm run test`                         | 14 API/unit tests pass (including email OTP, RBAC, permissions matrix and portal modules)         |
| `npm run build`                        | Pass (client + SSR entry)                                                                         |
| `npm run audit` (`--audit-level=high`) | Exit 0; **0 vulnerabilities**                                                                     |
| SSR verification                       | `x-render-mode: ssr`; title/canonical/JSON-LD present; serialised content/theme bootstrap present |
| SSR hydration `npm run test:ssr`       | 102/102 checks pass: 51 sitemap routes × foundry/atelier, no hydration/server-mismatch errors     |
| Portal/admin shells                    | `x-render-mode: spa`, `X-Robots-Tag: noindex, nofollow`                                           |
| SSR bundle exposure                    | `/server/entry-server.js` returns `404`                                                           |
| Vite dev + preview                     | `200`; API proxy `200`                                                                            |
| Test data after run                    | Removed; stores returned to seed/empty state                                                      |

## Remaining risks

- Media files under `uploads/` are public images and are not encrypted.
- Sessions, rate limits, in-flight 2FA challenges and jobs are process-local; one
  API instance until a shared store is added.
- The Azure Terraform template has not been applied or validated against a
  subscription in this workspace.
- No third-party penetration test has been performed.
- Remaining product gaps: a true job model/AMC auto-visit generation and a
  multi-instance database. SSR, RBAC, email 2FA and the portal modules are
  implemented.
