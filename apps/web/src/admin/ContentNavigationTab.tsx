import type { ReactNode } from 'react'
import type {
  SiteContent,
  SiteNavColumn,
  SiteNavFeature,
  SiteNavItem,
  SiteNavLink,
  SiteNavigation,
} from '@hvac/shared'
import { Button, Input, Select, Textarea, Toggle } from '@/components/ui'
import { Icon } from '@/components/icons'

type Update = (recipe: (current: SiteContent) => SiteContent) => void

const MAX_ITEMS = 9
const MAX_COLUMNS = 4
const MAX_LINKS = 14

function Panel({
  title,
  description,
  children,
  actions,
}: {
  title: string
  description: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="border border-line bg-panel/20">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h3 className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-dim">{title}</h3>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-fg-faint">{description}</p>
        </div>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

function SubGroup({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="border border-line/70 bg-base/40">
      <div className="flex items-center justify-between gap-2 border-b border-line/60 px-3 py-2">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-fg-faint">
          {title}
        </span>
        {actions}
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

function emptyLink(): SiteNavLink {
  return { label: 'New link', href: '/contact' }
}

function emptyItem(index: number): SiteNavItem {
  return {
    id: `item-${Date.now().toString(36)}-${index}`,
    label: 'New menu',
    href: '/contact',
    kind: 'link',
    published: true,
    columns: [],
  }
}

/**
 * Navigation workspace: the announcement bar, the header actions and every
 * menu item (plain link or mega panel with columns and a feature card). Saving
 * publishes through the same versioned content document as the rest of the
 * studio, so the header changes without a deploy.
 */
export function ContentNavigationTab({ draft, update }: { draft: SiteContent; update: Update }) {
  const navigation = draft.navigation

  const patchAnnouncement = (patch: Partial<SiteNavigation['announcement']>) => {
    update((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        announcement: { ...current.navigation.announcement, ...patch },
      },
    }))
  }

  const patchActions = (patch: Partial<SiteNavigation['actions']>) => {
    update((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        actions: { ...current.navigation.actions, ...patch },
      },
    }))
  }

  const patchItem = (index: number, patch: Partial<SiteNavItem>) => {
    update((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        items: current.navigation.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...patch } : item,
        ),
      },
    }))
  }

  const patchFeature = (index: number, patch: Partial<SiteNavFeature>) => {
    update((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        items: current.navigation.items.map((item, itemIndex) =>
          itemIndex === index
            ? { ...item, feature: { ...(item.feature ?? {}), ...patch } }
            : item,
        ),
      },
    }))
  }

  const patchColumn = (itemIndex: number, columnIndex: number, patch: Partial<SiteNavColumn>) => {
    update((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        items: current.navigation.items.map((item, index) =>
          index === itemIndex
            ? {
                ...item,
                columns: item.columns.map((column, position) =>
                  position === columnIndex ? { ...column, ...patch } : column,
                ),
              }
            : item,
        ),
      },
    }))
  }

  const patchLink = (
    itemIndex: number,
    columnIndex: number,
    linkIndex: number,
    patch: Partial<SiteNavLink>,
  ) => {
    update((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        items: current.navigation.items.map((item, index) =>
          index === itemIndex
            ? {
                ...item,
                columns: item.columns.map((column, position) =>
                  position === columnIndex
                    ? {
                        ...column,
                        links: column.links.map((link, linkPosition) =>
                          linkPosition === linkIndex ? { ...link, ...patch } : link,
                        ),
                      }
                    : column,
                ),
              }
            : item,
        ),
      },
    }))
  }

  const moveItem = (index: number, direction: -1 | 1) => {
    update((current) => {
      const items = [...current.navigation.items]
      const target = index + direction
      if (target < 0 || target >= items.length) return current
      const [moved] = items.splice(index, 1)
      if (!moved) return current
      items.splice(target, 0, moved)
      return { ...current, navigation: { ...current.navigation, items } }
    })
  }

  const removeItem = (index: number) => {
    update((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        items: current.navigation.items.filter((_, itemIndex) => itemIndex !== index),
      },
    }))
  }

  const addItem = () => {
    update((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        items: [...current.navigation.items, emptyItem(current.navigation.items.length)],
      },
    }))
  }

  const addColumn = (itemIndex: number) => {
    const item = navigation.items[itemIndex]
    if (!item) return
    patchItem(itemIndex, {
      columns: [...item.columns, { title: `Column ${item.columns.length + 1}`, links: [emptyLink()] }],
    })
  }

  const removeColumn = (itemIndex: number, columnIndex: number) => {
    const item = navigation.items[itemIndex]
    if (!item) return
    patchItem(itemIndex, { columns: item.columns.filter((_, index) => index !== columnIndex) })
  }

  const addLink = (itemIndex: number, columnIndex: number) => {
    const column = navigation.items[itemIndex]?.columns[columnIndex]
    if (!column) return
    patchColumn(itemIndex, columnIndex, { links: [...column.links, emptyLink()] })
  }

  const removeLink = (itemIndex: number, columnIndex: number, linkIndex: number) => {
    const column = navigation.items[itemIndex]?.columns[columnIndex]
    if (!column) return
    patchColumn(itemIndex, columnIndex, {
      links: column.links.filter((_, index) => index !== linkIndex),
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border border-line bg-panel/20 px-4 py-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">Header</p>
        <p className="mt-1 text-[11px] leading-relaxed text-fg-dim">
          Announcement bar, actions and {navigation.items.length} menu{' '}
          {navigation.items.length === 1 ? 'item' : 'items'} ·{' '}
          {navigation.items.filter((item) => item.kind === 'mega').length} mega panels. Unpublished
          items stay in the draft but disappear from the live header.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {navigation.items.map((item) => (
            <span
              key={item.id}
              className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] ${
                item.published ? 'border-line text-fg-dim' : 'border-warn/40 text-warn'
              }`}
            >
              {item.label}
              {item.kind === 'mega' ? ' ▾' : ''}
            </span>
          ))}
        </div>
      </div>

      <Panel
        title="Announcement bar"
        description="The thin strip above the header. Text on the left, an optional link and the phone number on the right."
        actions={
          <Toggle
            label="Visible"
            checked={navigation.announcement.enabled}
            onChange={(enabled) => patchAnnouncement({ enabled })}
          />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Primary text"
            value={navigation.announcement.text}
            onChange={(event) => patchAnnouncement({ text: event.target.value })}
            placeholder="24 × 7 breakdown dispatch"
          />
          <Input
            label="Secondary text"
            value={navigation.announcement.secondary}
            onChange={(event) => patchAnnouncement({ secondary: event.target.value })}
            placeholder="Dallas · Fort Worth · Plano"
          />
          <Input
            label="Link label"
            value={navigation.announcement.linkLabel}
            onChange={(event) => patchAnnouncement({ linkLabel: event.target.value })}
            placeholder="Emergency line"
          />
          <Input
            label="Link destination"
            value={navigation.announcement.linkHref}
            onChange={(event) => patchAnnouncement({ linkHref: event.target.value })}
            placeholder="tel:+15555550177 or /contact"
          />
        </div>
      </Panel>

      <Panel
        title="Header actions"
        description="The buttons at the right edge of the bar, on every page."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Primary button label"
            value={navigation.actions.primaryLabel}
            onChange={(event) => patchActions({ primaryLabel: event.target.value })}
          />
          <Input
            label="Primary button destination"
            value={navigation.actions.primaryHref}
            onChange={(event) => patchActions({ primaryHref: event.target.value })}
          />
          <Input
            label="Secondary link label"
            value={navigation.actions.secondaryLabel}
            onChange={(event) => patchActions({ secondaryLabel: event.target.value })}
          />
          <Input
            label="Secondary link destination"
            value={navigation.actions.secondaryHref}
            onChange={(event) => patchActions({ secondaryHref: event.target.value })}
          />
        </div>
        <div className="mt-4">
          <Toggle
            label="Show phone number in the header"
            description="Uses the brand phone number from Brand & contact."
            checked={navigation.actions.showPhone}
            onChange={(showPhone) => patchActions({ showPhone })}
          />
        </div>
      </Panel>

      <Panel
        title="Menu items"
        description="Order, label and behaviour of each top-level entry. A mega panel holds up to four columns of links plus one feature card."
        actions={
          <Button
            size="sm"
            variant="secondary"
            icon="plus"
            onClick={addItem}
            disabled={navigation.items.length >= MAX_ITEMS}
          >
            Add item
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {navigation.items.map((item, index) => (
            <div key={item.id} className="border border-line bg-base/40">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] text-fg-faint">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[12px] font-medium text-fg">{item.label || 'Untitled'}</span>
                  <span className="border border-line px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                    {item.kind === 'mega' ? 'Mega panel' : 'Link'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Toggle
                    label="Published"
                    checked={item.published}
                    onChange={(published) => patchItem(index, { published })}
                  />
                  <button
                    type="button"
                    aria-label={`Move ${item.label} up`}
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="flex h-7 w-7 items-center justify-center border border-line text-fg-faint hover:text-fg disabled:opacity-30"
                  >
                    <Icon name="chevron-down" size={12} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${item.label} down`}
                    onClick={() => moveItem(index, 1)}
                    disabled={index === navigation.items.length - 1}
                    className="flex h-7 w-7 items-center justify-center border border-line text-fg-faint hover:text-fg disabled:opacity-30"
                  >
                    <Icon name="chevron-down" size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${item.label}`}
                    onClick={() => removeItem(index)}
                    className="flex h-7 w-7 items-center justify-center border border-line text-fg-faint hover:text-danger"
                  >
                    <Icon name="close" size={12} />
                  </button>
                </div>
              </div>

              <div className="grid gap-4 p-3 sm:grid-cols-3">
                <Input
                  label="Label"
                  value={item.label}
                  onChange={(event) => patchItem(index, { label: event.target.value })}
                />
                <Input
                  label={item.kind === 'mega' ? 'Panel landing page' : 'Destination'}
                  value={item.href}
                  onChange={(event) => patchItem(index, { href: event.target.value })}
                  placeholder="/services"
                />
                <Select
                  label="Behaviour"
                  value={item.kind}
                  onChange={(event) =>
                    patchItem(index, {
                      kind: event.target.value === 'mega' ? 'mega' : 'link',
                      columns:
                        event.target.value === 'mega' && item.columns.length === 0
                          ? [{ title: 'Column 1', links: [emptyLink()] }]
                          : item.columns,
                    })
                  }
                  options={[
                    { value: 'link', label: 'Plain link' },
                    { value: 'mega', label: 'Mega panel' },
                  ]}
                />
              </div>

              {item.kind === 'mega' ? (
                <div className="flex flex-col gap-4 border-t border-line/60 p-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Panel eyebrow"
                      value={item.eyebrow ?? ''}
                      onChange={(event) => patchItem(index, { eyebrow: event.target.value })}
                      placeholder="Capability index"
                    />
                    <Input
                      label="Panel description"
                      value={item.description ?? ''}
                      onChange={(event) => patchItem(index, { description: event.target.value })}
                      placeholder="Twenty-two services, from a wall split to a chiller plant."
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    {item.columns.map((column, columnIndex) => (
                      <SubGroup
                        key={`${item.id}-column-${columnIndex}`}
                        title={`Column ${columnIndex + 1}`}
                        actions={
                          <button
                            type="button"
                            aria-label="Remove column"
                            onClick={() => removeColumn(index, columnIndex)}
                            className="text-fg-faint hover:text-danger"
                          >
                            <Icon name="close" size={11} />
                          </button>
                        }
                      >
                        <Input
                          label="Column heading"
                          value={column.title}
                          onChange={(event) =>
                            patchColumn(index, columnIndex, { title: event.target.value })
                          }
                        />
                        <div className="mt-3 flex flex-col gap-2">
                          {column.links.map((link, linkIndex) => (
                            <div
                              key={`${item.id}-${columnIndex}-${linkIndex}`}
                              className="grid gap-2 border border-line/50 p-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
                            >
                              <Input
                                label="Label"
                                value={link.label}
                                onChange={(event) =>
                                  patchLink(index, columnIndex, linkIndex, {
                                    label: event.target.value,
                                  })
                                }
                              />
                              <Input
                                label="Destination"
                                value={link.href}
                                onChange={(event) =>
                                  patchLink(index, columnIndex, linkIndex, {
                                    href: event.target.value,
                                  })
                                }
                              />
                              <Input
                                label="Description"
                                value={link.description ?? ''}
                                onChange={(event) =>
                                  patchLink(index, columnIndex, linkIndex, {
                                    description: event.target.value,
                                  })
                                }
                                placeholder="Optional line of context"
                              />
                              <div className="flex items-end">
                                <button
                                  type="button"
                                  aria-label="Remove link"
                                  onClick={() => removeLink(index, columnIndex, linkIndex)}
                                  className="flex h-9 w-9 items-center justify-center border border-line text-fg-faint hover:text-danger"
                                >
                                  <Icon name="close" size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="quiet"
                            icon="plus"
                            onClick={() => addLink(index, columnIndex)}
                            disabled={column.links.length >= MAX_LINKS}
                          >
                            Add link
                          </Button>
                        </div>
                      </SubGroup>
                    ))}
                    <div>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon="plus"
                        onClick={() => addColumn(index)}
                        disabled={item.columns.length >= MAX_COLUMNS}
                      >
                        Add column
                      </Button>
                    </div>
                  </div>

                  <SubGroup title="Feature card (right rail)">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Eyebrow"
                        value={item.feature?.eyebrow ?? ''}
                        onChange={(event) => patchFeature(index, { eyebrow: event.target.value })}
                      />
                      <Input
                        label="Heading"
                        value={item.feature?.title ?? ''}
                        onChange={(event) => patchFeature(index, { title: event.target.value })}
                      />
                    </div>
                    <div className="mt-4">
                      <Textarea
                        label="Body"
                        rows={3}
                        value={item.feature?.body ?? ''}
                        onChange={(event) => patchFeature(index, { body: event.target.value })}
                      />
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Button label"
                        value={item.feature?.ctaLabel ?? ''}
                        onChange={(event) => patchFeature(index, { ctaLabel: event.target.value })}
                      />
                      <Input
                        label="Button destination"
                        value={item.feature?.ctaHref ?? ''}
                        onChange={(event) => patchFeature(index, { ctaHref: event.target.value })}
                      />
                      <Input
                        label="Image URL"
                        value={item.feature?.image ?? ''}
                        onChange={(event) => patchFeature(index, { image: event.target.value })}
                        placeholder="/uploads/… (optional)"
                      />
                    </div>
                  </SubGroup>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Panel footer link label"
                      value={item.cta?.label ?? ''}
                      onChange={(event) =>
                        patchItem(index, {
                          cta: { ...(item.cta ?? { href: item.href }), label: event.target.value },
                        })
                      }
                      placeholder="All services"
                    />
                    <Input
                      label="Panel footer link destination"
                      value={item.cta?.href ?? ''}
                      onChange={(event) =>
                        patchItem(index, {
                          cta: { ...(item.cta ?? { label: item.label }), href: event.target.value },
                        })
                      }
                      placeholder="/services"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          {navigation.items.length === 0 ? (
            <p className="border border-dashed border-line px-3 py-6 text-center text-[11px] text-fg-faint">
              No menu items — the header will fall back to the shipped menu until you add one.
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  )
}
