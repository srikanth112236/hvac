import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRecordDeepLink } from '@/admin/useDeepLink'
import {
  quotationStatusLabel,
  type AdminLead,
  type CustomerAccount,
  type QuotationRecord,
  type QuotationStatus,
  type QuotationTotals,
  type QuotationInput,
} from '@hvac/shared'
import {
  Badge,
  Button,
  ButtonAnchor,
  EmptyState,
  Modal,
  Pagination,
  RecordDrawer,
  RecordViewButton,
  SearchSuggest,
  Select,
  useToast,
} from '@/components/ui'
import { adminApi } from '@/admin/api'
import { QuotationForm } from '@/admin/QuotationForm'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { AdminLoading, AdminPageHeader, InlineError, formatDate, formatMoney } from '@/admin/ui'

type Row = QuotationRecord & {
  totals: QuotationTotals
  customerName: string
  customerEmail: string
  leadName: string | null
}

export function AdminQuotations() {
  const { toast } = useToast()
  const [quotes, setQuotes] = useState<Row[]>([])
  const [viewing, setViewing] = useState<Row | null>(null)
  const [meta, setMeta] = useState<{
    count: number
    total: number
    page: number
    pageSize: number
    pages: number
    totals: { counts: Record<string, number>; value: number }
  } | null>(null)
  const [customers, setCustomers] = useState<CustomerAccount[]>([])
  const [leads, setLeads] = useState<AdminLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<QuotationRecord | null>(null)

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (query.trim()) params.set('q', query.trim())
      params.set('page', String(page))
      params.set('pageSize', '20')
      const [quoteResult, customerList, leadResult] = await Promise.all([
        adminApi.quotations(params.toString() ? `?${params}` : ''),
        adminApi.customers(),
        adminApi.leads('?page=1&pageSize=100'),
      ])
      setQuotes(quoteResult.data)
      setMeta(quoteResult.meta)
      setCustomers(customerList)
      setLeads(leadResult.data)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load quotations.')
    } finally {
      setLoading(false)
    }
  }, [page, query, status])
  useLiveRefresh(load, 20_000)

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [query, status])

  const totalValue = meta?.totals.value ?? 0
  const counts = meta?.totals.counts ?? {}

  const suggestions = useMemo(
    () =>
      quotes.map((quote) => ({
        id: quote.id,
        label: quote.ref,
        value: quote.ref,
        description: `${quote.customerName} · ${quote.title}`,
        meta: quotationStatusLabel[quote.status],
        keywords: `${quote.customerEmail} ${quote.service} ${quote.leadName ?? ''}`,
      })),
    [quotes],
  )

  useRecordDeepLink({
    param: 'open',
    records: quotes,
    resolve: (value) => quotes.find((quote) => quote.id === value || quote.ref === value),
    onOpen: setViewing,
  })

  const openCreate = () => {
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (quote: QuotationRecord) => {
    setEditing(quote)
    setViewing(null)
    setOpen(true)
  }

  const saveQuotation = async (input: QuotationInput & { customerId: string }) => {
    setBusy(true)
    try {
      if (editing) {
        const { customerId, ...patch } = input
        await adminApi.patchQuotation(customerId, editing.id, patch, editing.updatedAt)
        toast({ title: 'Quotation updated', description: editing.ref, tone: 'success' })
      } else {
        await adminApi.createGlobalQuotation(input)
        toast({ title: 'Quotation created', description: input.title, tone: 'success' })
      }
      setOpen(false)
      setEditing(null)
      await load()
    } catch (caught) {
      toast({
        title: editing ? 'Quotation not updated' : 'Quotation not created',
        description: caught instanceof Error ? caught.message : 'Check the fields.',
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  const setQuoteStatus = async (quote: Row, next: QuotationStatus) => {
    try {
      await adminApi.patchQuotation(quote.customerId, quote.id, { status: next }, quote.updatedAt)
      toast({
        title: 'Quotation updated',
        description: `${quote.ref} is ${quotationStatusLabel[next].toLowerCase()}.`,
        tone: 'success',
      })
      await load()
    } catch (caught) {
      toast({
        title: 'Status not updated',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const [converting, setConverting] = useState(false)

  const convertToInvoice = async (quote: Row) => {
    if (
      !window.confirm(
        `Raise an invoice from ${quote.ref} for ${formatMoney(quote.totals.total)}?`,
      )
    ) {
      return
    }
    setConverting(true)
    try {
      const result = await adminApi.convertQuotation(quote.customerId, quote.id, {
        dueInDays: 14,
      })
      toast({ title: 'Invoice raised', description: result.data.ref, tone: 'success' })
      setViewing(null)
      await load()
    } catch (caught) {
      toast({
        title: 'Invoice not raised',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Sales · CV-QUOTE"
        title="Quotations, from first brief to acceptance."
        description="Every quote is linked to a customer, optional lead and service. Track sent, viewed, change requests, acceptance and expiry in one pipeline."
        actions={
          <Button icon="plus" onClick={openCreate}>
            New quotation
          </Button>
        }
      />

      {error ? <InlineError message={error} /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Pipeline value', formatMoney(totalValue), 'All quotations'],
          ['Waiting for client', String(counts.sent ?? 0), 'Sent and open'],
          ['Accepted', String(counts.accepted ?? 0), 'Ready to schedule/invoice'],
          ['Changes requested', String(counts['changes-requested'] ?? 0), 'Needs reissue'],
        ].map(([label, value, note]) => (
          <div key={label} className="border border-line bg-panel/30 p-4">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
              {label}
            </span>
            <p className="mt-2 font-display text-2xl text-fg">{value}</p>
            <p className="mt-1 text-[10px] text-fg-faint">{note}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 border border-line bg-panel/30 p-3">
        <div className="w-44">
          <Select
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={[
              { value: '', label: 'All statuses' },
              ...Object.entries(quotationStatusLabel).map(([value, label]) => ({ value, label })),
            ]}
          />
        </div>
        <div className="min-w-[240px] flex-1">
          <SearchSuggest
            label="Search"
            value={query}
            onChange={setQuery}
            suggestions={suggestions}
            onSelect={(suggestion) => {
              setQuery(suggestion.label)
              const quote = quotes.find((entry) => entry.id === suggestion.id)
              if (quote) setViewing(quote)
            }}
            placeholder="Quote, customer, lead, service"
            emptyMessage="No quotation matches that reference or customer."
          />
        </div>
        <Badge tone="neutral">{meta?.count ?? 0} matching</Badge>
      </div>

      {loading ? (
        <AdminLoading rows={6} />
      ) : quotes.length === 0 ? (
        <EmptyState
          title="No quotations in this view"
          description="Create the first quote from a customer and optional lead."
          action={<Button onClick={openCreate}>New quotation</Button>}
        />
      ) : (
        <div className="divide-y divide-line border border-line bg-panel/20">
          {quotes.map((quote) => (
            <article
              key={quote.id}
              className="grid gap-3 p-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,.9fr)_auto_auto] xl:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[9px] text-cold">{quote.ref}</span>
                  <Badge
                    tone={
                      quote.status === 'accepted'
                        ? 'success'
                        : quote.status === 'sent'
                          ? 'cold'
                          : quote.status === 'expired'
                            ? 'danger'
                            : 'neutral'
                    }
                  >
                    {quotationStatusLabel[quote.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-fg">{quote.title}</p>
                <p className="text-[11px] text-fg-dim">
                  {quote.customerName} · {quote.customerEmail}
                </p>
                <p className="text-[10px] text-fg-faint">
                  {quote.service || 'Defined scope'}
                  {quote.leadRef ? ` · lead ${quote.leadRef}` : ''}
                  {quote.validUntil ? ` · valid to ${formatDate(quote.validUntil)}` : ''}
                </p>
              </div>
              <div>
                <span className="block font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  Client
                </span>
                <Link
                  to={`/admin/customers/${quote.customerId}`}
                  className="text-[11px] text-cold hover:text-fg"
                >
                  Open customer file
                </Link>
                {quote.leadName ? (
                  <span className="mt-1 block text-[10px] text-fg-faint">{quote.leadName}</span>
                ) : null}
              </div>
              <div className="text-right">
                <p className="font-display text-lg text-fg">{formatMoney(quote.totals.total)}</p>
                <p className="text-[10px] text-fg-faint">{quote.lines.length} lines</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <RecordViewButton
                  label={`quotation ${quote.ref}`}
                  onClick={() => setViewing(quote)}
                />
                {quote.status === 'draft' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void setQuoteStatus(quote, 'sent')}
                  >
                    Send
                  </Button>
                ) : null}
                {quote.status === 'changes-requested' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void setQuoteStatus(quote, 'sent')}
                  >
                    Reissue
                  </Button>
                ) : null}
                {quote.status === 'sent' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void setQuoteStatus(quote, 'accepted')}
                  >
                    Mark accepted
                  </Button>
                ) : null}
                <ButtonAnchor
                  href={`/api/v1/admin/customers/${quote.customerId}/quotations/${quote.id}/pdf`}
                  download
                  variant="quiet"
                  size="sm"
                >
                  PDF
                </ButtonAnchor>
                <button
                  type="button"
                  onClick={() => openEdit(quote)}
                  className="flex h-8 items-center border border-line px-2 font-mono text-[8px] uppercase text-fg-faint hover:border-cold/50 hover:text-cold"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Delete ${quote.ref}?`)) return
                    void adminApi
                      .deleteQuotation(quote.customerId, quote.id)
                      .then(load)
                      .catch((caught) => {
                        toast({
                          title: 'Could not delete quotation',
                          description: caught instanceof Error ? caught.message : 'Try again.',
                          tone: 'danger',
                        })
                      })
                  }}
                  className="font-mono text-[8px] uppercase text-fg-faint hover:text-danger"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {meta && meta.pages > 1 ? (
        <Pagination
          page={meta.page}
          pageCount={meta.pages}
          onPageChange={setPage}
          className="justify-end"
        />
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.ref}` : 'New quotation'}
        description="Line items, tax and the sheet on the right update as you type. Saving an existing quote keeps a revision of the version it replaced."
        size="xl"
      >
        <QuotationForm
          key={editing?.id ?? 'new'}
          initial={editing ?? undefined}
          customers={customers}
          leads={leads}
          busy={busy}
          submitLabel={editing ? 'Save quotation' : 'Create quotation'}
          onSubmit={saveQuotation}
          onCancel={() => {
            setOpen(false)
            setEditing(null)
          }}
        />
      </Modal>

      <RecordDrawer
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.ref ?? 'Quotation'}
        subtitle={viewing ? `${viewing.title} · ${viewing.customerName}` : undefined}
        badge={
          viewing ? (
            <Badge
              tone={
                viewing.status === 'accepted'
                  ? 'success'
                  : viewing.status === 'sent'
                    ? 'cold'
                    : viewing.status === 'expired'
                      ? 'danger'
                      : 'neutral'
              }
            >
              {quotationStatusLabel[viewing.status]}
            </Badge>
          ) : undefined
        }
        record={
          viewing
            ? {
                reference: viewing.ref,
                title: viewing.title,
                status: quotationStatusLabel[viewing.status],
                customer: viewing.customerName,
                email: viewing.customerEmail,
                lead: viewing.leadName ?? viewing.leadRef,
                service: viewing.service,
                customerId: viewing.customerId,
                validUntil: viewing.validUntil,
                createdAt: viewing.createdAt,
                updatedAt: viewing.updatedAt,
                totals: viewing.totals,
                lines: viewing.lines,
                notes: viewing.notes,
                terms: viewing.terms,
                changeRequest: viewing.changeRequest,
              }
            : null
        }
        actions={
          viewing ? (
            <>
              <Button
                variant="secondary"
                icon="wrench"
                onClick={() => openEdit(viewing)}
              >
                Edit quotation
              </Button>
              {viewing.status === 'accepted' && !viewing.invoiceId ? (
                <Button
                  icon="check"
                  disabled={converting}
                  onClick={() => void convertToInvoice(viewing)}
                >
                  {converting ? 'Raising…' : 'Raise invoice'}
                </Button>
              ) : null}
              {viewing.invoiceRef ? (
                <span className="flex h-9 items-center border border-success/40 bg-success/[0.06] px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-success">
                  Invoiced · {viewing.invoiceRef}
                </span>
              ) : null}
              <ButtonAnchor
                href={`/api/v1/admin/customers/${viewing.customerId}/quotations/${viewing.id}/pdf`}
                download
                variant="secondary"
              >
                Download PDF
              </ButtonAnchor>
                <a
                  href={`/api/v1/admin/customers/${viewing.customerId}/quotations/${viewing.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
                >
                  Print
                </a>
              <Link
                to={`/admin/customers/${viewing.customerId}`}
                className="flex h-9 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
              >
                Open customer
              </Link>
            </>
          ) : undefined
        }
      />
    </div>
  )
}
