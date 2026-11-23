# Newsletters

`/admin/newsletters` is the campaign workspace: compose, schedule, send, audit
and suppress.

## Campaign ledger

Every campaign is listed in one table regardless of status: drafts, scheduled,
sending, paused and sent. Filters cover search (subject, preheader, sender or
recipient), status and audience. Each row shows audience, reach, delivery
progress, schedule, recurrence, suppression count and actions.

## Scheduling

A campaign can be sent immediately or scheduled from the composer.

Schedule modes:

- **Once** — a single date and time.
- **Daily** — every N days.
- **Weekly** — every N weeks on one or more weekdays.
- **Monthly** — every N months on a day of the month, or the first/second/
  third/fourth/last weekday of the month.
- **Range** — an optional end date stops any recurring series.

The first send date/time is anchored in the business timezone. Recurrence keeps
the same local send time and does not drift when a queue tick is delayed.

### Five-minute lock

Editing, rescheduling, pausing and deleting close five minutes before a
scheduled send. The API rejects those actions with `schedule_locked`, and the
UI disables them with a visible lock badge. Sends already in flight can still
be paused.

## Delivery controls

Each campaign stores recipients-per-minute, per-hour and per-day caps. The
server queue applies all three limits over rolling windows and persists the
counters, so a restart does not reset a throttle. Scheduled campaigns keep
running even with no admin tab open.

## Suppression

The suppression list combines:

- newsletter signups with status `unsubscribed`;
- customer portal preferences where marketing email is disabled.

Audiences exclude suppressed addresses by default. The audience picker shows
which customers are suppressed and why. A campaign can enable **Override
suppression** to send to them anyway; this is recorded on the campaign as
`suppressedCount` and is visible in the ledger.

The email footer links customers to the portal preferences page where marketing
email can be turned off. That immediately feeds this suppression list.

## Coupon promotions

The composer can insert an active coupon into the campaign body as a styled
promotion card containing the code, value, minimum spend and expiry. Send the
campaign to a selected customer or an audience to deliver the coupon by email.

## Recipient sources

Audiences resolve from portal customers, invoice addresses, leads and consented
footer signups. Selected audiences use an explicit saved recipient list.

## Verification

```bash
npm run typecheck
npm run lint
npm run test             # recurrence, suppression and field-restore unit tests
npm run test:e2e         # newsletter table, suppression and schedule planner
```
