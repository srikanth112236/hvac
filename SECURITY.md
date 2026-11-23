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
  registration, password reset, email verification and staff 2FA)
- TLS at the edge and encrypted storage for `apps/api/data` and backups

The API refuses to start in production without the first four. In production,
portal registration is closed when no email provider is configured because email
ownership cannot be verified. Staff 2FA cannot be enabled without a provider; the
API fails closed rather than reporting a code as sent.

## Controls

| Area          | Control                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin auth    | Multi-user RBAC (`owner`, `admin`, `manager`, `accountant`, `viewer`) with scrypt password hashes; environment owner is the recovery account; HttpOnly + SameSite=Strict cookie, 12 h persisted sessions, per-IP and per-account throttling, origin + header checks; a shared permission matrix drives `requirePermission` guards on every write router; sensitive audit/export/data-health reads require owner/admin |
| Admin 2FA     | Optional per-account email OTP: six digits, hashed in memory, 10 min TTL, five attempts, three resends, login challenge bound to a 256-bit id; enabling/disabling requires a fresh emailed code; no SMS path exists                                                                                                                                                                                                   |
| Customer auth | Password + admin approval; production requires email verification token (hashed, 24 h, single use); reset tokens (hashed, 1 h, single use) revoke sessions                                                                                                                                                                                                                                                            |
| Authorization | Customer routes scope every record by `customerId`; admin routes require a live session; no public admin reads                                                                                                                                                                                                                                                                                                        |
| Public intake | Per-route limits (leads 10/10 min, callbacks 6/10 min, registration 6/h, forgot 5/h, reset 10/h, verification 3–10/h) plus 300 req/min/IP global                                                                                                                                                                                                                                                                      |
| Content       | Public DTO strips bank details and unpublished records; ETag/304; admin If-Match version check; equipment, AMC and quotation PATCH endpoints also accept If-Match against `updatedAt` and return `412` on stale writes                                                                                                                                                                                                |
| Email         | Newsletter HTML sanitised with an allowlist; preview in a sandboxed iframe; quotation/AMC/support/invoice/booking notifications respect customer preferences; provider failures are logged as failed/skipped, never "sent"; no SMS provider                                                                                                                                                                           |
| Uploads       | Signature-based type detection (JPEG/PNG/GIF/WebP/AVIF); client filename/extension ignored; stored files served `nosniff` with a lockdown CSP                                                                                                                                                                                                                                                                         |
| At rest       | Every JSON store is AES-256-GCM encrypted when `DATA_ENCRYPTION_KEY` is set (required in production); wrong/missing key fails closed; backups inherit encryption                                                                                                                                                                                                                                                      |
| Web headers   | CSP (meta at build + `_headers`), HSTS, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy                                                                                                                                                                                                                                                                                                                  |
| Privacy       | Consent banner, analytics opt-in only; erasure endpoint; retention windows for audit/email logs; export and 7-day backups exclude sessions/resets                                                                                                                                                                                                                                                                     |
| Reliability   | `express-async-errors`; structured request logs with ids; `/health` and `/ready`; migrations; daily backups                                                                                                                                                                                                                                                                                                           |
| Jobs/AMC      | Jobs include checklist, parts, photos, signature and appointment/contract links; AMC visits auto-generate the next appointment and job under a shared lease                                                                                                                                                                                                                                                           |
| Expenses      | Full ledger CRUD with period/category/method/search filters; monthly PDF generated server-side and emailed as an attachment on the 2nd; admin archive links current and previous reports                                                                                                                                                                                                                              |
| Quotations    | Quotes link customer, lead and service; draft/sent/accepted/declined/changes/expired lifecycle; PDF, portal acceptance/change requests and scheduled expiry reminders                                                                                                                                                                                                                                                 |
| Dependencies  | Zod 4.6.7, React Router 7.18, Vite 8.3; unused Tiptap removed; `npm audit` reports 0 advisories and CI gates high/critical                                                                                                                                                                                                                                                                                            |

## Residual risks

- Media files under `uploads/` are public images by design and are not encrypted.
  The JSON business/PII stores are encrypted at rest when the production key is set.
- Multi-instance requires `DATABASE_URL`; without it the JSON stores, sessions and counters are single-instance. With PostgreSQL, store mutations are row-locked and job cycles take a shared lease.
- Staff 2FA recovery requires server access: remove `admin-2fa.json` and restart
  to clear all staff 2FA preferences. This is intentional break-glass, not an
  unauthenticated bypass.
- The Azure Terraform template has not been applied or validated against a
  subscription in this workspace.
- A formal penetration test has not been performed.
- The deployment is not a multi-tenant system; roles are staff roles inside one
  works desk, not tenants.

See `docs/security-verification.md` for the tested checks and
`docs/data-retention.md` for the data policy.
