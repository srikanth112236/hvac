# UI controls

The application does not use native browser select menus or native date/time
inputs. Admin, portal and public forms share the same custom controls.

## Select

`Select` is a searchable listbox control:

- custom trigger and option list in a portal, so it is never clipped by a table
  or modal;
- search field automatically appears for lists longer than five options;
- keyboard support for arrow keys, Enter and Escape;
- selected option checkmark, disabled options and placeholders;
- accessible combobox/listbox roles.

Existing form code keeps the same `options`, `value` and `onChange` API:

```tsx
<Select
  label="Priority"
  value={priority}
  options={priorities}
  onChange={(event) => setPriority(event.target.value)}
/>
```

Long operational lists such as leads, customers, services and assignees become
type-to-filter suggestions automatically.

## Date, time and date-time pickers

The shared date control replaces every `Input type="date"`,
`type="datetime-local"` and `type="time"` automatically:

- custom calendar with month and year navigation;
- today, selected and disabled-date states;
- min/max date support;
- time selector with hour and 5-minute columns;
- separate **Now**, **Clear** and **Apply** actions;
- portalled popover positioned above or below the field based on available
  space;
- keyboard Escape closes the picker without closing the parent modal.

Existing code continues to use `Input` unchanged. A `DatePicker` and
`DateTimePicker` are also exported for explicit use.

## Search suggestions

Free-text searches use the shared `SearchSuggest` control. Suggestions start
at two characters, never flash on a single keystroke, and stay useful while the
underlying list keeps filtering:

- portalled suggestion panel positioned above or below the field;
- searchable labels with the matching characters highlighted;
- icons, status metadata and a second-line description for each record;
- arrow-key navigation, Enter to select and Escape to dismiss;
- mouse/touch selection without losing focus in the parent modal;
- empty state that explains the typed text still filters the list.

Pages pass their own record arrays as suggestions and can optionally handle
`onSelect` to open a detail drawer, customer file or full record. Examples
include customers, invoices, quotations, jobs, expenses, coupons, reminders,
journal articles, campaigns, revisions and portal customer selection.

## Table actions

Record tables use compact 28px icon actions instead of wide text buttons:

- `TableActions` keeps the action cluster aligned and tightly spaced;
- `TableActionButton` and `TableActionLink` provide accessible labels, tooltips
  and consistent cold/heat/success/danger hover states;
- the shared view icon remains in the final table column;
- table padding is reduced so rows stay compact without losing touch targets.

This keeps invoices, expenses, team, journal, newsletters and revision tables
readable with several actions per row.

## Record details

Every operational record list exposes a view icon (`RecordViewButton`) that
opens the shared `RecordDrawer`. The same component is used across the admin
control room and the customer portal, so details never depend on a page-specific
one-off modal.

The drawer renders the complete record as scan-friendly key/value sections:

- money, percentages, dates and booleans are formatted for reading;
- related lines, payments, messages, checklist items and redemption history are
  shown as nested cards;
- ids and secret-like fields are hidden;
- long values wrap safely, and the footer keeps record-specific actions beside
  **Back** and **Cancel** controls;
- **Back** returns to the source list or the notification inbox when the record
  was opened from a notification; **Cancel** closes the detail and clears the
  deep-link parameters.

The shared `Table` component can add the same view column automatically with
`onRowView` and `viewLabel`. Lists that are not tables use `RecordViewButton`
directly.

## Verification

`e2e/pickers.spec.ts` asserts there are zero native `select`, `date`,
`datetime-local` or `time` controls on representative public, admin and editor
pages, and exercises the custom calendar and searchable select.

`e2e/record-details.spec.ts` asserts a view icon opens the full record drawer
from a table and closes correctly. `e2e/journey.spec.ts` asserts the customer
portal invoice row opens the detailed invoice view. `e2e/search-suggestions.spec.ts`
asserts the two-character threshold, keyboard/click selection and record opening.
