# Data retention, erasure and backups

This deployment stores business records as JSON documents under `apps/api/data/`.
In production every JSON store is AES-256-GCM encrypted with
`DATA_ENCRYPTION_KEY`; exports and daily backups contain the same protected
format (or a plaintext export over the authenticated admin channel). The schema
version is recorded in `data-version.json`; migrations run at API startup before
the listener opens.

## What is stored

| Store | Content | Retention |
|---|---|---|
| `content.json` / `content-revisions.json` | Public copy and version history | Live; last 500 revisions |
| `leads.json` | Enquiries and callback requests | Until erased or archived by the desk |
| `customers.json` | Portal identities and password hashes | Until erased |
| `customer-sites.json`, `equipment.json` | Service addresses and installed units | Until erased |
| `quotations.json`, `amc-contracts.json`, `job-reports.json` | Commercial and service records | Until erased |
| `support-tickets.json` | Complaint/support threads | Until erased |
| `invoices.json` | Financial records | Kept for tax/warranty; identity can be erased |
| `appointments.json` | Visit schedule | Kept for service history; identity can be erased |
| `audit-log.json` | Admin mutation metadata (no bodies) | 365 days (`AUDIT_RETENTION_DAYS`) |
| `email-log.json` | Recipient, subject, provider status | 180 days (`EMAIL_LOG_RETENTION_DAYS`) |
| `job-state.json` | Job dedupe state | Operational |
| `backups/YYYY-MM-DD/` | Daily copies of the JSON stores | 7 days |

Session files (`admin-sessions.json`, `customer-sessions.json`) and
`password-resets.json` are **never** included in exports or backups.

## Customer erasure

Admin → Customers → File → **Erase data** (or
`POST /api/v1/admin/customers/:id/erase` with `{ "confirm": "ERASE" }`).

This removes the portal identity, sites, equipment, quotations, AMC contracts,
job reports, support tickets and preferences; revokes all customer sessions; and
anonymises linked leads, appointments and invoices. Financial amounts remain for
accounting, but the name, email, phone, address and tax id are cleared.

The action is recorded in the audit log (path/status/actor, no body).

## Backups and restore

- The API writes a daily copy to `apps/api/data/backups/YYYY-MM-DD/` keeping
  seven days. A manual full export is available from Admin → Settings →
  **Download JSON backup** (`GET /api/v1/admin/export`).
- Restore: stop the API, replace the JSON files in `apps/api/data/` from a
  backup, start the API. Migrations are idempotent.
- Backups contain personal data. Store them on encrypted storage, restrict
  access to the operator group, and delete them under the same policy as the
  live data.

## Principles

1. Collect only what the works desk needs to quote and deliver the job.
2. Do not put personal data in the public content document. The public API
   filters unpublished records and blanks invoice bank fields.
3. Keep audit and email logs for operations, not indefinitely.
4. Erase on request; do not keep shadow copies in marketing audiences. A
   newsletter signup is a separate record and can be removed by deleting the
   address from `newsletter-signups.json`.
5. Backups are not archives: they expire after seven days.

## Hardening still recommended at the host

- Encrypt the data volume at rest and in backups.
- Restrict SSH/console access to the API host.
- Rotate `ADMIN_PASSWORD`, `RESEND_API_KEY`/`MAIL_WEBHOOK_TOKEN` and any host
  credentials on a schedule.
- Put the API behind TLS and a WAF/rate limiter at the edge as well as in the
  application.
