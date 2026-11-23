import { useState } from 'react'
import { useSeo } from '@/lib/seo'
import { EnquiryForm } from '@/routes/contact/EnquiryForm'
import { ServiceCalculator } from '@/routes/services/ServiceCalculator'
import type { CalculatorKind } from '@/content/serviceDetails'

const tools: { id: CalculatorKind; label: string; service: string; note: string }[] = [
  {
    id: 'tonnage',
    label: 'Room tonnage',
    service: 'Split / cassette sizing',
    note: 'Indicative load from area, glazing exposure and occupancy.',
  },
  {
    id: 'vrf',
    label: 'VRF zones',
    service: 'VRF / VRV planning',
    note: 'Room count, diversity and block load for a multi-room brief.',
  },
  {
    id: 'duct',
    label: 'Duct sizing',
    service: 'Duct design',
    note: 'Airflow and velocity check for a trunk or branch.',
  },
  {
    id: 'cold-room',
    label: 'Cold room',
    service: 'Cold room load',
    note: 'Volume, temperature class and door traffic.',
  },
  {
    id: 'chiller',
    label: 'Chiller capacity',
    service: 'Chilled water plant',
    note: 'Area and load density for a central plant conversation.',
  },
  {
    id: 'amc',
    label: 'AMC plan',
    service: 'Maintenance plan',
    note: 'Unit count and plan level for an annual cover estimate.',
  },
]

export function ToolsPage() {
  useSeo({
    path: '/tools',
    title: 'HVAC calculators',
    description:
      'Indicative HVAC sizing tools: room tonnage, VRF zones, duct sizing, cold room load, chiller capacity and AMC plan comparison. Send the result to the works desk.',
  })
  const [active, setActive] = useState<CalculatorKind>('tonnage')
  const [prefill, setPrefill] = useState('')
  const selected = tools.find((tool) => tool.id === active) ?? tools[0]!

  const sendToDesk = (message: string) => {
    setPrefill(message)
    document.getElementById('tools-enquire')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="border-b border-line">
      <div className="shell pb-16 pt-12 lg:pt-16">
        <span className="annot">Tools · CV-TOOLS</span>
        <h1 className="t-display mt-6 max-w-[15ch] text-fg">A first number, not a quote.</h1>
        <p className="mt-6 max-w-prose text-sm leading-relaxed text-fg-dim">
          These calculators start the conversation. They state their inputs and are labelled
          indicative: a measured survey and a room-by-room load calculation still decide the
          equipment. Send the result and the works desk will check the assumptions.
        </p>

        <div className="mt-8 flex flex-wrap gap-1 border-b border-line">
          {tools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActive(tool.id)}
              className={`border-b-2 px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] ${
                active === tool.id
                  ? 'border-cold text-cold'
                  : 'border-transparent text-fg-faint hover:text-fg'
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="border border-line bg-panel/30 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-cold">
                    {selected.label}
                  </p>
                  <h2 className="mt-1 text-lg text-fg">{selected.service}</h2>
                  <p className="mt-1 text-[11px] text-fg-faint">{selected.note}</p>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                  Indicative
                </span>
              </div>
              <div className="mt-5">
                <ServiceCalculator
                  key={active}
                  kind={active}
                  serviceName={selected.service}
                  onSend={sendToDesk}
                />
              </div>
            </div>
          </div>
          <div id="tools-enquire" className="scroll-mt-[calc(var(--header-h)+24px)] lg:col-span-5">
            <EnquiryForm
              prefillMessage={prefill}
              context={`Tools · ${selected.label}`}
              source="calculator"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
