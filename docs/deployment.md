# Deployment and upgrade runbook

## Architecture

```
Internet
  └─ TLS / WAF / CDN
       ├─ /            → Node web host (apps/web/server.mjs: SSR + hydration)
       ├─ /uploads     → API (or object storage with the same path contract)
       └─ /api/v1      → Node API (apps/api)
```

The web host renders public routes on the server with the live content document,
injects per-route title/description/canonical/Open Graph/JSON-LD, then hydrates
the same markup in the browser. `/admin`, `/portal` and the styleguide are
client-only shells. When the API is unreachable the server falls back to the
bundled content so the public site still answers.

`infra/terraform` contains the Azure template for staging/production workspaces,
including Key Vault, App Insights, 5xx alerts and availability tests. It is a
template and must be validated against a sandbox subscription before applying.

Serving the web build and the API under one origin avoids CORS entirely and keeps
cookies `SameSite=Strict`. If they must be separate origins, set
`ALLOWED_ORIGINS` to the exact web origin and use HTTPS on both.

## Required environment

| Variable                               | Required    | Notes                                                                                                                                                       |
| -------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                             | production  | Enables production checks                                                                                                                                   |
| `PORT`                                 | no (4000)   | API listener                                                                                                                                                |
| `ADMIN_EMAIL`                          | **yes**     | Owner login                                                                                                                                                 |
| `ADMIN_PASSWORD`                       | **yes**     | 12+ characters; production refuses to boot without it                                                                                                       |
| `DATA_ENCRYPTION_KEY`                  | **yes**     | 32+ characters; AES-256-GCM key for the JSON stores. Keep it in the secret manager — losing it makes existing data unreadable, and changing it fails closed |
| `ALLOWED_ORIGINS`                      | **yes**     | Comma-separated exact origins (`https://client.com`)                                                                                                        |
| `PUBLIC_SITE_URL`                      | **yes**     | Absolute web origin used in reset links                                                                                                                     |
| `BUSINESS_TIMEZONE`                    | no          | IANA zone, default `America/Chicago`                                                                                                                        |
| `RESEND_API_KEY` or `MAIL_WEBHOOK_URL` | for mail    | Without one, sends are logged as skipped                                                                                                                    |
| `MAIL_FROM`                            | recommended | e.g. `Client HVAC <no-reply@client.com>`                                                                                                                    |
| `PUBLIC_BRAND_NAME`                    | recommended | Brand name used in the 2FA email shell                                                                                                                      |
| `ADMIN_NOTIFY_EMAIL`                   | recommended | Desk inbox for leads, reminders, digests                                                                                                                    |
| `UPLOAD_ROOT`                          | no          | Defaults to the repo `uploads/` directory                                                                                                                   |
| `AUDIT_RETENTION_DAYS`                 | no          | Default 365                                                                                                                                                 |
| `EMAIL_LOG_RETENTION_DAYS`             | no          | Default 180                                                                                                                                                 |

### Staff 2FA recovery

Email OTP is the only second factor; there is no SMS fallback. If the mail
provider is permanently lost and the owner is locked out, use the documented
break-glass: stop the API, remove `apps/api/data/admin-2fa.json`, then restart.
That clears every staff 2FA preference (passwords and sessions are untouched) and
allows a fresh sign-in. Restrict server access to the same people who hold
`DATA_ENCRYPTION_KEY`; deleting the file is a privileged recovery action, not a
routine reset.

Front-end build variables:

```env
VITE_THEME=foundry|atelier
VITE_API_URL=/api/v1
VITE_GA_MEASUREMENT_ID=        # optional; loads only after consent
```

## Build

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build          # build:client + build:server (SSR entry)
npm run test:ssr       # 45 public routes × foundry/atelier hydration audit
```

`npm run build:client` writes the browser bundle; `npm run build:server` writes
`dist/server/entry-server.js`. Run the web host against the build and API:

```bash
API_ORIGIN=http://127.0.0.1:4000 npm run serve:web
```

`npm run build` produces `apps/web/dist` (client assets) and
`apps/web/dist/server/entry-server.js` (SSR entry). `server.mjs` renders public
routes with the live content feed, proxies `/api`, `/uploads`, `/sitemap.xml`,
`/robots.txt`, `/llms.txt` and `/feed.xml` to the API, and serves `/admin` and
`/portal` as client shells. SSR HTML is `no-cache`; hashed assets are immutable.
The first response includes `<script id="hvac-bootstrap" type="application/json">`
with the serialised content and theme; `main.tsx` hydrates from that exact
payload. `?theme=foundry|atelier` forces the server-rendered theme.
`/admin`, `/portal`, the styleguide and 404 responses send `X-Robots-Tag:
noindex, nofollow`. The SSR bundle and `index.template.html` are blocked from
static serving.

`npm run build:prerender` is optional. It writes static fallbacks to
`dist/<route>.html` for hosts that cannot run Node; the SSR server still takes
precedence. Re-run it only when a static fallback is required — live content is
read at request time and refreshed by the client after hydration.

The API runs TypeScript directly with `tsx`; start it with
`npm run start -w @hvac/api` (or under a process manager).

Serve `apps/web/dist` with the host of your choice. The build copies
`public/_headers` (Cloudflare Pages / Netlify) and injects a CSP meta tag. If
the host ignores `_headers`, set the same headers at the reverse proxy:

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: https://www.google-analytics.com https://region1.google-analytics.com; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

## Health and readiness

- `GET /api/v1/health` — process alive, mail configuration state.
- `GET /api/v1/ready` — content readable and the data directory writable.
- Every response carries `x-request-id`; requests log one JSON line with
  method, path, status and duration (health/ready excluded).

## Data and backups

- Migrations run at API startup (`apps/api/src/migrations.ts`) and are idempotent.
- With `DATA_ENCRYPTION_KEY` set, every JSON store is AES-256-GCM encrypted on
  disk (`ENC1:` prefix). The first production boot encrypts existing plaintext
  files. A wrong or missing key fails startup instead of resetting data.
- A daily backup is written to `data/backups/YYYY-MM-DD/` and seven days are kept.
  The copies are encrypted because the source files are.
- Admin → Settings → **Download JSON backup** produces a full export over the
  authenticated channel. Treat it as sensitive (it contains PII/hashes).
- Session and password-reset files are excluded from every export and backup.
- See `docs/data-retention.md` for retention and erasure.

## Upgrades

1. Update dependencies deliberately (`npm install <pkg>@<version> -w <workspace>`).
2. Run `npm audit --audit-level=high` — CI fails on high or critical.
3. Run `npm run typecheck && npm run lint && npm run test && npm run build`.
4. Run `npm run test:e2e` against a running dev server (or let Playwright start it).
5. Back up `apps/api/data` before deploying.
6. Deploy the API first (migrations are forward-only and idempotent), then the web
   build. Static assets are content-hashed, so the old HTML keeps working during
   the swap.
7. Roll back by redeploying the previous API/web build and restoring the JSON
   backup only if a migration changed data (it currently only adds missing
   fields).

Dependabot is configured for weekly minor/patch updates. Majors are explicit
changes because Vite, React Router and Tiptap have breaking migrations.

## Scaling caveat

Sessions, rate-limit counters, background jobs and audit/email stores are
process-local. Run **one** API instance until they are moved to a shared store
(Redis/Postgres). If more than one instance is required:

- move sessions and rate limits to Redis,
- move the JSON stores to a database,
- run the job scheduler on a single leader (`startJobs` only on one instance),
- move backups to object storage.

## Security checklist

- [x] Production refuses default admin credentials.
- [x] Strict CORS + origin checks + mutation header.
- [x] Per-route and global rate limits.
- [x] HttpOnly / SameSite=Strict cookies.
- [x] Public content DTO hides bank details and drafts.
- [x] Newsletter HTML sanitised; preview runs in a sandboxed iframe.
- [x] Upload signatures verified; stored files served `nosniff` with a lockdown CSP.
- [x] JSON stores encrypted at rest with AES-256-GCM; wrong key fails closed.
- [x] CSP, HSTS, frame denial and permissions policy at the static host.
- [x] Consent banner; analytics loads only after opt-in.
- [x] Async route errors reach the error middleware.
- [x] Audit log, data health, export, retention, customer erasure.
- [x] Email two-factor OTP for staff; no SMS provider exists.
- [x] Server-side rendering with per-route meta/JSON-LD and hydration.
- [ ] Move the JSON stores to an encrypted database before multi-instance scale.
