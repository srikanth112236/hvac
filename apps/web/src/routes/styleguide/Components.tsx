import { useState } from 'react'
import {
  Button,
  Checkbox,
  DatePicker,
  Field,
  Input,
  Radio,
  SectionHeader,
  Select,
  Textarea,
  TimeSlotPicker,
  Toggle,
} from '@/components/ui'
import { MagneticButton } from '@/motion'
import { MetaLink, RouterTextLink, TextLink } from '@/components/ui/Link'
import { cn } from '@/lib/cn'

/* -------------------------------------------------------------------------- */
/*  04 — Actions                                                              */
/* -------------------------------------------------------------------------- */

export function Actions() {
  return (
    <section id="actions" className="flex flex-col gap-8 scroll-mt-28">
      <SectionHeader
        index="04"
        label="Actions"
        title="Rectangular, loaded, legible."
        description="Primary buttons carry the heat/cold thread: the cold fill slides out, the ember fill slides in. Mono labels at 11px keep the control feeling machined rather than soft."
      />

      <div className="flex flex-col gap-6 border border-line bg-panel/40 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Get a quote</Button>
          <Button variant="secondary">Book a survey</Button>
          <Button variant="ghost">View specs</Button>
          <Button variant="quiet">Skip</Button>
          <Button variant="danger">Cancel job</Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" icon="arrow-right">
            Small
          </Button>
          <Button size="md" icon="calendar" iconPosition="left">
            Schedule
          </Button>
          <Button size="lg" variant="secondary" icon="arrow-up-right">
            Large
          </Button>
          <Button disabled>Disabled</Button>
          <MagneticButton>
            <Button variant="secondary" icon="airflow">
              Magnetic
            </Button>
          </MagneticButton>
        </div>

        <div className="flex flex-wrap items-center gap-6 border-t border-line/70 pt-5">
          <TextLink href="#actions" arrow>
            Animated underline
          </TextLink>
          <RouterTextLink to="/" tone="cold" arrow>
            Router link
          </RouterTextLink>
          <MetaLink href="#actions">
            <span>+1 214 555 0140</span>
          </MetaLink>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Primary', 'One per view. The single action you want.'],
          ['Secondary', 'Paired actions, filters, exports.'],
          ['Ghost / quiet', 'Inline navigation and tertiary controls.'],
        ].map(([name, usage]) => (
          <div key={name} className="border border-line px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg">{name}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-fg-faint">{usage}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  05 — Forms                                                                */
/* -------------------------------------------------------------------------- */

const slotOptions = [
  { value: '08:00', label: '08:00' },
  { value: '10:00', label: '10:00' },
  { value: '12:00', label: '12:00', disabled: true },
  { value: '14:00', label: '14:00' },
  { value: '16:00', label: '16:00' },
  { value: '18:00', label: '18:00' },
  { value: '20:00', label: '20:00', disabled: true },
  { value: '21:00', label: '21:00' },
]

export function Forms() {
  const [slot, setSlot] = useState('10:00')
  const [commercial, setCommercial] = useState(true)
  const [emergency, setEmergency] = useState(false)
  const [emailUpdates, setEmailUpdates] = useState(false)

  return (
    <section id="forms" className="flex flex-col gap-8 scroll-mt-28">
      <SectionHeader
        index="05"
        label="Forms"
        title="Every field is a technical read-out."
        description="Labels are mono and uppercase; values are the body face. Errors sit under the field in danger ink with an icon, never as a tooltip or a toast."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-6 border border-line bg-panel/40 p-6">
          <span className="t-label">Text inputs</span>
          <Input label="Contact name" placeholder="e.g. R. Iyer" required />
          <Input
            label="Email"
            type="email"
            placeholder="works@company.com"
            hint="Used only for the service report and invoice."
          />
          <Input
            label="Phone"
            defaultValue="+1 214"
            error="Enter a reachable number with 10 digits."
          />
          <Input label="EIN / Tax ID" placeholder="12-3456789" disabled />
        </div>

        <div className="flex flex-col gap-6 border border-line bg-panel/40 p-6">
          <span className="t-label">Selection</span>
          <Select
            label="Service"
            placeholder="Choose a service"
            options={[
              { value: 'split-install', label: 'Split AC installation' },
              { value: 'vrf', label: 'VRF design & installation' },
              { value: 'chiller', label: 'Chiller overhaul' },
              { value: 'amc', label: 'AMC contract' },
            ]}
          />
          <DatePicker label="Preferred date" />
          <Textarea
            label="Fault description"
            placeholder="Unit trips after 20 minutes. Outdoor coil iced over."
            hint="Include the model, capacity and age if you know them."
          />
          <Field label="Urgency">
            <div className="flex flex-col gap-2">
              <Radio
                name="urgency"
                label="Normal"
                description="Next available slot, usually within 48 hours."
                checked={!emergency}
                onChange={() => setEmergency(false)}
              />
              <Radio
                name="urgency"
                label="Emergency 24×7"
                description="Dispatcher is paged immediately; 4-hour response."
                checked={emergency}
                onChange={() => setEmergency(true)}
              />
            </div>
          </Field>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-6 border border-line bg-panel/40 p-6">
          <span className="t-label">Time slot · real availability</span>
          <TimeSlotPicker
            label="Arrival window"
            slots={slotOptions}
            value={slot}
            onChange={setSlot}
            hint="Slots reflect technician capacity in your service area."
          />
        </div>

        <div className="flex flex-col gap-6 border border-line bg-panel/40 p-6">
          <span className="t-label">Consent & preferences</span>
          <Checkbox
            label="I own or manage this site"
            description="Required to dispatch a technician."
            defaultChecked
          />
          <Checkbox label="Send the quote as a PDF" defaultChecked />
          <Checkbox label="Notify me about AMC renewals" disabled />
          <div className="border-t border-line/70 pt-5">
            <Toggle
              checked={commercial}
              onChange={setCommercial}
              label="Commercial site"
              description="Adds three-phase power and access requirements to the job card."
            />
          </div>
          <Toggle
            checked={emailUpdates}
            onChange={setEmailUpdates}
            label="Email on technician arrival"
            description="Email only; no SMS is sent."
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border border-line bg-panel/40 px-6 py-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-faint">
          Cash settlement only · no online payment in this template
        </span>
        <span
          className={cn(
            'font-mono text-[10px] uppercase tracking-[0.12em]',
            emergency ? 'text-heat' : 'text-fg-faint',
          )}
        >
          {emergency ? 'Emergency path armed' : 'Standard path'}
        </span>
      </div>
    </section>
  )
}
