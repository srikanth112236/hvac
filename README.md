# Coolvane HVAC — white-label template

Monorepo for the Coolvane HVAC website and operations platform.

```
apps/web        React 18 + Vite + TS — public site, customer portal, admin
apps/api        Express + TS — public content, leads, portal, secured admin API
packages/shared domain constants, zod contracts, formatting helpers
infra           reserved for deployment templates
```

## Run

```bash
npm install
npm run fonts     # self-host the typefaces (once, or after changing families)
npm run dev       # web on http://127.0.0.1:5175, api on http://127.0.0.1:4000
```

- Design system: **http://127.0.0.1:5175/__styleguide** (development only, noindex)
- API health: **http://127.0.0.1:4000/api/v1/health**
- API readiness: **http://127.0.0.1:4000/api/v1/ready**

Port 5175 is used because 5173 was occupied on the development machine. Change
`server.port` in `apps/web/vite.config.ts` and the CORS origins in
`apps/api/src/server.ts` together.

## Variants

`VITE_THEME=foundry|atelier` (default `foundry`) selects the design language. In
development the floating switcher also flips it live; the choice is stored in
`localStorage` and can be forced with `?theme=atelier`.

| | Foundry | Atelier |
|---|---|---|
| Palette | ink `#0A0D10`, frost cyan, copper ember | bone `#F5F2EC`, deep teal, burnt copper |
| Display | Clash Display | Instrument Serif |
| Body / data | Satoshi / JetBrains Mono | Hanken Grotesk / IBM Plex Mono |
| Geometry | 2px controls, blueprint grid, grain | square controls, rules, no grid |

## What is implemented

- Public site: home, services + 22 detail pages, products, about, process, work,
  AMC, journal, contact, quote, book, legal, 404, both themes.
- Admin: overview, leads, customers + full customer file, **dispatch**, invoices,
  expenses, team/payroll, reminders, newsletters, coupons, content studio,
  revisions, journal, media, settings, **global search (Ctrl K), CSV exports**,
  **RBAC users**, audit log, data health, GDPR erasure, backup export.
- Customer portal: overview, bookings (book, reschedule, cancel), invoices and
  print, quotations (accept / request changes / print), equipment + service
  history, AMC cover + renewal request, job reports (checklist/photos), support
  tickets, profile, multiple sites, notification preferences, password reset,
  email verification.
- Operations: live admin refresh, cross-tab content sync, 10 s content polling with
  ETag/304, **prerendered public HTML with meta/JSON-LD**, same-origin sitemap/
  robots/feed, background jobs (reminders, AMC windows, digest, backups,
  retention), encrypted JSON stores, rate limiting, CSP/consent, audit trail.

## Security

See `SECURITY.md`, `docs/security-verification.md` and `docs/deployment.md`.

Production requires:

```env
ADMIN_EMAIL=
ADMIN_PASSWORD=            # 12+ characters
DATA_ENCRYPTION_KEY=       # 32+ characters; keep a copy, data is unreadable without it
ALLOWED_ORIGINS=
PUBLIC_SITE_URL=
RESEND_API_KEY=            # or MAIL_WEBHOOK_URL; required for production registration/mail
```

The JSON stores are AES-256-GCM encrypted when the key is set. Production
refuses to boot with development credentials, missing origins or no encryption
key. `npm run audit` gates high/critical advisories.

## Checks

```bash
npm run typecheck
npm run lint
npm run test        # Vitest + Supertest (API)
npm run test:e2e    # Playwright smoke (needs a browser; dev server auto-start)
npm run build
npm run audit
npm run verify      # typecheck + lint + test + build + audit
```

## Notes

- Fonts are self-hosted in `apps/web/public/fonts`; `scripts/fetch-fonts.mjs` regenerates them and `src/styles/fonts.css`.
- Lenis smooth scroll is disabled for coarse pointers and `prefers-reduced-motion`.
- GSAP/ScrollTrigger and three.js are client-only.
- Public pages are still client-rendered; SSR remains an open architecture item.
- One API instance is assumed until sessions, rate limits and jobs move to a shared store.
