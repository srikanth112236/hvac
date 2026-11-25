# Reminders

Reminders are the follow-up queue for leads, payments, maintenance renewals,
site visits, parts and general admin tasks.

## Status model

Each reminder is either **open** or **completed**.

- Open reminders can be edited, snoozed, completed or deleted.
- Completed reminders become immutable audit records.
- The API rejects any edit, reopen, snooze or delete on a completed reminder
  with `409 reminder_locked`.
- The UI hides those actions and shows a **Locked** / **Read-only** state.
- A completed reminder keeps its title, notes, action type, priority, due date
  and completion timestamp for audit.

## Action types

The category is presented as an action type so the queue reads operationally:

| Action type | Shown as         |
| ----------- | ---------------- |
| Follow-up   | Call / follow up |
| Payment     | Collect payment  |
| Maintenance | Service due      |
| Quotation   | Chase quotation  |
| Site visit  | Attend site      |
| Parts       | Supply parts     |
| Renewal     | Renew contract   |
| General     | General task     |

## Queue views

The status tabs are mutually exclusive and show live counts:

- All
- Needs attention — overdue or urgent
- Overdue
- Due today
- Upcoming — next seven days
- Later — beyond seven days
- Completed — locked audit records

Search, priority and action-type filters can be combined with the active tab.
Smart sorting keeps attention items first, then due date and priority.

## Locking

The strict rule is enforced in both places:

- `apps/api/src/admin.ts` rejects completed-reminder mutations.
- `apps/web/src/admin/AdminReminders.tsx` removes the edit, reopen, snooze and
  delete controls from completed cards.

To continue a completed piece of work, create a new reminder rather than
modifying history.
