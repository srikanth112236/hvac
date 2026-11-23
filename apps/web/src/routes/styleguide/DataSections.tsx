import { useState } from 'react'
import {
  Accordion,
  Badge,
  Breadcrumbs,
  Button,
  Drawer,
  EmptyState,
  Modal,
  Pagination,
  SectionHeader,
  SkeletonBlock,
  Stat,
  Table,
  Tabs,
  Tooltip,
  useToast,
  type BadgeTone,
  type Column,
} from '@/components/ui'
import { Marquee } from '@/components/ui'
import { CounterStat } from '@/motion'

/* -------------------------------------------------------------------------- */
/*  06 — Data display                                                         */
/* -------------------------------------------------------------------------- */

type JobRow = {
  id: string
  ref: string
  customer: string
  service: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'on-hold'
  value: string
}

const statusTone: Record<JobRow['status'], BadgeTone> = {
  scheduled: 'cold',
  'in-progress': 'warn',
  completed: 'success',
  'on-hold': 'danger',
}

const jobs: JobRow[] = [
  { id: '1', ref: 'JOB-2026-0412', customer: 'Meridian Foods', service: 'Cold room · 12 TR', status: 'in-progress', value: '$8,450' },
  { id: '2', ref: 'JOB-2026-0413', customer: 'S. Whitaker', service: 'Split service · 2 units', status: 'scheduled', value: '$420' },
  { id: '3', ref: 'JOB-2026-0414', customer: 'Northline Labs', service: 'Precision cooling audit', status: 'completed', value: '$4,600' },
  { id: '4', ref: 'JOB-2026-0415', customer: 'Meridian Offices', service: 'VRF leak detection', status: 'on-hold', value: '$1,280' },
]

const columns: Column<JobRow>[] = [
  { key: 'ref', header: 'Job', mono: true },
  { key: 'customer', header: 'Customer' },
  { key: 'service', header: 'Scope' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge tone={statusTone[row.status]} dot>
        {row.status}
      </Badge>
    ),
  },
  { key: 'value', header: 'Value', align: 'right', mono: true },
]

export function DataDisplay() {
  const [page, setPage] = useState(2)

  return (
    <section id="data" className="flex flex-col gap-8 scroll-mt-28">
      <SectionHeader
        index="06"
        label="Data display"
        title="Numbers get the mono face."
        description="Admin surfaces are dense on purpose: 13px rows, hairline separators, tabular numerals, status shown by a single dot and word — never a colour alone."
      />

      <div className="flex flex-wrap items-center gap-2">
        {(['neutral', 'cold', 'heat', 'success', 'warn', 'danger'] as BadgeTone[]).map((tone) => (
          <Badge key={tone} tone={tone} dot>
            {tone}
          </Badge>
        ))}
        <Badge tone="cold">No dot</Badge>
      </div>

      <div className="grid grid-cols-2 gap-6 border border-line bg-panel/40 p-6 md:grid-cols-4">
        <Stat label="Tonnage live" value={<CounterStat value={18600} />} unit="TR" note="Commissioned" />
        <Stat label="Open jobs" value={14} note="3 emergency" size="sm" />
        <Stat label="Cash today" value="$12.4k" size="sm" />
        <Stat label="Response" value={<CounterStat value={4} suffix="h" />} note="City median" size="sm" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <span className="t-label">Table · server-side pagination pattern</span>
          <Pagination page={page} pageCount={9} onPageChange={setPage} />
        </div>
        <Table columns={columns} rows={jobs} caption="Sample job board rows" />
        <Breadcrumbs
          items={[
            { label: 'Admin', href: '#' },
            { label: 'Jobs', href: '#' },
            { label: 'JOB-2026-0414' },
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <EmptyState
          icon="filter"
          title="No jobs match these filters"
          description="Widen the date range or clear the technician filter. Nothing is lost — the records still exist."
          action={
            <Button variant="secondary" size="sm">
              Clear filters
            </Button>
          }
        />
        <div className="flex flex-col gap-5 border border-line bg-panel/40 p-6">
          <span className="t-label">Loading state</span>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 animate-pulse bg-panel-2" />
            <SkeletonBlock className="flex-1" lines={2} />
          </div>
          <SkeletonBlock lines={4} />
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
            Skeletons mirror the final geometry
          </p>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  07 — Disclosure                                                           */
/* -------------------------------------------------------------------------- */

const tabContent: Record<string, string> = {
  overview:
    'A 320 TR air-cooled screw chiller serving a 14-floor office. Two circuits, staged loading, 0.58 kW/TR at design conditions.',
  specification:
    'Condenser: 6 × 80 TR modules. Evaporator: shell and tube, 6.5 °C leaving water. Refrigerant R-134a. Sound 78 dB(A) at 1 m.',
  exclusions:
    'Structural plinth, primary cabling, and water treatment are excluded. Cooling tower make-up water is by others.',
}

export function Disclosure() {
  const [tab, setTab] = useState('overview')
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { toast } = useToast()

  return (
    <section id="disclosure" className="flex flex-col gap-8 scroll-mt-28">
      <SectionHeader
        index="07"
        label="Disclosure"
        title="Layered detail, one click deep."
        description="Tabs for parallel content, accordions for questions, modal for confirmation, drawer for record detail. All dismissable by Escape and focus-managed."
      />

      <div className="border border-line bg-panel/40 p-6">
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'specification', label: 'Specification', count: 6 },
            { id: 'exclusions', label: 'Exclusions' },
          ]}
          value={tab}
          onChange={setTab}
          ariaLabel="Chiller detail"
        />
        <p className="min-h-[72px] pt-5 text-sm leading-relaxed text-fg-dim">{tabContent[tab]}</p>
      </div>

      <Accordion
        defaultOpen="gas"
        items={[
          {
            id: 'gas',
            title: 'How is refrigerant charging measured?',
            content:
              'By weight against the nameplate charge, then verified by subcooling and superheat at the same ambient. Pressure alone is not a charge test.',
          },
          {
            id: 'warranty',
            title: 'What does the installation warranty cover?',
            content:
              'Twelve months on workmanship: brazing, insulation, condensate drainage, electrical terminations and commissioning. Equipment warranty is carried by the OEM.',
          },
          {
            id: 'amc',
            title: 'Can an AMC start after a repair?',
            content:
              'Yes. The unit must pass a 30-minute load run and a leak test first; the contract then starts on the next calendar month.',
          },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          Open modal
        </Button>
        <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
          Open drawer
        </Button>
        <Tooltip label="Pages the dispatcher within 60 seconds">
          <Button variant="ghost" icon="alert">
            Emergency?
          </Button>
        </Tooltip>
        <Button
          variant="ghost"
          onClick={() =>
            toast({
              title: 'Lead captured',
              description: 'Sample toast. Phase 2 writes this to the admin inbox.',
              tone: 'success',
            })
          }
        >
          Fire toast
        </Button>
      </div>

      <div className="border-y border-line py-5">
        <Marquee duration={26}>
          {['ISHRAE', 'ASHRAE 62.1', 'R-32', 'R-410A', 'R-134a', 'VRF', 'Chilled water', 'ISO 9001'].map(
            (item) => (
              <span
                key={item}
                className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-faint"
              >
                {item}
              </span>
            ),
          )}
        </Marquee>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm emergency dispatch"
        description="A dispatcher is paged immediately and the SLA clock starts."
        footer={
          <>
            <Button variant="quiet" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setModalOpen(false)
                toast({ title: 'Dispatch requested', tone: 'warn', description: 'SLA timer started.' })
              }}
            >
              Dispatch
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 font-mono text-[11px] uppercase tracking-[0.08em]">
          <span className="flex justify-between border-b border-line/70 pb-2">
            <span className="text-fg-faint">Site</span> Meridian Foods · Irving
          </span>
          <span className="flex justify-between border-b border-line/70 pb-2">
            <span className="text-fg-faint">System</span> Cold room · 12 TR
          </span>
          <span className="flex justify-between">
            <span className="text-fg-faint">Response</span> 4 h target
          </span>
        </div>
      </Modal>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="JOB-2026-0414"
        description="Northline Labs · precision cooling audit"
        footer={
          <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Technician" value="A. Shaikh" size="sm" />
            <Stat label="Duration" value="3.5 h" size="sm" />
            <Stat label="Parts" value="2" size="sm" />
            <Stat label="Cash" value="$4,600" size="sm" />
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-faint">
            <span>09:10 · En route</span>
            <span>09:42 · Arrived, gate pass 4</span>
            <span>11:05 · Filter pressure differential 38 Pa</span>
            <span>12:30 · Completed, signature captured</span>
          </div>
        </div>
      </Drawer>
    </section>
  )
}
