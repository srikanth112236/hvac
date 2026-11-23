# Security policy

## Reporting

Report a suspected vulnerability privately to the deployment owner. Do not open a
public issue with exploit details. Include the request id from the `x-request-id`
response header, the path, the time and the minimum data needed to reproduce.

## Supported configuration

Production **must** set:

- `ADMIN_EMAIL` and an `ADMIN_PASSWORD` of at least 12 characters
- `DATA_ENCRYPTION_KEY` of at least 32 characters (AES-256-GCM at rest)
- `ALLOWED_ORIGINS` (exact web origin)
- `PUBLIC_SITE_URL`
- `RESEND_API_KEY` or `MAIL_WEBHOOK_URL` (required for production portal
  registration, password reset and email verification)
- TLS at the edge and encrypted storage for `apps/api/data` and backups

The API refuses to start in production without the first four. In production,
portal registration is closed when no email provider is configured because email
ownership cannot be verified.

## Controls

| Area | Control |
|---|---|
| Admin auth | Single owner, HttpOnly + SameSite=Strict cookie, 12 h sessions persisted server-side, 8 attempts/IP/15 min, mutation origin + header checks |
| Customer auth | Password + admin approval; production requires email verification token (hashed, 24 h, single use); reset tokens (hashed, 1 h, single use) revoke sessions |
| Authorization | Customer routes scope every record by `customerId`; admin routes require a live session; no public admin reads |
| Public intake | Per-route limits (leads 10/10 min, callbacks 6/10 min, registration 6/h, forgot 5/h, reset 10/h, verification 3–10/h) plus 300 req/min/IP global |
| Content | Public DTO strips bank details and unpublished records; ETag/304; admin If-Match version check |
| Email | Newsletter HTML sanitised with an allowlist; preview in a sandboxed iframe; provider failures are logged as failed/skipped, never "sent" |
| Uploads | Signature-based type detection (JPEG/PNG/GIF/WebP/AVIF); client filename/extension ignored; stored files served `nosniff` with a lockdown CSP |
| At rest | Every JSON store is AES-256-GCM encrypted when `DATA_ENCRYPTION_KEY` is set (required in production); wrong/missing key fails closed; backups inherit encryption |
| Web headers | CSP (meta at build + `_headers`), HSTS, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy |
| Privacy | Consent banner, analytics opt-in only; erasure endpoint; retention windows for audit/email logs; export and 7-day backups exclude sessions/resets |
| Reliability | `express-async-errors`; structured request logs with ids; `/health` and `/ready`; migrations; daily backups |
| Dependencies | Zod 4.6.7, Vite 8.3.8, `npm audit` gated at high/critical in CI |

## Residual risks

- Media files under `uploads/` are public images by design and are not encrypted.
  The JSON business/PII stores are encrypted at rest when the production key is set.
- Sessions, rate limits and jobs are process-local. Run one API instance until a
  shared store is introduced.
- 32 moderate dependency advisories remain (Tiptap 2 admin editor, React Router 6,
  dev-only Vite paths). None is high or critical.
- A formal penetration test has not been performed.
- The deployment is not a multi-tenant RBAC system; there is one owner account.

See `docs/security-verification.md` for the tested checks and
`docs/data-retention.md` for the data policy.
