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

## Verification

`e2e/pickers.spec.ts` asserts there are zero native `select`, `date`,
`datetime-local` or `time` controls on representative public, admin and editor
pages, and exercises the custom calendar and searchable select.
