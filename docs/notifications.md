# Realtime notifications

The control room has one notification pipeline shared by every admin page:

`successful API mutation → notification bridge → persisted feed → WebSocket push → bell, toasts and global inbox`

## What is captured

The bridge listens on `/api/v1` after the request body is parsed and records a
notification for every successful mutating request that maps to an operational
record. Existing and future routes are covered by the central mapping in
`apps/api/src/notificationBridge.ts`.

Examples include:

- public enquiries, callback requests and portal registrations;
- lead creation and stage changes;
- customer creation, approval, suspension and portal profile/site changes;
- invoices, payments, reminders, quotations, portal acceptance and change
  requests;
- dispatch appointments, jobs, AMC renewals and support replies;
- expenses, team members, payroll, coupons and newsletter actions;
- website content publication and revision restores;
- staff account changes and AMC scheduler runs.

Auth, health, readiness and notification-read requests are deliberately excluded.

## Storage and read state

Notifications are stored in `notifications.json` through the same encrypted JSON
store or PostgreSQL adapter as the rest of the application.

- The latest 1,000 notifications are retained.
- The control room surfaces the latest 200 in the inbox; the API accepts category,
  read-state, search and limit filters for future paging.
- Read state is per admin email through `readBy`, so one staff member reading a
  notification does not mark it read for everyone else.
- The client receives a view without `readBy`.
- Feed responses are `Cache-Control: private, no-store`.
- Only authenticated admins can read or mark notifications; the API never exposes
  notification data to the public or customer portal.

## HTTP API

All routes are under `/api/v1/admin` and require an admin session:

| Method | Path                                        | Purpose                      |
| ------ | ------------------------------------------- | ---------------------------- |
| `GET`  | `/notifications?category=&state=&q=&limit=` | Filtered notification feed   |
| `POST` | `/notifications/:id/read`                   | Mark one notification read   |
| `POST` | `/notifications/read-all`                   | Mark every notification read |

Mutations use the normal `X-Admin-Request` and allowed-origin guards.

## WebSocket

Endpoint:

```text
/api/v1/notifications/socket
```

Authentication uses the same HttpOnly admin session cookie as the HTTP API. The
upgrade is rejected with `401` without a valid session and `403` for a
disallowed browser origin.

Server messages:

- `notification:init` — feed snapshot after connecting;
- `notification:new` — a new notification plus the viewer's unread count;
- `notification:update` — one item changed read state;
- `notification:read-all` — viewer's inbox was marked read;
- `notification:pong` — heartbeat response;
- `notification:error` — invalid client message.

Client messages:

- `notification:read` with `{ id }`;
- `notification:read-all`;
- `notification:refresh`;
- `notification:ping`.

The server sends ping frames every 30 seconds and terminates dead sockets. The
browser reconnects with exponential backoff and also polls every 30 seconds while
the socket is disconnected.

## UI

- `AdminNotificationProvider` owns the socket, feed and unread count.
- `NotificationBell` is in the control-room sidebar. It opens a live recent feed
  and links to the global inbox.
- `/admin/notifications` is the full inbox with search, category and read-state
  filters, unread metrics and mark-all-read.
- High and urgent notifications raise a toast; every notification updates the
  bell count and the inbox immediately.

## Deep links

Notifications link to the exact record, not just the module:

- leads: `/admin/leads?lead=ENQ-…`, opening the lead drawer;
- invoices/customers: direct record pages;
- quotations/jobs/expenses/reminders/coupons/campaigns: `?open=<id>`, opening the
  record drawer;
- dispatch visits: `/admin/dispatch?open=<id>`;
- team and payroll: `/admin/team?member=<id>` and `?payroll=<id>`;
- support, sites, equipment, AMC and reports: the customer file with the right
  tab and record open;
- content: the revision ledger with the published version open;
- staff users: `/admin/settings?user=<id>`.

This keeps clicking a notification equivalent to opening the record from its
normal page, with no context switching.

The UI appends `from=notifications` to the destination. Detail pages and drawers
use that marker to show **Back to notifications**; their normal **Back**,
**Cancel** and close controls clear the deep-link parameters and return to the
source list.

## Development proxy

Vite proxies `/api` to the API with `ws: true`, so the socket uses the same
origin as the page in development. Production should serve the API and web app
from the same origin, or include the socket origin in `ALLOWED_ORIGINS`.

## Multi-instance note

The WebSocket registry is in-process. With multiple API instances behind a load
balancer, use sticky sessions or add a shared pub/sub layer (for example
PostgreSQL `LISTEN/NOTIFY` or Redis) so every instance broadcasts to its own
connected admins.
