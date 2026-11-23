import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { contactEnquirySchema, type LeadRecord, type LeadSource } from '@hvac/shared'
import { Icon } from '@/components/icons'
import { Button, Input, Radio, Select, Textarea, useToast } from '@/components/ui'
import { useBrand } from '@/brand/BrandProvider'
import { useSiteContent, useSiteServices } from '@/content/SiteContentProvider'
import { submitEnquiry } from '@/lib/leads'

interface EnquiryFormProps {
  /** Service detail pages lock the brief to the service that owns the page. */
  lockedServiceId?: string
  source?: LeadSource
  /** Calculator or plan output, pushed into the brief by the parent page. */
  prefillMessage?: string
  context?: string
  plan?: string
}

/**
 * Enquiry form. Validated with the shared contract, then posted to the works
 * API, which stores the lead with its service slug. The receipt is the API's
 * reference — an unreachable API never produces a fabricated confirmation.
 */
export function EnquiryForm({
  lockedServiceId,
  source = 'contact-page',
  prefillMessage = '',
  context,
  plan,
}: EnquiryFormProps) {
  const brand = useBrand()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  const liveServices = useSiteServices()
  const { content } = useSiteContent()
  const formCopy = content.pageSections.contact.form
  const nameFor = (id: string) =>
    liveServices.find((service) => service.id === id)?.name ?? 'Not specified'

  const requested = searchParams.get('service') ?? ''
  const resolvedService =
    lockedServiceId ??
    (liveServices.some((service) => service.id === requested) ? requested : '')

  const [serviceId, setServiceId] = useState(resolvedService)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [message, setMessage] = useState(prefillMessage)
  const [urgency, setUrgency] = useState<'normal' | 'emergency'>('normal')
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [receipt, setReceipt] = useState<LeadRecord | null>(null)
  const [pending, setPending] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    setServiceId(resolvedService)
  }, [resolvedService])

  useEffect(() => {
    if (prefillMessage) setMessage(prefillMessage)
  }, [prefillMessage])

  const serviceOptions = liveServices.map((service) => ({
    value: service.id,
    label: service.name,
  }))

  const cityOptions = brand.serviceAreas.map((area) => ({
    value: area.city,
    label: `${area.city} · ${area.radiusKm} km`,
  }))

  const clearError = (key: string) => {
    setErrors((previous) => {
      if (!previous[key]) return previous
      const next = { ...previous }
      delete next[key]
      return next
    })
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError('')

    const parsed = contactEnquirySchema.safeParse({
      name,
      email,
      phone,
      message,
      serviceSlug: serviceId || undefined,
      city: city || undefined,
      urgency,
    })

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
      const lead = await submitEnquiry({
        ...parsed.data,
        source,
        serviceName: parsed.data.serviceSlug ? nameFor(parsed.data.serviceSlug) : undefined,
        context,
        plan,
        honeypot,
      })
      setReceipt(lead)
      toast({
        title: 'Enquiry logged',
        description: `Routed to ${lead.serviceName ?? 'the works desk'} · ${lead.ref}`,
        tone: parsed.data.urgency === 'emergency' ? 'warn' : 'success',
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'The enquiry could not be logged.'
      setSubmitError(detail)
      toast({ title: 'Enquiry not captured', description: detail, tone: 'danger' })
    } finally {
      setPending(false)
    }
  }

  const reset = () => {
    setReceipt(null)
    setName('')
    setEmail('')
    setPhone('')
    setCity('')
    setMessage(prefillMessage)
    setUrgency('normal')
    setServiceId(resolvedService)
    setErrors({})
    setSubmitError('')
    setHoneypot('')
  }

  return (
    <div id="enquire" className="marks scroll-mt-[calc(var(--header-h)+24px)] border border-line bg-panel/60 p-6 md:p-7">
      <div className="flex items-center justify-between gap-3">
        <span className="annot">Enquiry · 01</span>
        <span className="t-num text-[10px] text-fg-faint">CV/ENQ</span>
      </div>

      {receipt ? (
        <div className="mt-5 flex flex-col gap-4" aria-live="polite">
          <div className="flex items-center gap-2 text-success">
            <Icon name="check" size={16} />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Lead captured
            </span>
          </div>

          <p className="t-num text-h3 text-fg">{receipt.ref}</p>

          <div className="border border-cold/30 bg-cold/[0.06] p-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
              Routed to
            </span>
            <p className="mt-1 text-[13px] text-fg">
              {receipt.serviceName ?? 'Works desk — service to be allocated'}
            </p>
            {receipt.plan ? (
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-cold">
                Plan · {receipt.plan}
              </p>
            ) : null}
          </div>

          <dl className="flex flex-col border-t border-line/70">
            {[
              ['Name', receipt.name],
              ['Email', receipt.email],
              ['Phone', receipt.phone],
              ['Service', receipt.serviceName ?? 'Not specified'],
              ['Site city', receipt.city ?? 'Not specified'],
              ['Urgency', receipt.urgency === 'emergency' ? 'Emergency 24 × 7' : 'Normal'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-4 border-b border-line/70 py-2"
              >
                <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                  {label}
                </dt>
                <dd className="text-right font-mono text-[11px] text-fg-dim">{value}</dd>
              </div>
            ))}
          </dl>

          {receipt.urgency === 'emergency' ? (
            <p className="border border-heat/30 bg-heat/[0.06] p-3 text-[11px] leading-relaxed text-fg-dim">
              Emergency path — the form does not replace dispatch. Call{' '}
              <a href={`tel:${brand.contact.emergencyPhone}`} className="text-heat underline">
                {brand.contact.emergencyPhone}
              </a>{' '}
              now.
            </p>
          ) : null}

          <p className="text-[11px] leading-relaxed text-fg-faint">
            Stored against {receipt.serviceSlug ?? 'the general works queue'} with status{' '}
            <span className="text-fg-dim">new</span>. If a confirmation email does not arrive, the
            works desk still calls within one working hour.
          </p>

          <Button type="button" variant="quiet" size="sm" onClick={reset} icon="arrow-right">
            Send another
          </Button>
        </div>
      ) : (
        <>
          <h2 className="t-h3 mt-5 text-fg">{formCopy.title}</h2>
          <p className="mt-2 max-w-[46ch] text-[13px] leading-relaxed text-fg-dim">
            {formCopy.body}
          </p>
          <div className="rule-ticks mt-5" />

          <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-4">
            <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
              <label htmlFor="enquiry-company-website">Company website</label>
              <input
                id="enquiry-company-website"
                name="company_website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Name"
                name="name"
                autoComplete="name"
                placeholder="Site contact"
                value={name}
                error={errors.name}
                onChange={(event) => {
                  setName(event.target.value)
                  clearError('name')
                }}
              />
              <Input
                label="Phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(214) 555-0100"
                value={phone}
                error={errors.phone}
                onChange={(event) => {
                  setPhone(event.target.value)
                  clearError('phone')
                }}
              />
            </div>

            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@building.example"
              value={email}
              error={errors.email}
              onChange={(event) => {
                setEmail(event.target.value)
                clearError('email')
              }}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              {lockedServiceId ? (
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-dim">
                    Service
                  </span>
                  <div className="flex h-[var(--btn-h-md)] items-center justify-between gap-3 border border-cold/40 bg-cold/[0.06] px-3.5">
                    <span className="truncate text-[13px] text-fg">
                      {nameFor(lockedServiceId)}
                    </span>
                    <Icon name="check" size={13} className="shrink-0 text-cold" />
                  </div>
                  {plan ? (
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-cold">
                      Plan · {plan}
                    </span>
                  ) : null}
                </div>
              ) : (
                <Select
                  label="Service"
                  name="service"
                  placeholder="Select service"
                  options={serviceOptions}
                  value={serviceId}
                  onChange={(event) => setServiceId(event.target.value)}
                />
              )}
              <Select
                label="Site city"
                name="city"
                placeholder="Select city"
                options={cityOptions}
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
            </div>

            <Textarea
              label="The brief"
              name="message"
              rows={5}
              placeholder="e.g. 3,200 sq ft office, west glazing, two 5.5 TR splits failing at 3 pm. Existing ceiling void 450 mm."
              value={message}
              error={errors.message}
              onChange={(event) => {
                setMessage(event.target.value)
                clearError('message')
              }}
            />

            <fieldset className="flex flex-col gap-2">
              <legend className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-dim">
                Urgency
              </legend>
              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:gap-8">
                <Radio
                  id="urgency-normal"
                  name="urgency"
                  value="normal"
                  label="Normal"
                  description="Next working slot"
                  checked={urgency === 'normal'}
                  onChange={() => setUrgency('normal')}
                />
                <Radio
                  id="urgency-emergency"
                  name="urgency"
                  value="emergency"
                  label="Emergency 24 × 7"
                  description="Dispatch now"
                  checked={urgency === 'emergency'}
                  onChange={() => setUrgency('emergency')}
                />
              </div>
            </fieldset>

            {urgency === 'emergency' ? (
              <p className="flex items-start gap-2 border border-heat/30 bg-heat/[0.06] p-3 text-[11px] leading-relaxed text-fg-dim">
                <Icon name="bolt" size={14} className="mt-0.5 shrink-0 text-heat" />
                <span>
                  Emergency requests skip the queue only when you call dispatch as well:{' '}
                  <a
                    href={`tel:${brand.contact.emergencyPhone}`}
                    className="font-mono text-heat underline"
                  >
                    {brand.contact.emergencyPhone}
                  </a>
                </span>
              </p>
            ) : null}

            {submitError ? (
              <p
                role="alert"
                className="flex items-start gap-2 border border-danger/40 bg-danger/[0.06] p-3 text-[11px] leading-relaxed text-fg-dim"
              >
                <Icon name="alert" size={14} className="mt-0.5 shrink-0 text-danger" />
                <span>
                  {submitError} Nothing was lost — the brief is still in this form. Call{' '}
                  <a href={`tel:${brand.contact.phone}`} className="font-mono text-cold underline">
                    {brand.contact.phoneDisplay}
                  </a>{' '}
                  if it persists.
                </span>
              </p>
            ) : null}

            <Button type="submit" size="lg" full icon={pending ? 'clock' : 'arrow-right'} disabled={pending}>
              {pending ? 'Logging lead…' : 'Send enquiry'}
            </Button>

            <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
              Routed with its service · reply from {brand.contact.email} · cash, cheque or card on site
            </p>
          </form>
        </>
      )}
    </div>
  )
}
