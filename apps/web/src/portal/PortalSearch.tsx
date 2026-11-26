import { useEffect, useMemo, useState } from 'react'
import type { CustomerPortalFile } from '@hvac/shared'
import { Icon } from '@/components/icons'
import { Badge, Input, Modal } from '@/components/ui'

export type PortalSearchTab =
  | 'overview'
  | 'visits'
  | 'invoices'
  | 'quotes'
  | 'equipment'
  | 'cover'
  | 'reports'
  | 'support'
  | 'account'

interface SearchItem {
  id: string
  kind: string
  title: string
  meta: string
  tab: PortalSearchTab
  searchable: string
}

interface PortalSearchProps {
  overview: CustomerPortalFile | null
  onNavigate: (tab: PortalSearchTab) => void
  compact?: boolean
}

/** Global client-side search across visits, invoices, quotes, equipment, AMC, reports, tickets and sites. */
export function PortalSearch({ overview, onNavigate, compact = false }: PortalSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
      if (
        event.key === '/' &&
        !open &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement) &&
        !(event.target instanceof HTMLSelectElement)
      ) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const index = useMemo<SearchItem[]>(() => {
    if (!overview) return []
    const items: SearchItem[] = []
    for (const a of overview.appointments) {
      items.push({
        id: `visit-${a.id}`,
        kind: 'visit',
        title: `${a.ref} · ${a.serviceName}`,
        meta: [a.status, a.technician, a.address].filter(Boolean).join(' · '),
        tab: 'visits',
        searchable: `${a.ref} ${a.serviceName} ${a.status} ${a.technician} ${a.address}`.toLowerCase(),
      })
    }
    for (const inv of overview.invoices) {
      items.push({
        id: `inv-${inv.id}`,
        kind: 'invoice',
        title: inv.ref,
        meta: `${inv.status} · $${Math.round(inv.totals.total)}`,
        tab: 'invoices',
        searchable: `${inv.ref} ${inv.status} ${inv.service} ${inv.totals.total} ${inv.notes}`.toLowerCase(),
      })
    }
    for (const qt of overview.quotations) {
      items.push({
        id: `qt-${qt.id}`,
        kind: 'quote',
        title: `${qt.ref} · ${qt.title}`,
        meta: [qt.status, qt.service].filter(Boolean).join(' · '),
        tab: 'quotes',
        searchable: `${qt.ref} ${qt.title} ${qt.status} ${qt.service}`.toLowerCase(),
      })
    }
    for (const eq of overview.equipment) {
      items.push({
        id: `eq-${eq.id}`,
        kind: 'equipment',
        title: eq.name,
        meta: [eq.brand, eq.model, eq.capacity].filter(Boolean).join(' · ') || 'Registered asset',
        tab: 'equipment',
        searchable: `${eq.name} ${eq.brand} ${eq.model} ${eq.serial} ${eq.capacity}`.toLowerCase(),
      })
    }
    for (const contract of overview.amc) {
      items.push({
        id: `amc-${contract.id}`,
        kind: 'amc',
        title: `${contract.ref} · ${contract.plan}`,
        meta: contract.status,
        tab: 'cover',
        searchable: `${contract.ref} ${contract.plan} ${contract.status}`.toLowerCase(),
      })
    }
    for (const rpt of overview.reports) {
      items.push({
        id: `rpt-${rpt.id}`,
        kind: 'report',
        title: `${rpt.ref} · ${rpt.title}`,
        meta: rpt.technician || 'Service report',
        tab: 'reports',
        searchable: `${rpt.ref} ${rpt.title} ${rpt.findings} ${rpt.technician}`.toLowerCase(),
      })
    }
    for (const t of overview.tickets) {
      items.push({
        id: `tkt-${t.id}`,
        kind: 'ticket',
        title: `${t.ref} · ${t.subject}`,
        meta: `${t.status} · ${t.category}`,
        tab: 'support',
        searchable: `${t.ref} ${t.subject} ${t.status} ${t.category}`.toLowerCase(),
      })
    }
    for (const site of overview.sites) {
      items.push({
        id: `site-${site.id}`,
        kind: 'site',
        title: site.label,
        meta: [site.address, site.city].filter(Boolean).join(', '),
        tab: 'account',
        searchable: `${site.label} ${site.address} ${site.city} ${site.region}`.toLowerCase(),
      })
    }
    return items
  }, [overview])

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (term.length < 2) return []
    return index.filter((item) => item.searchable.includes(term)).slice(0, 20)
  }, [index, query])

  const select = (item: SearchItem) => {
    setOpen(false)
    setQuery('')
    onNavigate(item.tab)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? 'flex h-8 items-center gap-2 border border-line bg-panel/40 px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint hover:border-cold/40 hover:text-cold'
            : 'flex w-full items-center gap-2 border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint hover:border-cold/40 hover:text-cold'
        }
      >
        <Icon name="search" size={13} />
        <span>Search</span>
        <span className="ml-auto border border-line px-1.5 py-0.5 text-[8px] tracking-[0.06em]">
          Ctrl K
        </span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Search your file"
        description="Visits, invoices, quotations, equipment, AMC contracts, reports, support tickets and sites."
      >
        <Input
          autoFocus
          label="Search"
          placeholder="Reference, invoice number, equipment, site…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="mt-4 max-h-[50vh] overflow-auto border border-line">
          {query.trim().length < 2 ? (
            <p className="p-4 text-[11px] text-fg-faint">Type at least two characters.</p>
          ) : results.length === 0 ? (
            <p className="p-4 text-[11px] text-fg-faint">No matching records in your file.</p>
          ) : (
            <ul className="divide-y divide-line">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => select(result)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-panel/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-fg">{result.title}</p>
                      <p className="truncate font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                        {result.meta}
                      </p>
                    </div>
                    <Badge tone="neutral">{result.kind}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  )
}
