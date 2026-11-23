import { useState, type FormEvent } from 'react'
import { callbackRequestSchema } from '@hvac/shared'
import { Icon } from '@/components/icons'
import { Button, ButtonAnchor, ButtonLink, Input, Select, TimeSlotPicker, useToast } from '@/components/ui'
import { MagneticButton, SplitReveal } from '@/motion'
import { useBrand } from '@/brand/BrandProvider'
import { useSiteContent } from '@/content/SiteContentProvider'
import { submitCallback } from '@/lib/leads'

const stages = [
  { index: '01', icon: 'condenser' as const, label: 'Outdoor unit', spec: '3,200 CFM · 45 °C ambient' },
  { index: '02', icon: 'refrigerant' as const, label: 'Refrigerant line', spec: '9.5 / 15.9 mm · 68 m' },
  { index: '03', icon: 'ahu' as const, label: 'Indoor AHU', spec: '6.5 °C coil · 640 CFM' },
  { index: '04', icon: 'duct' as const, label: 'Distribution', spec: '42 Pa · 24 °C ±0.5' },
]

const scopeOptions = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'maintenance', label: 'Maintenance / AMC' },
]

const callWindows = [
  { value: 'morning', label: '09–12' },
  { value: 'afternoon', label: '12–16' },
  { value: 'evening', label: '16–19' },
]

interface Receipt {
  ref: string
  name: string
  phone: string
  window: string
  scope: string
}

/**
 * Hero: asymmetric headline, an embedded callback panel, and a full-bleed
 * system elevation drawn from the custom glyph set. The elevation replaces a
 * stock hero photograph with the technical drawing the copy is actually about.
 */
export function Hero() {
  const brand = useBrand()
  const { content } = useSiteContent()
  const { home } = content

  return (
    <section className="relative border-b border-line">
      <div className="shell grid gap-x-8 gap-y-12 pb-12 pt-10 md:grid-cols-12 lg:pt-16">
        <div className="md:col-span-7">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="annot">{home.heroEyebrow}</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-fg-faint">
              Est. {brand.foundedYear} · {brand.credentials[0] ?? 'ISHRAE member'}
            </span>
          </div>

          <SplitReveal
            key={home.heroTitle}
            as="h1"
            className="t-display mt-7 max-w-[13ch] text-fg"
            stagger={0.05}
          >
            {home.heroTitle}
          </SplitReveal>

          <p className="t-lead mt-7 max-w-[56ch]">{home.heroLead}</p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <MagneticButton>
              <ButtonAnchor href="#callback" size="lg" icon="arrow-up-right">
                Request a site survey
              </ButtonAnchor>
            </MagneticButton>
            <ButtonLink to="/services" variant="secondary" size="lg" icon="arrow-right">
              Service index
            </ButtonLink>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-5">
            {[
              ['Response', `${brand.stats.emergencyResponseHours} h`],
              ['Coverage', `${brand.serviceAreas.length} cities`],
              ['Settlement', 'On site'],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
                  {label}
                </dt>
                <dd className="t-num text-[13px] text-fg">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="md:col-span-4 md:col-start-9">
          <CallbackPanel />
        </div>
      </div>

      {home.heroImage ? (
        <div className="shell pb-8 pt-2">
          <figure className="overflow-hidden border border-line bg-panel/40">
            <img
              src={home.heroImage}
              alt={home.heroImageAlt || 'Coolvane HVAC installation'}
              className="h-[clamp(220px,36vw,460px)] w-full object-cover"
              loading="eager"
            />
            {home.heroImageAlt ? (
              <figcaption className="border-t border-line px-4 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                {home.heroImageAlt}
              </figcaption>
            ) : null}
          </figure>
        </div>
      ) : null}

      <div className="border-t border-line bg-panel/25">
        <div className="shell">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 py-3">
            <span className="t-label">System elevation · CV-SYS-01</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
              R-32 · 42 Pa · 24 °C ±0.5
            </span>
          </div>

          <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
            {stages.map((stage, index) => (
              <div
                key={stage.index}
                className="group relative bg-base px-5 py-6 transition-colors duration-3 hover:bg-panel/60 md:py-7"
              >
                <div className="flex items-start justify-between">
                  <Icon name={stage.icon} size={30} className="text-cold" />
                  <span className="t-num text-[10px] text-fg-faint">{stage.index}</span>
                </div>
                <p className="t-h4 mt-6 text-fg">{stage.label}</p>
                <p className="mt-1.5 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-dim">
                  {stage.spec}
                </p>
                {index < stages.length - 1 ? (
                  <Icon
                    name="arrow-right"
                    size={14}
                    className="absolute right-4 top-1/2 hidden -translate-y-1/2 text-fg-faint/60 md:block"
                  />
                ) : null}
              </div>
            ))}
          </div>
          <div className="thread" />
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Embedded callback panel                                                   */
/* -------------------------------------------------------------------------- */

function CallbackPanel() {
  const brand = useBrand()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [scope, setScope] = useState('residential')
  const [slot, setSlot] = useState('morning')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [pending, setPending] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [honeypot, setHoneypot] = useState('')

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError('')
    const parsed = callbackRequestSchema.safeParse({ name, phone, window: slot })

    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0])
        if (!next[key]) next[key] = issue.message
      }
      setErrors(next)
      return
    }

    setErrors({})
    setPending(true)
    try {
      const lead = await submitCallback({
        ...parsed.data,
        scope: scopeOptions.find((option) => option.value === scope)?.label ?? scope,
        honeypot,
      })
      setReceipt({
        ref: lead.ref,
        name: parsed.data.name,
        phone: parsed.data.phone,
        window: callWindows.find((option) => option.value === parsed.data.window)?.label ?? '',
        scope: scopeOptions.find((option) => option.value === scope)?.label ?? '',
      })
      toast({
        title: 'Callback request logged',
        description: `Routed to dispatch · ${lead.ref}`,
        tone: 'success',
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'The callback could not be logged.'
      setSubmitError(detail)
      toast({ title: 'Callback not captured', description: detail, tone: 'danger' })
    } finally {
      setPending(false)
    }
  }

  const reset = () => {
    setReceipt(null)
    setName('')
    setPhone('')
    setSlot('morning')
    setScope('residential')
    setErrors({})
    setHoneypot('')
  }

  return (
    <div
      id="callback"
      className="marks scroll-mt-[calc(var(--header-h)+24px)] border border-line bg-panel/80 p-6 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="annot">Enquiry · 01</span>
        <span className="t-num text-[10px] text-fg-faint">CV/ENQ</span>
      </div>

      {receipt ? (
        <div className="mt-5 flex flex-col gap-4" aria-live="polite">
          <div className="flex items-center gap-2 text-success">
            <Icon name="check" size={16} />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Request logged
            </span>
          </div>
          <p className="t-num text-h3 text-fg">{receipt.ref}</p>
          <dl className="flex flex-col border-t border-line/70">
            {[
              ['Name', receipt.name],
              ['Phone', receipt.phone],
              ['Scope', receipt.scope],
              ['Window', receipt.window],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-3 border-b border-line/70 py-2"
              >
                <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                  {label}
                </dt>
                <dd className="font-mono text-[11px] text-fg-dim">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[11px] leading-relaxed text-fg-faint">
            Stored in the works lead inbox with status new. Dispatch calls the number above; the
            acknowledgement email is not connected in this build.
          </p>
          <Button type="button" variant="quiet" size="sm" onClick={reset} icon="arrow-right">
            Send another
          </Button>
        </div>
      ) : (
        <>
          <h2 className="t-h4 mt-5 text-fg">Request a callback</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-fg-dim">
            Answered inside one working hour, 08:00–19:00. Dispatch answers at 02:00.
          </p>
          <div className="rule-ticks mt-5" />

          <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-4">
            <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
              <label htmlFor="callback-company-website">Company website</label>
              <input
                id="callback-company-website"
                name="company_website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />
            </div>
            <Input
              label="Name"
              name="name"
              autoComplete="name"
              placeholder="Site contact"
              value={name}
              error={errors.name}
              onChange={(event) => {
                setName(event.target.value)
                if (errors.name) setErrors(({ name: _drop, ...rest }) => rest)
              }}
            />
            <Input
              label="Phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 555-0100"
              value={phone}
              error={errors.phone}
              onChange={(event) => {
                setPhone(event.target.value)
                if (errors.phone) setErrors(({ phone: _drop, ...rest }) => rest)
              }}
            />
            <Select
              label="Scope"
              name="scope"
              options={scopeOptions}
              value={scope}
              onChange={(event) => setScope(event.target.value)}
            />
            <TimeSlotPicker
              label="Call window"
              slots={callWindows}
              value={slot}
              onChange={setSlot}
              columns={3}
              error={errors.window}
            />

            {submitError ? (
              <p role="alert" className="border border-danger/40 bg-danger/[0.06] p-3 text-[11px] leading-relaxed text-fg-dim">
                {submitError} Call{' '}
                <a href={`tel:${brand.contact.emergencyPhone}`} className="font-mono text-cold underline">
                  {brand.contact.emergencyPhone}
                </a>{' '}
                for dispatch.
              </p>
            ) : null}

            <Button type="submit" full icon={pending ? 'clock' : 'arrow-right'} disabled={pending}>
              {pending ? 'Logging request…' : 'Request callback'}
            </Button>

            <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
              No payment gateway · cash, cheque or card on site
            </p>
          </form>
        </>
      )}
    </div>
  )
}
