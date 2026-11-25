# Full platform audit — seeded data, UI sweep and consolidated result

Date: 24 November 2026
Environment: local development
Web: `http://127.0.0.1:5175`
API: `http://127.0.0.1:4000`

## 1. Demo data

A repeatable seed script now exists:

```bash
npm run seed:demo
```

It is idempotent for the demo records: running it again updates the same demo
records rather than creating new copies. Run it **before** starting the API if
the API is already running, because JSON stores load into an in-process cache.
During this audit the API was restarted after seeding.

### Primary portal account

| Field     | Value                                           |
| --------- | ----------------------------------------------- |
| Email     | `demo.coolvane@example.com`                     |
| Password  | `Coolvane!Demo2026`                             |
| Customer  | Avery Stone                                     |
| Sites     | McKinney HQ, Design studio annex                |
| Equipment | VRF outdoor plant, cassette bank, fresh-air AHU |
| AMC       | `AMC-2026-9001`, Comprehensive, active          |

### Other demo accounts

| Account      | Email                         | State      | Use                     |
| ------------ | ----------------------------- | ---------- | ----------------------- |
| Riley Chen   | `riley.demo@example.com`      | active     | secondary portal checks |
| Morgan Lee   | `pending.demo@example.com`    | pending    | approval workflow       |
| Jordan Blake | `unverified.demo@example.com` | unverified | email verification      |
| Taylor Reed  | `reset.demo@example.com`      | active     | password reset          |
| Casey Park   | `suspended.demo@example.com`  | suspended  | blocked login           |

All demo accounts use the same portal password above unless reset by a test.

### Seeded operational records

- 2 customer sites, 3 equipment records, 1 active AMC contract.
- 3 quotations: sent, changes-requested, accepted, plus a sent alternate.
- 4 appointments: scheduled, completed, requested and cancelled.
- 3 jobs: scheduled, completed and in-progress.
- 2 job reports with checklist, findings, recommendations and photo URL.
- 2 support tickets: open and closed.
- 4 demo invoices: unpaid, partial, paid and draft.
- 3 demo leads: quoted, new and won, all tied to the primary customer.
- 3 team members and current-month payroll entries.
- 4 expenses across materials, transport, equipment and marketing.
- 4 reminders: overdue, due today, upcoming and completed/locked.
- 2 newsletter signups.
- A known password-reset token and email-verification token.

Known test links:

- Reset: `/portal?reset=demo-reset-token-2026`
- Verify: `/portal?verify=demo-verify-token-2026`

## 2. Playwright coverage added

New suites:

| File                      | Tests | Area                                                                                                                    |
| ------------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------- |
| `e2e/public-full.spec.ts` |     7 | public shell, consent, navigation, filters, forms, calculators, legal, 404                                              |
| `e2e/portal-full.spec.ts` |     4 | portal overview, invoices, quotes, equipment, AMC, reports, booking, support, sites, profile, preferences, reset/verify |
| `e2e/admin-full.spec.ts`  |     3 | overview, global search, notifications, leads, customers, dispatch, jobs, customer file, invoices, quotations, expenses |
| `e2e/admin-ops.spec.ts`   |     1 | team/payroll, reminders, coupons and settings/users/backup                                                              |

Existing suites retained: blog, content studio, dispatch, customer journey,
newsletters, notifications, pickers, record details, reminders, revisions,
search suggestions and smoke.

**Full run: 31/31 Playwright tests passed.**

The suite starts from `npm run seed:demo` and a restarted API. Re-running the
suite without reseeding can fail where a previous test intentionally accepted a
quote, completed a reminder or consumed a verification token.

## 3. What is working

### Public website

- Consent banner and persistence.
- Header navigation, services mega menu, mobile menu and footer.
- Footer newsletter signup with API success/error handling.
- Home callback form, validation and lead receipt.
- Home FAQ accordion.
- Services category filters and service detail sections.
- Service detail calculator hand-off and locked-service enquiry.
- Work case filters and before/after comparison slider.
- AMC plan selection and enquiry prefill.
- Products category filter and quote CTA query string.
- Journal topic filter, article page, TOC and FAQ.
- Contact, book and quote enquiry forms.
- Tool calculators and prefill of the enquiry brief.
- Legal pages, URL aliases and global 404.
- 22 published service routes and all seeded public content.

### Admin

- Owner login, overview metrics and live panels.
- Global `Ctrl+K` search across leads, customers, invoices, quotations, tickets and equipment.
- Notification feed, mark-all-read and read-state filtering.
- Lead search, drawer edit, stage/owner/value/note save and new lead creation.
- Customer search, approval, creation, suspension and customer-file navigation.
- Customer file tabs: invoices, sites, equipment, quotations, AMC, reports, support and preferences.
- Site add/remove and equipment add/remove in the customer file.
- Dispatch day/upcoming/all views, inline status change, customer/technician search and visit scheduling.
- Jobs list, AMC visit generation and job record drawer.
- Invoice list/detail, part-payment recording, reminder queueing and PDF route.
- Quotation status change and PDF action.
- Expense create/edit/delete with search.
- Team member creation, payroll preparation and salary ledger.
- Reminder snooze/complete locks, completed-tab read-only state and absence of delete action.
- Coupon create, pause and delete.
- Settings data health, audit log, JSON backup download and additional user creation.
- Content Studio, classic editor, revisions, journal, notifications and newsletter existing suites pass.

### Customer portal

- Login and session handling.
- Overview totals, next visit and recent invoices.
- Invoice list/detail and PDF link.
- Quotation request-changes and acceptance flows.
- Equipment, AMC and job-report drawers.
- Booking a new visit.
- Rescheduling and cancelling a visit.
- Rebook hand-off from a completed visit.
- Support ticket creation and reply.
- Site create, edit and remove.
- Profile edit.
- Notification preference persistence.
- Password reset, email verification and pending/suspended account states.
- Sign out.

## 4. Fixes completed in this pass

1. **Email verification token double-use in development.** React StrictMode ran
   the verification effect twice. Fixed with a one-token guard.
2. **Development rate limit blocked broad admin testing.** Production remains
   at 300 requests/minute; development allows 1,200.
3. **Contact map followed the wrong city.** The ?Open in Maps? link now builds
   an OpenStreetMap search from the configured brand address instead of
   hard-coded coordinates.
4. **Footer design-system link leaked into production.** It now renders only in
   development.
5. **Work-file index did not deep-link.** Each index entry and case article now
   has a case anchor, and the index resets the filter before jumping.
6. **Journal featured article ignored the active topic.** The featured article is
   now chosen from the filtered topic list, with a safe first-item fallback.
7. **AMC schedule headings were hard-coded.** Column headings now use the CMS
   plan names.
8. **Booking and quote leads shared one source.** Added `booking-page` and
   `quote-page` lead sources.
9. **No drawing/photo upload on enquiries.** Added public image/PDF attachment
   uploads (three files, 8 MB each), attached them to the lead, and exposed them
   in the admin lead drawer.
10. **Portal reports were read-only.** Customers can now upload report photos,
    toggle checklist items, and see the updated report immediately.
11. **Reschedule/cancel did not update the linked job.** Both customer and admin
    appointment changes now synchronise the linked job?s schedule, technician and
    status.
12. **AMC renewal API allowed duplicates.** A second renewal request for the same
    contract now returns `409 renewal_exists`.
13. **Admin could not correct customer preferences.** The customer file now lets
    staff correct the four email preference switches.
14. **Quotation change-request loop was incomplete.** The portal now supports
    updating an existing change request. Staff see the request on the quotation
    list and customer file, can reissue with one action, and the reissue clears
    `changeRequest`, resets the sent/accepted timestamps, emails the customer,
    emits the admin notification and appears in the portal through 15-second
    refresh.

## 5. Remaining environment blockers and deliberate controls

### Blocks production sign-off until credentials/requirements arrive

- **No email provider is configured.** Actual email delivery, invoice/quote
  emails, newsletter sends, reset-link delivery and admin 2FA cannot be verified
  end to end. The app records skipped emails; tests verify UI/API state.
- **Admin 2FA cannot be fully exercised** without a mail provider.
- **PostgreSQL production path** is not exercised locally; development uses JSON
  stores.
- **Terraform/Azure deployment** remains unvalidated locally.

### Deliberate controls

- Customers cannot rewrite priced quotation lines. The implemented financial
  flow is request-changes or update-request ? estimator edits and reissues. The
  loop is now synced across portal, admin list and customer file; priced lines
  remain under estimator control by design.
- Customer checklist toggles are a customer-review layer on the report. The
  technician?s original checklist and service record remain the operational
  evidence; a future audit-policy decision can make customer edits append-only.
- The local data directory still contains older manual/journey-test records
  alongside the demo seed. This is local data state, not application behaviour.

### Test limitations

- Playwright covers the main positive UI path for every module, not every
  permission-denied and validation-error combination.
- Mail-dependent flows are tested for UI state, not delivery.
- PDF routes are tested by link/API coverage; this audit does not visually diff
  every generated PDF.
- The seed script is non-destructive and leaves any pre-existing local data in
  place. The current local store is therefore a mix of demo records and earlier
  manual/journey-test records.

## 6. Automated checks

| Check                          | Result                       |
| ------------------------------ | ---------------------------- |
| Typecheck                      | passed                       |
| Lint                           | passed                       |
| API tests                      | 24/24 passed                 |
| Playwright UI suite            | 31/31 passed                 |
| Production build               | passed                       |
| SSR hydration                  | 102/102 routes/themes passed |
| `npm audit --audit-level=high` | 0 vulnerabilities            |

## 7. Verdict

The seeded demo platform is functional across public, admin and customer portal
surfaces. Core operational flows work end to end locally, including CRM,
billing, jobs, dispatch, payroll, reminders, marketing and content revisions.

It is suitable for a client walkthrough and acceptance testing. It is **not yet
ready for production sign-off** until real email delivery and 2FA are verified,
the PostgreSQL path is exercised, and the product gaps above are addressed.
