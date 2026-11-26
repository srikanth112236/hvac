import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  appointmentStatusLabel,
  quotationStatusLabel,
  serviceWindowLabel,
  ticketStatusLabel,
  type AppointmentRecord,
  type AppointmentStatus,
  type AmcContract,
  type CustomerAccount,
  type CustomerPortalFile,
  type CustomerSite,
  type CustomerSiteInput,
  type InvoiceWithTotals,
  type NotificationPreferences,
  type QuotationRecord,
  type QuotationStatus,
  type QuotationTotals,
  type SupportTicket,
  type TicketCategory,
  type TicketInput,
  type TicketStatus,
} from '@hvac/shared'
import { Icon, type IconName } from '@/components/icons'
import { cn } from '@/lib/cn'
import { PortalSearch } from '@/portal/PortalSearch'
import {
  Badge,
  Button,
  ButtonAnchor,
  Checkbox,
  EmptyState,
  Input,
  Modal,
  RecordDrawer,
  RecordViewButton,
  Select,
  Textarea,
  useToast,
} from '@/components/ui'
import { useSeo } from '@/lib/seo'
import { useSiteServices } from '@/content/SiteContentProvider'
import { PortalError, portalApi } from '@/portal/api'

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const moneyExact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatMoney(value: number | null | undefined): string {
  return money.format(value ?? 0)
}

function formatMoneyExact(value: number | null | undefined): string {
  return moneyExact.format(value ?? 0)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function nextContractVisit(
  appointments: AppointmentRecord[],
  contractId: string,
): AppointmentRecord | null {
  return (
    appointments
      .filter(
        (appointment) =>
          appointment.amcContractId === contractId &&
          appointment.status !== 'cancelled' &&
          appointment.status !== 'completed' &&
          Date.parse(appointment.scheduledAt) >= Date.now(),
      )
      .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0] ?? null
  )
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const statusTone: Record<
  AppointmentStatus,
  'neutral' | 'cold' | 'heat' | 'success' | 'warn' | 'danger'
> = {
  requested: 'warn',
  scheduled: 'cold',
  'en-route': 'cold',
  completed: 'success',
  cancelled: 'danger',
}

const quoteTone: Record<QuotationStatus, 'neutral' | 'cold' | 'success' | 'warn' | 'danger'> = {
  draft: 'neutral',
  sent: 'cold',
  accepted: 'success',
  declined: 'danger',
  'changes-requested': 'warn',
  expired: 'neutral',
}

const ticketTone: Record<TicketStatus, 'neutral' | 'cold' | 'success' | 'warn' | 'danger'> = {
  open: 'warn',
  'in-progress': 'cold',
  resolved: 'success',
  closed: 'neutral',
}

type PortalTab =
  | 'overview'
  | 'visits'
  | 'invoices'
  | 'quotes'
  | 'equipment'
  | 'cover'
  | 'reports'
  | 'support'
  | 'account'

const categoryLabel: Record<TicketCategory, string> = {
  support: 'Support',
  complaint: 'Complaint',
  billing: 'Billing',
  amc: 'AMC renewal',
  other: 'Other',
}

interface PortalDetail {
  title: string
  subtitle?: string
  record: Record<string, unknown>
  exclude?: string[]
}

export function PortalPage() {
  useSeo({ path: '/portal', title: 'Customer portal', noindex: true })
  const { toast } = useToast()
  const services = useSiteServices()
  const [checking, setChecking] = useState(true)
  const [customer, setCustomer] = useState<CustomerAccount | null>(null)
  const [overview, setOverview] = useState<CustomerPortalFile | null>(null)
  const [loadingOverview, setLoadingOverview] = useState(false)
  const [tab, setTab] = useState<PortalTab>('overview')
  const [searchParams, setSearchParams] = useSearchParams()
  const resetToken = searchParams.get('reset') ?? ''
  const verifyToken = searchParams.get('verify') ?? ''
  const verifiedToken = useRef('')
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [formNotice, setFormNotice] = useState('')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetForm, setResetForm] = useState({ password: '', confirm: '' })
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
  })
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', address: '' })
  const [profileBusy, setProfileBusy] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingBusy, setBookingBusy] = useState(false)
  const [rebooking, setRebooking] = useState<AppointmentRecord | null>(null)
  const [bookingForm, setBookingForm] = useState({
    serviceSlug: '',
    scheduledAt: today(),
    window: 'morning' as AppointmentRecord['window'],
    address: '',
    notes: '',
  })
  const [invoice, setInvoice] = useState<InvoiceWithTotals | null>(null)
  const [invoiceLoading, setInvoiceLoading] = useState('')
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentRecord | null>(null)
  const [rescheduleBusy, setRescheduleBusy] = useState(false)
  const [rescheduleForm, setRescheduleForm] = useState({
    scheduledAt: today(),
    window: 'morning' as AppointmentRecord['window'],
  })
  const [quoteOpen, setQuoteOpen] = useState<
    (QuotationRecord & { totals: QuotationTotals }) | null
  >(null)
  const [quoteBusy, setQuoteBusy] = useState(false)
  const [changeOpen, setChangeOpen] = useState(false)
  const [changeNote, setChangeNote] = useState('')
  const [siteOpen, setSiteOpen] = useState(false)
  const [siteEditing, setSiteEditing] = useState<CustomerSite | null>(null)
  const [siteBusy, setSiteBusy] = useState(false)
  const [siteForm, setSiteForm] = useState<CustomerSiteInput>({
    label: '',
    address: '',
    city: '',
    region: '',
    postalCode: '',
    isPrimary: false,
  })
  const [ticketNewOpen, setTicketNewOpen] = useState(false)
  const [ticketOpen, setTicketOpen] = useState<SupportTicket | null>(null)
  const [ticketBusy, setTicketBusy] = useState(false)
  const [ticketForm, setTicketForm] = useState<TicketInput>({
    subject: '',
    category: 'support',
    body: '',
  })
  const [reply, setReply] = useState('')
  const [prefsBusy, setPrefsBusy] = useState(false)
  const [reportPhotoBusy, setReportPhotoBusy] = useState('')
  const [reportCheckBusy, setReportCheckBusy] = useState('')
  const [detail, setDetail] = useState<PortalDetail | null>(null)

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true)
    try {
      const data = await portalApi.overview()
      setOverview(data)
      setCustomer(data.customer)
      setProfileForm({
        name: data.customer.name,
        phone: data.customer.phone,
        address: data.customer.address,
      })
    } catch (caught) {
      if (caught instanceof PortalError && caught.status === 401) {
        setCustomer(null)
        setOverview(null)
      } else {
        toast({
          title: 'Could not load your portal',
          description: caught instanceof Error ? caught.message : 'Try again.',
          tone: 'danger',
        })
      }
    } finally {
      setLoadingOverview(false)
    }
  }, [toast])

  useEffect(() => {
    let active = true
    portalApi
      .me()
      .then((account) => {
        if (!active) return
        setCustomer(account)
        setProfileForm({ name: account.name, phone: account.phone, address: account.address })
        void loadOverview()
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setChecking(false)
      })
    return () => {
      active = false
    }
  }, [loadOverview])

  useEffect(() => {
    if (!customer) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadOverview()
    }, 15_000)
    return () => window.clearInterval(timer)
  }, [customer, loadOverview])

  useEffect(() => {
    if (!verifyToken || verifiedToken.current === verifyToken) return
    verifiedToken.current = verifyToken
    portalApi
      .verify(verifyToken)
      .then(() => {
        setAuthMode('login')
        setFormError('')
        setFormNotice(
          'Email verified. The works desk will approve portal access next, then you can sign in.',
        )
      })
      .catch((caught) => {
        setFormNotice('')
        setFormError(
          caught instanceof Error ? caught.message : 'The verification link could not be used.',
        )
      })
      .finally(() => setSearchParams({}))
  }, [verifyToken, setSearchParams])

  const resendVerification = async () => {
    setFormError('')
    setFormNotice('')
    const email = loginForm.email.trim()
    if (!email) {
      setFormError('Enter the email address on the account first.')
      return
    }
    setBusy(true)
    try {
      await portalApi.resendVerification(email)
      setFormNotice('If the account is unverified, a new verification link is on its way.')
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Could not resend the link.')
    } finally {
      setBusy(false)
    }
  }

  const nextAppointment = overview?.nextAppointment ?? null

  const recentInvoices = useMemo(() => overview?.invoices.slice(0, 3) ?? [], [overview])

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setFormNotice('')
    setBusy(true)
    try {
      if (authMode === 'forgot') {
        await portalApi.forgot(forgotEmail)
        setForgotEmail('')
        setAuthMode('login')
        setFormNotice(
          'If that address is on your account, a reset link is on its way. It expires in one hour.',
        )
        return
      }
      if (authMode === 'register') {
        const account = await portalApi.register(registerForm)
        setLoginForm({ email: account.email, password: '' })
        setRegisterForm({ name: '', email: '', phone: '', address: '', password: '' })
        setAuthMode('login')
        setFormNotice(
          account.status === 'unverified'
            ? 'Account created. Check your email for the verification link; the works desk approves access after that.'
            : 'Account created. The works desk must approve portal access before you can sign in.',
        )
        return
      }
      const account = await portalApi.login(loginForm.email, loginForm.password)
      setCustomer(account)
      setProfileForm({ name: account.name, phone: account.phone, address: account.address })
      setLoginForm({ email: '', password: '' })
      toast({ title: 'Signed in', description: `Welcome, ${account.name}.`, tone: 'success' })
      await loadOverview()
      setTab('overview')
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Could not sign you in.')
    } finally {
      setBusy(false)
      setChecking(false)
    }
  }

  const submitReset = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setFormNotice('')
    if (resetForm.password.length < 8) {
      setFormError('Use at least 8 characters for the new password.')
      return
    }
    if (resetForm.password !== resetForm.confirm) {
      setFormError('The two passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await portalApi.reset(resetToken, resetForm.password)
      setResetForm({ password: '', confirm: '' })
      setSearchParams({})
      setAuthMode('login')
      setFormNotice('Password updated. Sign in with the new password.')
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'The password could not be reset.')
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    await portalApi.logout().catch(() => undefined)
    setCustomer(null)
    setOverview(null)
    setInvoice(null)
    setTab('overview')
    toast({ title: 'Signed out', tone: 'info' })
  }

  const openBooking = (previous?: AppointmentRecord) => {
    setRebooking(previous ?? null)
    setBookingForm({
      serviceSlug: previous?.serviceSlug || services[0]?.id || '',
      scheduledAt: today(),
      window: previous?.window ?? 'morning',
      address: previous?.address || customer?.address || '',
      notes: previous ? `Rebooking ${previous.ref} (${previous.serviceName}).` : '',
    })
    setBookingOpen(true)
  }

  const submitBooking = async (event: FormEvent) => {
    event.preventDefault()
    setBookingBusy(true)
    try {
      const appointment = await portalApi.book({
        ...bookingForm,
        rebookOf: rebooking?.id ?? null,
      })
      setBookingOpen(false)
      setRebooking(null)
      toast({
        title: 'Visit requested',
        description: `${appointment.ref} is with the dispatch desk. You will see the engineer and status here.`,
        tone: 'success',
      })
      await loadOverview()
      setTab('visits')
    } catch (caught) {
      toast({
        title: 'Could not book the visit',
        description: caught instanceof Error ? caught.message : 'Check the details and try again.',
        tone: 'danger',
      })
    } finally {
      setBookingBusy(false)
    }
  }

  const openReschedule = (appointment: AppointmentRecord) => {
    setRescheduleTarget(appointment)
    setRescheduleForm({
      scheduledAt: appointment.scheduledAt.slice(0, 10),
      window: appointment.window,
    })
  }

  const submitReschedule = async (event: FormEvent) => {
    event.preventDefault()
    if (!rescheduleTarget) return
    setRescheduleBusy(true)
    try {
      await portalApi.patchAppointment(rescheduleTarget.id, {
        action: 'reschedule',
        scheduledAt: rescheduleForm.scheduledAt,
        window: rescheduleForm.window,
      })
      setRescheduleTarget(null)
      toast({
        title: 'Visit rescheduled',
        description: 'The dispatch desk sees the new slot.',
        tone: 'success',
      })
      await loadOverview()
    } catch (caught) {
      toast({
        title: 'Could not reschedule',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setRescheduleBusy(false)
    }
  }

  const cancelVisit = async (appointment: AppointmentRecord) => {
    if (!window.confirm(`Cancel ${appointment.ref}? The dispatch desk will see it as cancelled.`))
      return
    try {
      await portalApi.patchAppointment(appointment.id, { action: 'cancel' })
      toast({
        title: 'Visit cancelled',
        description: `${appointment.ref} is cancelled.`,
        tone: 'info',
      })
      await loadOverview()
    } catch (caught) {
      toast({
        title: 'Could not cancel',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const openQuote = (quote: QuotationRecord & { totals: QuotationTotals }) => {
    setQuoteOpen(quote)
    setChangeOpen(false)
    setChangeNote(quote.changeRequest ?? '')
  }

  const acceptQuote = async (quote: QuotationRecord & { totals: QuotationTotals }) => {
    setQuoteBusy(true)
    try {
      await portalApi.acceptQuotation(quote.id)
      setQuoteOpen(null)
      toast({
        title: 'Quotation accepted',
        description: `${quote.ref} is accepted. The works desk will schedule it.`,
        tone: 'success',
      })
      await loadOverview()
    } catch (caught) {
      toast({
        title: 'Could not accept',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setQuoteBusy(false)
    }
  }

  const requestQuoteChanges = async (event: FormEvent) => {
    event.preventDefault()
    if (!quoteOpen) return
    if (changeNote.trim().length < 5) {
      toast({
        title: 'Describe the change',
        description: 'Add a sentence so the estimator can act on it.',
        tone: 'warn',
      })
      return
    }
    setQuoteBusy(true)
    try {
      await portalApi.requestQuotationChanges(quoteOpen.id, changeNote.trim())
      setChangeOpen(false)
      setQuoteOpen(null)
      setChangeNote('')
      toast({
        title: 'Change requested',
        description: 'The estimator will revise and reissue the quotation.',
        tone: 'success',
      })
      await loadOverview()
    } catch (caught) {
      toast({
        title: 'Could not send the request',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setQuoteBusy(false)
    }
  }

  const openSite = (site?: CustomerSite) => {
    setSiteEditing(site ?? null)
    setSiteForm({
      label: site?.label ?? '',
      address: site?.address ?? '',
      city: site?.city ?? '',
      region: site?.region ?? '',
      postalCode: site?.postalCode ?? '',
      isPrimary: site?.isPrimary ?? false,
    })
    setSiteOpen(true)
  }

  const saveSite = async (event: FormEvent) => {
    event.preventDefault()
    setSiteBusy(true)
    try {
      if (siteEditing) await portalApi.patchSite(siteEditing.id, siteForm)
      else await portalApi.createSite(siteForm)
      setSiteOpen(false)
      setSiteEditing(null)
      toast({
        title: 'Site saved',
        description: 'Visits can be booked to this address.',
        tone: 'success',
      })
      await loadOverview()
    } catch (caught) {
      toast({
        title: 'Could not save the site',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setSiteBusy(false)
    }
  }

  const removeSite = async (site: CustomerSite) => {
    if (!window.confirm(`Remove ${site.label}? Existing visits keep their address.`)) return
    try {
      await portalApi.deleteSite(site.id)
      toast({ title: 'Site removed', tone: 'info' })
      await loadOverview()
    } catch (caught) {
      toast({
        title: 'Could not remove',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const createTicket = async (event: FormEvent) => {
    event.preventDefault()
    setTicketBusy(true)
    try {
      const ticket = await portalApi.createTicket(ticketForm)
      setTicketNewOpen(false)
      setTicketForm({ subject: '', category: 'support', body: '' })
      setTicketOpen(ticket)
      toast({
        title: 'Request logged',
        description: `${ticket.ref} is with the works desk.`,
        tone: 'success',
      })
      await loadOverview()
    } catch (caught) {
      toast({
        title: 'Could not log the request',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setTicketBusy(false)
    }
  }

  const sendReply = async (event: FormEvent) => {
    event.preventDefault()
    if (!ticketOpen || reply.trim().length === 0) return
    setTicketBusy(true)
    try {
      const updated = await portalApi.replyTicket(ticketOpen.id, reply.trim())
      setTicketOpen(updated)
      setReply('')
      toast({ title: 'Reply sent', tone: 'success' })
      await loadOverview()
    } catch (caught) {
      toast({
        title: 'Could not reply',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setTicketBusy(false)
    }
  }

  const renewAmc = async (contract: AmcContract) => {
    if (!window.confirm(`Request a renewal quote for ${contract.ref}?`)) return
    try {
      const ticket = await portalApi.renewAmc(contract.id)
      toast({
        title: 'Renewal requested',
        description: `${ticket.ref} is open with the works desk.`,
        tone: 'success',
      })
      await loadOverview()
    } catch (caught) {
      toast({
        title: 'Could not request renewal',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const toggleReportChecklist = async (
    report: { id: string; checklist: { id: string; done: boolean }[] },
    itemId: string,
    done: boolean,
  ) => {
    setReportCheckBusy(report.id)
    try {
      await portalApi.patchReportChecklist(
        report.id,
        report.checklist.map((item) => (item.id === itemId ? { ...item, done } : item)),
      )
      await loadOverview()
    } catch (caught) {
      toast({
        title: 'Checklist not saved',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setReportCheckBusy('')
    }
  }

  const uploadReportPhotos = async (reportId: string, files: File[]) => {
    if (!files.length) return
    setReportPhotoBusy(reportId)
    try {
      await portalApi.uploadReportPhotos(reportId, files)
      toast({
        title: 'Photos added',
        description: 'The works desk can see them on this report.',
        tone: 'success',
      })
      await loadOverview()
    } catch (caught) {
      toast({
        title: 'Photos not added',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setReportPhotoBusy('')
    }
  }

  const togglePreference = async (
    key: keyof Pick<
      NotificationPreferences,
      'emailService' | 'emailBilling' | 'emailAmc' | 'emailMarketing'
    >,
    value: boolean,
  ) => {
    if (!overview) return
    setPrefsBusy(true)
    try {
      const updated = await portalApi.patchPreferences({ [key]: value })
      setOverview({ ...overview, preferences: updated })
      toast({ title: 'Preferences saved', tone: 'success' })
    } catch (caught) {
      toast({
        title: 'Could not save',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setPrefsBusy(false)
    }
  }

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    setProfileBusy(true)
    try {
      const updated = await portalApi.updateProfile(profileForm)
      setCustomer(updated)
      toast({
        title: 'Profile updated',
        description: 'New visits will use this contact detail.',
        tone: 'success',
      })
      await loadOverview()
    } catch (caught) {
      toast({
        title: 'Could not update profile',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setProfileBusy(false)
    }
  }

  const openInvoice = async (entry: InvoiceWithTotals) => {
    setInvoiceLoading(entry.id)
    try {
      setInvoice(await portalApi.invoice(entry.id))
    } catch (caught) {
      toast({
        title: 'Could not open invoice',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setInvoiceLoading('')
    }
  }

  if (checking) {
    return (
      <div className="shell flex min-h-[60vh] items-center justify-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-faint">
          Opening your portal
        </p>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-[100svh] bg-base">
        <header className="border-b border-line bg-panel/30">
          <div className="shell flex items-center justify-between gap-4 py-4">
            <Link to="/" className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center border border-line-strong font-mono text-[10px] text-cold">
                CV
              </span>
              <span className="flex flex-col">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg">
                  Customer portal
                </span>
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                  Coolvane HVAC
                </span>
              </span>
            </Link>
            <Link
              to="/"
              className="flex h-8 items-center gap-1.5 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              <Icon name="external" size={12} />
              Back to site
            </Link>
          </div>
        </header>
        <section className="border-b border-line">
          <div className="shell grid gap-10 pb-16 pt-12 lg:grid-cols-12 lg:pt-16">
          <div className="lg:col-span-6">
            <span className="annot">Customer portal · CV-PORTAL</span>
            <h1 className="t-display mt-6 max-w-[13ch] text-fg">
              Your system, your file, your next visit.
            </h1>
            <p className="mt-6 max-w-prose text-sm leading-relaxed text-fg-dim">
              Sign in to see the invoices addressed to your email, the engineer assigned to your
              next visit, and to book or rebook a service. A portal booking creates a dispatch-board
              visit and a lead for the works team at the same time.
            </p>
            <ul className="mt-8 grid gap-3 border-t border-line pt-6 text-[12px] text-fg-dim">
              {[
                'Invoice totals, payments and open balance',
                'Next appointment and engineer status',
                'Book a new visit or rebook a completed one',
                'Update the address and phone we dispatch to',
              ].map((entry) => (
                <li key={entry} className="flex items-start gap-3">
                  <Icon name="check" size={13} className="mt-0.5 text-cold" />
                  {entry}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[11px] leading-relaxed text-fg-faint">
              Invoices appear when the billing email matches your account email. New accounts are
              approved by the works desk before they can sign in. Need a hand?{' '}
              <Link to="/contact" className="text-cold hover:text-fg">
                Contact the works desk
              </Link>
              .
            </p>
          </div>

          <div className="lg:col-span-5 lg:col-start-8">
            <div className="border border-line bg-panel/40 p-5 sm:p-6">
              {resetToken ? (
                <form className="flex flex-col gap-4" onSubmit={(event) => void submitReset(event)}>
                  <div>
                    <span className="annot">Password reset · CV-RESET</span>
                    <h2 className="t-h3 mt-3 text-fg">Choose a new password.</h2>
                    <p className="mt-2 text-[12px] leading-relaxed text-fg-dim">
                      This link works once and expires after one hour. Signing in again will use the
                      new password.
                    </p>
                  </div>
                  <Input
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    hint="At least 8 characters."
                    value={resetForm.password}
                    onChange={(event) =>
                      setResetForm({ ...resetForm, password: event.target.value })
                    }
                  />
                  <Input
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={resetForm.confirm}
                    onChange={(event) =>
                      setResetForm({ ...resetForm, confirm: event.target.value })
                    }
                  />
                  {formError ? (
                    <p
                      role="alert"
                      className="border border-danger/40 bg-danger/10 px-3 py-2 text-[12px] text-danger"
                    >
                      {formError}
                    </p>
                  ) : null}
                  <Button type="submit" loading={busy} full>
                    Update password
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchParams({})
                      setFormError('')
                      setFormNotice('')
                    }}
                    className="self-start font-mono text-[10px] uppercase tracking-[0.1em] text-cold hover:text-fg"
                  >
                    Back to sign in
                  </button>
                </form>
              ) : authMode === 'forgot' ? (
                <form className="flex flex-col gap-4" onSubmit={(event) => void submitAuth(event)}>
                  <div>
                    <span className="annot">Portal access · CV-RECOVER</span>
                    <h2 className="t-h3 mt-3 text-fg">Reset your password.</h2>
                    <p className="mt-2 text-[12px] leading-relaxed text-fg-dim">
                      Enter the email on your account. If it is on file, a one-hour reset link is
                      sent.
                    </p>
                  </div>
                  <Input
                    label="Email"
                    type="email"
                    autoComplete="email"
                    required
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                  />
                  {formNotice ? (
                    <p
                      role="status"
                      className="border border-cold/40 bg-cold/10 px-3 py-2 text-[12px] text-cold"
                    >
                      {formNotice}
                    </p>
                  ) : null}
                  {formError ? (
                    <p
                      role="alert"
                      className="border border-danger/40 bg-danger/10 px-3 py-2 text-[12px] text-danger"
                    >
                      {formError}
                    </p>
                  ) : null}
                  <Button type="submit" loading={busy} full>
                    Send reset link
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login')
                      setFormError('')
                      setFormNotice('')
                    }}
                    className="self-start font-mono text-[10px] uppercase tracking-[0.1em] text-cold hover:text-fg"
                  >
                    Back to sign in
                  </button>
                </form>
              ) : (
                <>
                  <div
                    role="tablist"
                    aria-label="Portal access"
                    className="grid grid-cols-2 border border-line"
                  >
                    {(['login', 'register'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        role="tab"
                        aria-selected={authMode === mode}
                        onClick={() => {
                          setAuthMode(mode)
                          setFormError('')
                          setFormNotice('')
                        }}
                        className={
                          authMode === mode
                            ? 'bg-cold px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-base'
                            : 'px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-dim hover:text-fg'
                        }
                      >
                        {mode === 'login' ? 'Sign in' : 'Create account'}
                      </button>
                    ))}
                  </div>

                  <form
                    className="mt-5 flex flex-col gap-4"
                    onSubmit={(event) => void submitAuth(event)}
                  >
                    {authMode === 'register' ? (
                      <>
                        <Input
                          label="Full name"
                          autoComplete="name"
                          required
                          value={registerForm.name}
                          onChange={(event) =>
                            setRegisterForm({ ...registerForm, name: event.target.value })
                          }
                        />
                        <Input
                          label="Phone"
                          type="tel"
                          autoComplete="tel"
                          required
                          value={registerForm.phone}
                          onChange={(event) =>
                            setRegisterForm({ ...registerForm, phone: event.target.value })
                          }
                        />
                        <Textarea
                          label="Service address"
                          rows={2}
                          autoComplete="street-address"
                          value={registerForm.address}
                          onChange={(event) =>
                            setRegisterForm({ ...registerForm, address: event.target.value })
                          }
                        />
                      </>
                    ) : null}
                    <Input
                      label="Email"
                      type="email"
                      autoComplete="email"
                      required
                      value={authMode === 'register' ? registerForm.email : loginForm.email}
                      onChange={(event) =>
                        authMode === 'register'
                          ? setRegisterForm({ ...registerForm, email: event.target.value })
                          : setLoginForm({ ...loginForm, email: event.target.value })
                      }
                    />
                    <Input
                      label="Password"
                      type="password"
                      autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                      required
                      minLength={authMode === 'register' ? 8 : undefined}
                      hint={authMode === 'register' ? 'At least 8 characters.' : undefined}
                      value={authMode === 'register' ? registerForm.password : loginForm.password}
                      onChange={(event) =>
                        authMode === 'register'
                          ? setRegisterForm({ ...registerForm, password: event.target.value })
                          : setLoginForm({ ...loginForm, password: event.target.value })
                      }
                    />
                    {authMode === 'login' ? (
                      <div className="flex flex-wrap items-center gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('forgot')
                            setForgotEmail(loginForm.email)
                            setFormError('')
                            setFormNotice('')
                          }}
                          className="self-start font-mono text-[10px] uppercase tracking-[0.1em] text-cold hover:text-fg"
                        >
                          Forgot password?
                        </button>
                        <button
                          type="button"
                          onClick={() => void resendVerification()}
                          className="self-start font-mono text-[10px] uppercase tracking-[0.1em] text-fg-faint hover:text-cold"
                        >
                          Resend verification
                        </button>
                      </div>
                    ) : null}
                    {formNotice ? (
                      <p
                        role="status"
                        className="border border-cold/40 bg-cold/10 px-3 py-2 text-[12px] text-cold"
                      >
                        {formNotice}
                      </p>
                    ) : null}
                    {formError ? (
                      <p
                        role="alert"
                        className="border border-danger/40 bg-danger/10 px-3 py-2 text-[12px] text-danger"
                      >
                        {formError}
                      </p>
                    ) : null}
                    <Button type="submit" loading={busy} full>
                      {authMode === 'login' ? 'Sign in to portal' : 'Create my account'}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
      </div>
    )
  }

  const tabs: { id: PortalTab; label: string; icon: IconName; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: 'gauge' },
    { id: 'visits', label: 'Service visits', icon: 'calendar', count: overview?.appointments.length },
    { id: 'invoices', label: 'Invoices', icon: 'coil', count: overview?.invoices.length },
    {
      id: 'quotes',
      label: 'Quotations',
      icon: 'tag',
      count: overview?.quotations.filter((quote) => quote.status === 'sent').length,
    },
    { id: 'equipment', label: 'Equipment', icon: 'wrench', count: overview?.equipment.length },
    {
      id: 'cover',
      label: 'AMC cover',
      icon: 'shield',
      count: overview?.amc.filter((contract) => contract.status === 'active').length,
    },
    { id: 'reports', label: 'Reports', icon: 'clock', count: overview?.reports.length },
    {
      id: 'support',
      label: 'Support',
      icon: 'mail',
      count: overview?.tickets.filter(
        (ticket) => ticket.status === 'open' || ticket.status === 'in-progress',
      ).length,
    },
    { id: 'account', label: 'Account', icon: 'thermostat' },
  ]

  const activeTabMeta = tabs.find((entry) => entry.id === tab) ?? tabs[0]

  return (
    <div className="min-h-[100svh] bg-base lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      <a
        href="#portal-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-cold focus:bg-base focus:px-4 focus:py-2 focus:text-[11px] focus:text-fg"
      >
        Skip to portal content
      </a>

      <aside className="border-b border-line bg-panel/30 lg:sticky lg:top-0 lg:flex lg:h-[100svh] lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 lg:px-5">
          <button
            type="button"
            onClick={() => setTab('overview')}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-8 w-8 items-center justify-center border border-line-strong font-mono text-[10px] text-cold">
              CV
            </span>
            <span className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg">
                Customer portal
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                Coolvane HVAC
              </span>
            </span>
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              to="/"
              aria-label="Open public site"
              className="flex h-8 w-8 items-center justify-center border border-line text-fg-faint hover:text-cold"
            >
              <Icon name="external" size={14} />
            </Link>
            <Button variant="quiet" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>

        <nav
          role="tablist"
          aria-label="Portal sections"
          className="flex gap-1 overflow-x-auto px-3 py-2 lg:flex-col lg:overflow-visible lg:py-4"
        >
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              aria-controls={`portal-panel-${entry.id}`}
              id={`portal-tab-${entry.id}`}
              onClick={() => setTab(entry.id)}
              className={cn(
                'flex shrink-0 items-center justify-between gap-2.5 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors duration-2',
                tab === entry.id
                  ? 'border-cold/40 bg-cold/[0.07] text-cold'
                  : 'border-transparent text-fg-dim hover:border-line hover:text-fg',
              )}
            >
              <span className="flex items-center gap-2.5">
                <Icon name={entry.icon} size={14} />
                {entry.label}
              </span>
              {entry.count ? (
                <span className="border border-line px-1.5 py-0.5 text-[8px] leading-none opacity-80">
                  {entry.count}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-2 px-3 py-2 lg:px-4 lg:py-3">
          <PortalSearch overview={overview} onNavigate={(nextTab) => setTab(nextTab)} />
        </div>

        <div className="mt-auto hidden border-t border-line p-4 lg:block">
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
            Signed in as
          </span>
          <p className="mt-1 truncate text-[12px] font-medium text-fg">{customer.name}</p>
          <p className="truncate font-mono text-[10px] text-fg-dim">{customer.email}</p>
          <div className="mt-3 flex items-center gap-2">
            <Link
              to="/"
              target="_blank"
              className="flex h-8 flex-1 items-center justify-center gap-1.5 border border-line font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              <Icon name="external" size={12} />
              Site
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex h-8 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint hover:border-danger/50 hover:text-danger"
            >
              Sign out
            </button>
          </div>
          <p className="mt-4 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
            <span className="h-1 w-1 bg-success" />
            Portal live · encrypted
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-base/90 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
                <span>Customer portal</span>
                <span>/</span>
                <span className="text-cold">{activeTabMeta?.label ?? 'Overview'}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <h1 className="t-h2 text-fg">{customer.name}</h1>
                <span className="hidden font-mono text-[10px] text-fg-dim sm:inline">
                  {customer.email} · {customer.phone || 'No phone on file'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden sm:block">
                <PortalSearch compact overview={overview} onNavigate={(nextTab) => setTab(nextTab)} />
              </div>
              <Button variant="secondary" size="sm" icon="calendar" onClick={() => openBooking()}>
                Book a visit
              </Button>
            </div>
          </div>
        </header>

        <main id="portal-main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">

        {loadingOverview && !overview ? (
          <p className="py-12 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-fg-faint">
            Loading your file
          </p>
        ) : null}

        {overview && tab === 'overview' ? (
          <div
            id="portal-panel-overview"
            role="tabpanel"
            aria-labelledby="portal-tab-overview"
            className="mt-6"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Outstanding', formatMoney(overview.summary.outstanding), 'Across open invoices'],
                ['Paid lifetime', formatMoney(overview.summary.paidLifetime), 'Receipts on file'],
                [
                  'Open visits',
                  String(overview.summary.openAppointments),
                  'Requested or scheduled',
                ],
                ['Completed visits', String(overview.summary.completedVisits), 'Service history'],
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

            <div className="mt-6 grid gap-6 lg:grid-cols-12">
              <section className="border border-line bg-panel/30 p-5 lg:col-span-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                      Next visit
                    </span>
                    {nextAppointment ? (
                      <>
                        <p className="mt-2 font-display text-xl text-fg">
                          {nextAppointment.serviceName}
                        </p>
                        <p className="mt-1 text-[12px] text-fg-dim">
                          {formatDateTime(nextAppointment.scheduledAt)} ·{' '}
                          {serviceWindowLabel(nextAppointment.window)}
                        </p>
                        <p className="mt-1 text-[11px] text-fg-faint">{nextAppointment.address}</p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm leading-relaxed text-fg-dim">
                        No visit is booked. Choose a service and a window, and the dispatch desk
                        will confirm the engineer.
                      </p>
                    )}
                  </div>
                  {nextAppointment ? (
                    <Badge tone={statusTone[nextAppointment.status]}>
                      {appointmentStatusLabel[nextAppointment.status]}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    icon="calendar"
                    onClick={() => openBooking(nextAppointment ?? undefined)}
                  >
                    {nextAppointment ? 'Rebook this visit' : 'Book a visit'}
                  </Button>
                  {nextAppointment?.technician ? (
                    <span className="inline-flex items-center gap-2 border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.08em] text-fg-dim">
                      <Icon name="wrench" size={12} /> {nextAppointment.technician}
                    </span>
                  ) : null}
                </div>
              </section>

              <section className="border border-line bg-panel/30 p-5 lg:col-span-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    Recent invoices
                  </span>
                  <button
                    type="button"
                    onClick={() => setTab('invoices')}
                    className="font-mono text-[9px] uppercase text-cold hover:text-fg"
                  >
                    View all
                  </button>
                </div>
                {recentInvoices.length === 0 ? (
                  <p className="mt-4 text-[12px] leading-relaxed text-fg-dim">
                    No invoices are addressed to {customer.email} yet. They appear here as soon as
                    billing issues one.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-line">
                    {recentInvoices.map((entry) => (
                      <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] text-fg">
                            {entry.ref} · {entry.service || 'HVAC service'}
                          </p>
                          <p className="text-[10px] text-fg-faint">
                            Due {formatDate(entry.dueDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[12px] text-fg">{formatMoney(entry.totals.total)}</p>
                          <button
                            type="button"
                            onClick={() => void openInvoice(entry)}
                            className="ml-auto flex items-center justify-end gap-1 font-mono text-[8px] uppercase text-cold hover:text-fg"
                          >
                            {invoiceLoading === entry.id ? (
                              'Opening'
                            ) : (
                              <>
                                <Icon name="eye" size={10} /> View detail
                              </>
                            )}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {overview.requests.length ? (
              <section className="mt-6 border border-line bg-panel/20">
                <div className="flex items-center justify-between border-b border-line px-5 py-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    Your requests
                  </span>
                  <Badge tone="neutral">{overview.requests.length}</Badge>
                </div>
                <ul className="divide-y divide-line">
                  {overview.requests.slice(0, 6).map((request) => (
                    <li
                      key={request.ref}
                      className="flex flex-wrap items-start justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] text-cold">{request.ref}</p>
                        <p className="mt-1 text-[12px] text-fg">
                          {request.serviceName ?? 'Works desk · service to be allocated'}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-fg-faint">
                          {request.message}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <Badge tone="neutral">{request.status}</Badge>
                          <RecordViewButton
                            label={`request ${request.ref}`}
                            onClick={() =>
                              setDetail({
                                title: request.ref,
                                subtitle: request.serviceName ?? 'Works desk request',
                                record: request as unknown as Record<string, unknown>,
                                exclude: ['id'],
                              })
                            }
                          />
                        </div>
                        <p className="text-[10px] text-fg-faint">{formatDate(request.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {overview && tab === 'visits' ? (
          <div
            id="portal-panel-visits"
            role="tabpanel"
            aria-labelledby="portal-tab-visits"
            className="mt-6"
          >
            {overview.appointments.length === 0 ? (
              <EmptyState
                title="No service visits yet"
                description="Book a visit and it will appear here with the dispatch reference, engineer and status."
                action={
                  <Button icon="calendar" onClick={() => openBooking()}>
                    Book a visit
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-line border border-line bg-panel/20">
                {overview.appointments.map((appointment) => (
                  <article
                    key={appointment.id}
                    className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[9px] text-cold">{appointment.ref}</span>
                        <Badge tone={statusTone[appointment.status]}>
                          {appointmentStatusLabel[appointment.status]}
                        </Badge>
                        {appointment.rebookOf ? <Badge tone="neutral">Rebook</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm text-fg">{appointment.serviceName}</p>
                      <p className="text-[11px] text-fg-dim">
                        {formatDateTime(appointment.scheduledAt)} ·{' '}
                        {serviceWindowLabel(appointment.window)}
                      </p>
                      <p className="mt-1 text-[11px] text-fg-faint">{appointment.address}</p>
                      <p className="mt-1 text-[10px] text-fg-faint">
                        {appointment.technician
                          ? `Engineer: ${appointment.technician}`
                          : 'Engineer to be assigned'}
                        {appointment.notes ? ` · ${appointment.notes}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <RecordViewButton
                        label={`visit ${appointment.ref}`}
                        onClick={() =>
                          setDetail({
                            title: appointment.ref,
                            subtitle: `${appointment.serviceName} · ${formatDateTime(appointment.scheduledAt)}`,
                            record: {
                              reference: appointment.ref,
                              service: appointment.serviceName,
                              scheduled: formatDateTime(appointment.scheduledAt),
                              window: serviceWindowLabel(appointment.window),
                              status: appointmentStatusLabel[appointment.status],
                              address: appointment.address,
                              engineer: appointment.technician || 'To be assigned',
                              leadReference: appointment.leadRef,
                              rebookOf: appointment.rebookOf,
                              notes: appointment.notes,
                              createdAt: appointment.createdAt,
                              updatedAt: appointment.updatedAt,
                            },
                          })
                        }
                      />
                      {appointment.status === 'requested' || appointment.status === 'scheduled' ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openReschedule(appointment)}
                          >
                            Reschedule
                          </Button>
                          <Button
                            variant="quiet"
                            size="sm"
                            onClick={() => void cancelVisit(appointment)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openBooking(appointment)}
                        >
                          {appointment.status === 'completed' ? 'Rebook service' : 'Book again'}
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {overview && tab === 'invoices' ? (
          <div
            id="portal-panel-invoices"
            role="tabpanel"
            aria-labelledby="portal-tab-invoices"
            className="mt-6"
          >
            {overview.invoices.length === 0 ? (
              <EmptyState
                title="No invoices on this account"
                description={`Invoices appear here when the billing email matches ${customer.email}.`}
              />
            ) : (
              <div className="overflow-x-auto border border-line bg-panel/20">
                <table className="w-full min-w-[680px] border-collapse text-left">
                  <caption className="sr-only">Invoices addressed to {customer.email}</caption>
                  <thead>
                    <tr className="border-b border-line font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                      <th scope="col" className="p-3">
                        Invoice
                      </th>
                      <th scope="col" className="p-3">
                        Issued
                      </th>
                      <th scope="col" className="p-3">
                        Due
                      </th>
                      <th scope="col" className="p-3">
                        Status
                      </th>
                      <th scope="col" className="p-3 text-right">
                        Total
                      </th>
                      <th scope="col" className="p-3 text-right">
                        Balance
                      </th>
                      <th scope="col" className="p-3">
                        <span className="sr-only">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {overview.invoices.map((entry) => (
                      <tr key={entry.id}>
                        <td className="p-3 text-[12px] text-fg">
                          {entry.ref}
                          <span className="block text-[10px] text-fg-faint">{entry.service}</span>
                        </td>
                        <td className="p-3 text-[11px] text-fg-dim">
                          {formatDate(entry.issueDate)}
                        </td>
                        <td className="p-3 text-[11px] text-fg-dim">{formatDate(entry.dueDate)}</td>
                        <td className="p-3">
                          <Badge
                            tone={
                              entry.totals.state === 'paid'
                                ? 'success'
                                : entry.totals.state === 'overdue'
                                  ? 'danger'
                                  : 'warn'
                            }
                          >
                            {entry.totals.state}
                          </Badge>
                        </td>
                        <td className="p-3 text-right text-[12px] text-fg">
                          {formatMoney(entry.totals.total)}
                        </td>
                        <td className="p-3 text-right text-[12px] text-fg">
                          {formatMoney(entry.totals.balance)}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => void openInvoice(entry)}
                            disabled={invoiceLoading === entry.id}
                            className="ml-auto flex items-center gap-1 font-mono text-[9px] uppercase text-cold hover:text-fg disabled:opacity-50"
                          >
                            {invoiceLoading === entry.id ? (
                              'Opening'
                            ) : (
                              <>
                                <Icon name="eye" size={11} /> View
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {overview && tab === 'quotes' ? (
          <div
            id="portal-panel-quotes"
            role="tabpanel"
            aria-labelledby="portal-tab-quotes"
            className="mt-6"
          >
            {overview.quotations.length === 0 ? (
              <EmptyState
                title="No quotations yet"
                description="An estimator will issue the quotation here after a survey. Accepted quotations move into the invoice record."
              />
            ) : (
              <div className="divide-y divide-line border border-line bg-panel/20">
                {overview.quotations.map((quote) => (
                  <article
                    key={quote.id}
                    className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[9px] text-cold">{quote.ref}</span>
                        <Badge tone={quoteTone[quote.status]}>
                          {quotationStatusLabel[quote.status]}
                        </Badge>
                        {quote.validUntil ? (
                          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                            Valid to {formatDate(quote.validUntil)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-fg">{quote.title}</p>
                      <p className="text-[11px] text-fg-dim">
                        {quote.service || 'Defined scope'} · {quote.lines.length} lines
                      </p>
                      {quote.changeRequest ? (
                        <p className="mt-2 border-l-2 border-warn/60 pl-2 text-[11px] leading-relaxed text-fg-dim">
                          Change requested: {quote.changeRequest}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <span className="font-display text-xl text-fg">
                        {formatMoney(quote.totals.total)}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon="eye"
                        onClick={() => openQuote(quote)}
                      >
                        Open
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {overview && tab === 'equipment' ? (
          <div
            id="portal-panel-equipment"
            role="tabpanel"
            aria-labelledby="portal-tab-equipment"
            className="mt-6"
          >
            {overview.equipment.length === 0 ? (
              <EmptyState
                title="No equipment on file"
                description="The works desk records each installed unit here with its model, serial and warranty so every visit starts with the right history."
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {overview.equipment.map((item) => {
                  const site = overview.sites.find((entry) => entry.id === item.siteId)
                  const history = overview.reports.filter(
                    (report) => report.equipmentId === item.id,
                  )
                  return (
                    <article key={item.id} className="border border-line bg-panel/20 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-fg">{item.name}</p>
                          <p className="mt-0.5 text-[11px] text-fg-dim">
                            {[item.brand, item.model].filter(Boolean).join(' · ') ||
                              'Make and model not recorded'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                            {item.capacity || 'Capacity not set'}
                          </span>
                          <RecordViewButton
                            label={`equipment ${item.name}`}
                            onClick={() =>
                              setDetail({
                                title: item.name,
                                subtitle: [item.brand, item.model].filter(Boolean).join(' · '),
                                record: {
                                  name: item.name,
                                  brand: item.brand,
                                  model: item.model,
                                  serial: item.serial,
                                  capacity: item.capacity,
                                  site: site?.label ?? 'Primary site',
                                  installedAt: item.installedAt,
                                  warrantyUntil: item.warrantyUntil,
                                  notes: item.notes,
                                  serviceHistory: history.map((report) => ({
                                    reference: report.ref,
                                    title: report.title,
                                    completedAt: report.completedAt,
                                    engineer: report.technician,
                                  })),
                                  createdAt: item.createdAt,
                                  updatedAt: item.updatedAt,
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                      <dl className="mt-4 grid gap-2 text-[11px]">
                        <div className="flex justify-between gap-3 border-b border-line/70 pb-2">
                          <dt className="text-fg-faint">Serial</dt>
                          <dd className="font-mono text-fg-dim">{item.serial || '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-3 border-b border-line/70 pb-2">
                          <dt className="text-fg-faint">Site</dt>
                          <dd className="text-fg-dim">{site?.label ?? 'Primary site'}</dd>
                        </div>
                        <div className="flex justify-between gap-3 border-b border-line/70 pb-2">
                          <dt className="text-fg-faint">Installed</dt>
                          <dd className="text-fg-dim">{formatDate(item.installedAt)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-fg-faint">Warranty</dt>
                          <dd className="text-fg-dim">{formatDate(item.warrantyUntil)}</dd>
                        </div>
                      </dl>
                      {item.notes ? (
                        <p className="mt-3 text-[11px] leading-relaxed text-fg-faint">
                          {item.notes}
                        </p>
                      ) : null}
                      <div className="mt-4 border-t border-line pt-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                          Service history
                        </p>
                        {history.length === 0 ? (
                          <p className="mt-1 text-[11px] text-fg-faint">
                            No report filed for this unit yet.
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-1">
                            {history.slice(0, 3).map((report) => (
                              <li
                                key={report.id}
                                className="flex justify-between gap-3 text-[11px]"
                              >
                                <span className="text-fg-dim">{report.title}</span>
                                <span className="font-mono text-fg-faint">
                                  {formatDate(report.completedAt)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}

        {overview && tab === 'cover' ? (
          <div
            id="portal-panel-cover"
            role="tabpanel"
            aria-labelledby="portal-tab-cover"
            className="mt-6"
          >
            {overview.amc.length === 0 ? (
              <EmptyState
                title="No maintenance contract"
                description="AMC cover puts the visit schedule, response time and exclusions in writing. Ask the works desk for a plan comparison."
                action={
                  <Link
                    to="/amc"
                    className="font-mono text-[9px] uppercase tracking-[0.1em] text-cold"
                  >
                    See plans
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {overview.amc.map((contract) => (
                  <article key={contract.id} className="border border-line bg-panel/20 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[9px] text-cold">{contract.ref}</p>
                        <p className="mt-1 text-sm text-fg">{contract.plan}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          tone={
                            contract.status === 'active'
                              ? 'success'
                              : contract.status === 'expired'
                                ? 'danger'
                                : 'neutral'
                          }
                        >
                          {contract.status}
                        </Badge>
                        <RecordViewButton
                          label={`AMC ${contract.ref}`}
                          onClick={() => {
                            const next = nextContractVisit(overview.appointments, contract.id)
                            setDetail({
                              title: contract.ref,
                              subtitle: contract.plan,
                              record: {
                                reference: contract.ref,
                                plan: contract.plan,
                                status: contract.status,
                                period: `${formatDate(contract.startDate)} – ${formatDate(contract.endDate)}`,
                                visitsPerYear: contract.visitsPerYear,
                                unitsCovered: contract.equipmentIds.length || 'All listed plant',
                                annualValue: contract.price,
                                nextContractVisit: next
                                  ? `${formatDateTime(next.scheduledAt)} · ${next.serviceName}`
                                  : 'Not scheduled',
                                renewalRequestedAt: contract.renewalRequestedAt,
                                notes: contract.notes,
                                createdAt: contract.createdAt,
                                updatedAt: contract.updatedAt,
                              },
                            })
                          }}
                        />
                      </div>
                    </div>
                    <dl className="mt-4 grid gap-2 text-[11px]">
                      <div className="flex justify-between gap-3 border-b border-line/70 pb-2">
                        <dt className="text-fg-faint">Period</dt>
                        <dd className="text-fg-dim">
                          {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3 border-b border-line/70 pb-2">
                        <dt className="text-fg-faint">Visits</dt>
                        <dd className="text-fg-dim">{contract.visitsPerYear} / year</dd>
                      </div>
                      <div className="flex justify-between gap-3 border-b border-line/70 pb-2">
                        <dt className="text-fg-faint">Units covered</dt>
                        <dd className="text-fg-dim">
                          {contract.equipmentIds.length || 'All listed plant'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-fg-faint">Annual value</dt>
                        <dd className="text-fg">{formatMoney(contract.price)}</dd>
                      </div>
                    </dl>
                    {contract.notes ? (
                      <p className="mt-3 text-[11px] leading-relaxed text-fg-faint">
                        {contract.notes}
                      </p>
                    ) : null}
                    {(() => {
                      const next = nextContractVisit(overview.appointments, contract.id)
                      return (
                        <p className="mt-3 border-t border-line pt-3 text-[11px] text-fg-dim">
                          {next
                            ? `Next contract visit: ${formatDateTime(next.scheduledAt)} · ${next.serviceName}`
                            : 'No visit is linked to this contract yet. The works desk will schedule the next AMC visit.'}
                        </p>
                      )
                    })()}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void renewAmc(contract)}
                        disabled={Boolean(contract.renewalRequestedAt)}
                      >
                        {contract.renewalRequestedAt ? 'Renewal requested' : 'Request renewal'}
                      </Button>
                      {contract.renewalRequestedAt ? (
                        <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                          {formatDate(contract.renewalRequestedAt)}
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {overview && tab === 'reports' ? (
          <div
            id="portal-panel-reports"
            role="tabpanel"
            aria-labelledby="portal-tab-reports"
            className="mt-6"
          >
            {overview.reports.length === 0 ? (
              <EmptyState
                title="No service reports yet"
                description="After a completed visit the engineer files the checklist, photographs and readings here. The report stays with the equipment history."
              />
            ) : (
              <div className="flex flex-col gap-4">
                {overview.reports.map((report) => (
                  <article key={report.id} className="border border-line bg-panel/20 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[9px] text-cold">{report.ref}</p>
                        <h3 className="mt-1 text-sm text-fg">{report.title}</h3>
                        <p className="mt-1 text-[11px] text-fg-dim">
                          {formatDate(report.completedAt)} ·{' '}
                          {report.technician || 'Engineer not named'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="success">Completed</Badge>
                        <RecordViewButton
                          label={`report ${report.ref}`}
                          onClick={() =>
                            setDetail({
                              title: `${report.ref} · ${report.title}`,
                              subtitle: `${formatDate(report.completedAt)} · ${report.technician || 'Engineer not named'}`,
                              record: {
                                reference: report.ref,
                                title: report.title,
                                completedAt: report.completedAt,
                                engineer: report.technician || 'Not named',
                                summary: report.summary,
                                checklist: report.checklist,
                                findings: report.findings,
                                recommendations: report.recommendations,
                                photos: report.photos,
                                createdAt: report.createdAt,
                                updatedAt: report.updatedAt,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                    {report.summary ? (
                      <p className="mt-3 text-[12px] leading-relaxed text-fg-dim">
                        {report.summary}
                      </p>
                    ) : null}
                    {report.checklist.length ? (
                      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                        {report.checklist.map((item) => (
                          <li key={item.id}>
                            <label className="flex cursor-pointer items-start gap-2 text-[11px]">
                              <input
                                type="checkbox"
                                checked={item.done}
                                disabled={Boolean(reportCheckBusy)}
                                onChange={(event) =>
                                  void toggleReportChecklist(report, item.id, event.target.checked)
                                }
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[rgb(var(--cold))]"
                              />
                              <span className="text-fg-dim">
                                {item.label}
                                {item.note ? (
                                  <span className="block text-[10px] text-fg-faint">
                                    {item.note}
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {report.photos.length ? (
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {report.photos.map((photo) => (
                          <a
                            key={photo.id}
                            href={photo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="border border-line"
                          >
                            <img
                              src={photo.url}
                              alt={photo.alt || 'Service photograph'}
                              className="h-24 w-full object-cover"
                              loading="lazy"
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {report.findings ? (
                      <div className="mt-4 border-t border-line pt-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                          Findings
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-fg-dim">
                          {report.findings}
                        </p>
                      </div>
                    ) : null}
                    {report.recommendations ? (
                      <div className="mt-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                          Recommendations
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-fg-dim">
                          {report.recommendations}
                        </p>
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                      <label
                        htmlFor={`report-photos-${report.id}`}
                        className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.08em] text-cold hover:text-fg"
                      >
                        {reportPhotoBusy === report.id ? 'Uploading photos…' : 'Add photos'}
                      </label>
                      <input
                        id={`report-photos-${report.id}`}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        disabled={Boolean(reportPhotoBusy)}
                        className="sr-only"
                        onChange={(event) => {
                          const files = Array.from(event.target.files ?? [])
                          void uploadReportPhotos(report.id, files)
                          event.target.value = ''
                        }}
                      />
                      <span className="text-[10px] text-fg-faint">
                        Add site photos for the works desk. The engineer checklist stays as issued.
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {overview && tab === 'support' ? (
          <div
            id="portal-panel-support"
            role="tabpanel"
            aria-labelledby="portal-tab-support"
            className="mt-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-[60ch] text-[12px] leading-relaxed text-fg-dim">
                Raise a complaint, ask for a billing correction or open a support request. The
                thread stays with your account.
              </p>
              <Button size="sm" icon="plus" onClick={() => setTicketNewOpen(true)}>
                New request
              </Button>
            </div>
            {overview.tickets.length === 0 ? (
              <EmptyState
                title="No open requests"
                description="Everything you raise here is logged with a reference and answered by the works desk."
              />
            ) : (
              <div className="divide-y divide-line border border-line bg-panel/20">
                {overview.tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => {
                      setTicketOpen(ticket)
                      setReply('')
                    }}
                    className="flex w-full flex-wrap items-start justify-between gap-3 p-4 text-left hover:bg-panel/40"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[9px] text-cold">{ticket.ref}</span>
                        <Badge tone={ticketTone[ticket.status]}>
                          {ticketStatusLabel[ticket.status]}
                        </Badge>
                        <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                          {categoryLabel[ticket.category]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-fg">{ticket.subject}</p>
                      <p className="text-[11px] text-fg-faint">
                        {ticket.messages.length} message{ticket.messages.length === 1 ? '' : 's'} ·
                        updated {formatDate(ticket.updatedAt)}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-cold">
                      <Icon name="eye" size={11} /> Open
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {overview && tab === 'account' ? (
          <div
            id="portal-panel-account"
            role="tabpanel"
            aria-labelledby="portal-tab-account"
            className="mt-6 space-y-6"
          >
            <div className="grid gap-6 lg:grid-cols-12">
              <form
                className="border border-line bg-panel/30 p-5 lg:col-span-7"
                onSubmit={(event) => void saveProfile(event)}
              >
                <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">
                  Contact details
                </h2>
                <p className="mt-2 text-[11px] leading-relaxed text-fg-faint">
                  The dispatch desk uses this phone and address for portal bookings. Historical
                  invoices are not rewritten.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Full name"
                    required
                    value={profileForm.name}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, name: event.target.value })
                    }
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    required
                    value={profileForm.phone}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, phone: event.target.value })
                    }
                  />
                  <div className="sm:col-span-2">
                    <Textarea
                      label="Service address"
                      rows={3}
                      value={profileForm.address}
                      onChange={(event) =>
                        setProfileForm({ ...profileForm, address: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="mt-5">
                  <Button type="submit" loading={profileBusy}>
                    Save profile
                  </Button>
                </div>
              </form>
              <aside className="border border-line bg-base/40 p-5 lg:col-span-5">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">
                  Account
                </h2>
                <dl className="mt-4 grid gap-3 text-[12px]">
                  <div className="flex justify-between gap-3 border-b border-line pb-2">
                    <dt className="text-fg-faint">Email</dt>
                    <dd className="text-right text-fg">{customer.email}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-line pb-2">
                    <dt className="text-fg-faint">Customer since</dt>
                    <dd className="text-fg">{formatDate(customer.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-line pb-2">
                    <dt className="text-fg-faint">Invoices</dt>
                    <dd className="text-fg">{overview.summary.invoiceCount}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-fg-faint">Outstanding</dt>
                    <dd className="text-fg">{formatMoney(overview.summary.outstanding)}</dd>
                  </div>
                </dl>
                <p className="mt-6 text-[11px] leading-relaxed text-fg-faint">
                  Need a billing change on an issued invoice? The works desk can amend it; your
                  portal shows the corrected total once saved.
                </p>
                <Link
                  to="/contact"
                  className="mt-4 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:text-fg"
                >
                  Contact the works desk <Icon name="arrow-right" size={11} />
                </Link>
              </aside>
            </div>

            <section className="border border-line bg-panel/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">
                    Sites
                  </h2>
                  <p className="mt-1 text-[11px] text-fg-faint">
                    Addresses the dispatch desk can send an engineer to.
                  </p>
                </div>
                <Button size="sm" icon="plus" onClick={() => openSite()}>
                  Add site
                </Button>
              </div>
              {overview.sites.length === 0 ? (
                <p className="mt-4 text-[12px] leading-relaxed text-fg-dim">
                  No site is on file yet. Add the first address so a portal booking carries the
                  right location.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {overview.sites.map((site) => (
                    <article key={site.id} className="border border-line bg-base/30 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm text-fg">{site.label}</p>
                          {site.isPrimary ? <Badge tone="cold">Primary</Badge> : null}
                        </div>
                        <div className="flex items-center gap-1">
                          <RecordViewButton
                            label={`site ${site.label}`}
                            onClick={() =>
                              setDetail({
                                title: site.label,
                                subtitle: site.isPrimary
                                  ? 'Primary service address'
                                  : 'Service address',
                                record: site as unknown as Record<string, unknown>,
                                exclude: ['id'],
                              })
                            }
                          />
                          <button
                            type="button"
                            onClick={() => openSite(site)}
                            className="font-mono text-[9px] uppercase text-cold hover:text-fg"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeSite(site)}
                            className="font-mono text-[9px] uppercase text-fg-faint hover:text-danger"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-fg-dim">{site.address}</p>
                      <p className="text-[10px] text-fg-faint">
                        {[site.city, site.region, site.postalCode].filter(Boolean).join(', ') ||
                          'City not recorded'}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="border border-line bg-panel/20 p-5">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">
                Notification preferences
              </h2>
              <p className="mt-1 text-[11px] text-fg-faint">
                Operational messages about a live visit are always sent. These switches control
                everything else.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Checkbox
                  label="Service updates"
                  description="Booking confirmations, reschedule notices and completion reports."
                  checked={overview.preferences.emailService}
                  disabled={prefsBusy}
                  onChange={(event) => void togglePreference('emailService', event.target.checked)}
                />
                <Checkbox
                  label="Invoices and receipts"
                  description="Issued invoices, payment receipts and reminders."
                  checked={overview.preferences.emailBilling}
                  disabled={prefsBusy}
                  onChange={(event) => void togglePreference('emailBilling', event.target.checked)}
                />
                <Checkbox
                  label="AMC and renewals"
                  description="Visit schedule, renewal windows and contract documents."
                  checked={overview.preferences.emailAmc}
                  disabled={prefsBusy}
                  onChange={(event) => void togglePreference('emailAmc', event.target.checked)}
                />
                <Checkbox
                  label="Seasonal notes"
                  description="Occasional maintenance guidance and plan offers."
                  checked={overview.preferences.emailMarketing}
                  disabled={prefsBusy}
                  onChange={(event) =>
                    void togglePreference('emailMarketing', event.target.checked)
                  }
                />
              </div>
            </section>
          </div>
        ) : null}
      </main>

      <Modal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        title={rebooking ? 'Rebook a service visit' : 'Book a service visit'}
        description={
          rebooking
            ? `Based on ${rebooking.ref}. Choose a new date and window; the original visit is unchanged.`
            : 'Choose the service and a window. The dispatch desk confirms the engineer and updates this page.'
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBookingOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="portal-booking-form" loading={bookingBusy}>
              {rebooking ? 'Request rebook' : 'Request visit'}
            </Button>
          </div>
        }
      >
        <form
          id="portal-booking-form"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => void submitBooking(event)}
        >
          <Select
            label="Service"
            required
            value={bookingForm.serviceSlug}
            onChange={(event) =>
              setBookingForm({ ...bookingForm, serviceSlug: event.target.value })
            }
            options={services.map((service) => ({ value: service.id, label: service.name }))}
          />
          <Input
            label="Preferred date"
            type="date"
            required
            min={today()}
            value={bookingForm.scheduledAt}
            onChange={(event) =>
              setBookingForm({ ...bookingForm, scheduledAt: event.target.value })
            }
          />
          <Select
            label="Window"
            value={bookingForm.window}
            onChange={(event) =>
              setBookingForm({
                ...bookingForm,
                window: event.target.value as AppointmentRecord['window'],
              })
            }
            options={(['morning', 'afternoon', 'evening', 'emergency'] as const).map((entry) => ({
              value: entry,
              label: serviceWindowLabel(entry),
            }))}
          />
          <Input label="Contact phone" value={customer.phone} readOnly />
          {overview && overview.sites.length ? (
            <div className="sm:col-span-2">
              <Select
                label="Book to a saved site"
                placeholder="Choose a site or type the address below"
                value={
                  overview.sites.some((site) => site.address === bookingForm.address)
                    ? bookingForm.address
                    : ''
                }
                onChange={(event) =>
                  setBookingForm({ ...bookingForm, address: event.target.value })
                }
                options={overview.sites.map((site) => ({ value: site.address, label: site.label }))}
              />
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Textarea
              label="Service address"
              rows={2}
              required
              minLength={6}
              value={bookingForm.address}
              onChange={(event) => setBookingForm({ ...bookingForm, address: event.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="What should the engineer know?"
              rows={3}
              value={bookingForm.notes}
              onChange={(event) => setBookingForm({ ...bookingForm, notes: event.target.value })}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        title={rescheduleTarget ? `Reschedule ${rescheduleTarget.ref}` : 'Reschedule visit'}
        description="The current slot is replaced. The dispatch desk sees the new date on the board."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRescheduleTarget(null)}>
              Keep current slot
            </Button>
            <Button type="submit" form="portal-reschedule-form" loading={rescheduleBusy}>
              Save new date
            </Button>
          </div>
        }
      >
        <form
          id="portal-reschedule-form"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => void submitReschedule(event)}
        >
          <Input
            label="New date"
            type="date"
            required
            min={today()}
            value={rescheduleForm.scheduledAt}
            onChange={(event) =>
              setRescheduleForm({ ...rescheduleForm, scheduledAt: event.target.value })
            }
          />
          <Select
            label="Window"
            value={rescheduleForm.window}
            onChange={(event) =>
              setRescheduleForm({
                ...rescheduleForm,
                window: event.target.value as AppointmentRecord['window'],
              })
            }
            options={(['morning', 'afternoon', 'evening', 'emergency'] as const).map((entry) => ({
              value: entry,
              label: serviceWindowLabel(entry),
            }))}
          />
          <p className="sm:col-span-2 text-[11px] leading-relaxed text-fg-faint">
            Rescheduling does not change the service address or the engineer note. Contact the works
            desk if either needs to change.
          </p>
        </form>
      </Modal>

      <Modal
        open={Boolean(quoteOpen)}
        onClose={() => {
          setQuoteOpen(null)
          setChangeOpen(false)
          setChangeNote('')
        }}
        title={quoteOpen ? `Quotation ${quoteOpen.ref}` : 'Quotation'}
        description={
          quoteOpen
            ? `${quoteOpen.title}${quoteOpen.service ? ` · ${quoteOpen.service}` : ''}`
            : undefined
        }
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
              {quoteOpen ? quotationStatusLabel[quoteOpen.status] : ''}
            </span>
            <div className="flex flex-wrap gap-2">
              {quoteOpen ? (
                <ButtonAnchor
                  href={`/api/v1/portal/quotations/${quoteOpen.id}/pdf`}
                  download
                  variant="secondary"
                  icon="download"
                >
                  Download PDF
                </ButtonAnchor>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => {
                  setQuoteOpen(null)
                  setChangeOpen(false)
                  setChangeNote('')
                }}
              >
                Close
              </Button>
              {quoteOpen?.status === 'sent' || quoteOpen?.status === 'changes-requested' ? (
                <>
                  <Button variant="secondary" onClick={() => setChangeOpen((current) => !current)}>
                    {quoteOpen?.status === 'changes-requested'
                      ? 'Update request'
                      : 'Request changes'}
                  </Button>
                  {quoteOpen?.status === 'sent' ? (
                    <Button loading={quoteBusy} onClick={() => void acceptQuote(quoteOpen)}>
                      Accept quotation
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        }
      >
        {quoteOpen ? (
          <div id="portal-invoice-print" className="flex flex-col gap-5">
            <div className="grid gap-3 border border-line bg-base/30 p-4 sm:grid-cols-2">
              <div>
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  Prepared for
                </span>
                <p className="mt-1 text-[12px] text-fg">{customer?.name}</p>
                <p className="text-[11px] text-fg-dim">{customer?.address}</p>
                <p className="text-[11px] text-fg-dim">{customer?.email}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-[12px] text-fg">Quotation total</p>
                <p className="font-display text-2xl text-fg">
                  {formatMoneyExact(quoteOpen.totals.total)}
                </p>
                <p className="text-[10px] text-fg-faint">
                  {quoteOpen.validUntil
                    ? `Valid to ${formatDate(quoteOpen.validUntil)}`
                    : 'No expiry stated'}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto border border-line">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <caption className="sr-only">Quotation lines</caption>
                <thead>
                  <tr className="border-b border-line font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                    <th scope="col" className="p-3">
                      Description
                    </th>
                    <th scope="col" className="p-3 text-right">
                      Qty
                    </th>
                    <th scope="col" className="p-3 text-right">
                      Rate
                    </th>
                    <th scope="col" className="p-3 text-right">
                      Tax
                    </th>
                    <th scope="col" className="p-3 text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {quoteOpen.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="p-3 text-[12px] text-fg">{line.description}</td>
                      <td className="p-3 text-right text-[11px] text-fg-dim">{line.quantity}</td>
                      <td className="p-3 text-right text-[11px] text-fg-dim">
                        {formatMoneyExact(line.unitPrice)}
                      </td>
                      <td className="p-3 text-right text-[11px] text-fg-dim">{line.taxPercent}%</td>
                      <td className="p-3 text-right text-[12px] text-fg">
                        {formatMoneyExact(line.quantity * line.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto grid w-full max-w-[320px] gap-2 text-[12px]">
              <div className="flex justify-between gap-4">
                <dt className="text-fg-faint">Subtotal</dt>
                <dd className="text-fg">{formatMoneyExact(quoteOpen.totals.subtotal)}</dd>
              </div>
              {quoteOpen.totals.discount ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-faint">Discount</dt>
                  <dd className="text-fg">−{formatMoneyExact(quoteOpen.totals.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-fg-faint">Tax</dt>
                <dd className="text-fg">{formatMoneyExact(quoteOpen.totals.taxTotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-2 font-medium">
                <dt className="text-fg">Total</dt>
                <dd className="text-fg">{formatMoneyExact(quoteOpen.totals.total)}</dd>
              </div>
            </dl>
            {quoteOpen.notes ? (
              <p className="border border-line bg-panel/30 p-3 text-[11px] leading-relaxed text-fg-dim">
                {quoteOpen.notes}
              </p>
            ) : null}
            {quoteOpen.terms ? (
              <p className="text-[10px] leading-relaxed text-fg-faint">{quoteOpen.terms}</p>
            ) : null}
            {quoteOpen.changeRequest ? (
              <p className="border border-warn/40 bg-warn/10 p-3 text-[11px] leading-relaxed text-fg-dim">
                Change requested: {quoteOpen.changeRequest}
              </p>
            ) : null}
            {changeOpen ? (
              <form
                className="border border-line bg-panel/30 p-4"
                onSubmit={(event) => void requestQuoteChanges(event)}
              >
                <Textarea
                  label="What should change?"
                  rows={3}
                  value={changeNote}
                  onChange={(event) => setChangeNote(event.target.value)}
                  placeholder="e.g. remove the crane charge and quote a second indoor unit."
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setChangeOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" loading={quoteBusy}>
                    Send request
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={siteOpen}
        onClose={() => {
          setSiteOpen(false)
          setSiteEditing(null)
        }}
        title={siteEditing ? `Edit ${siteEditing.label}` : 'Add a site'}
        description="Sites are the addresses a visit can be booked to. One should be marked primary."
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setSiteOpen(false)
                setSiteEditing(null)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="portal-site-form" loading={siteBusy}>
              Save site
            </Button>
          </div>
        }
      >
        <form
          id="portal-site-form"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => void saveSite(event)}
        >
          <Input
            label="Site name"
            required
            value={siteForm.label}
            onChange={(event) => setSiteForm({ ...siteForm, label: event.target.value })}
            placeholder="Head office"
          />
          <Input
            label="City"
            value={siteForm.city}
            onChange={(event) => setSiteForm({ ...siteForm, city: event.target.value })}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Service address"
              rows={2}
              required
              value={siteForm.address}
              onChange={(event) => setSiteForm({ ...siteForm, address: event.target.value })}
            />
          </div>
          <Input
            label="Region / state"
            value={siteForm.region}
            onChange={(event) => setSiteForm({ ...siteForm, region: event.target.value })}
          />
          <Input
            label="Postal code"
            value={siteForm.postalCode}
            onChange={(event) => setSiteForm({ ...siteForm, postalCode: event.target.value })}
          />
          <div className="sm:col-span-2">
            <Checkbox
              label="Primary site"
              description="Use this address as the default for new bookings."
              checked={siteForm.isPrimary}
              onChange={(event) => setSiteForm({ ...siteForm, isPrimary: event.target.checked })}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={ticketNewOpen}
        onClose={() => setTicketNewOpen(false)}
        title="Raise a request"
        description="Complaints, billing corrections, AMC questions and technical support all use the same thread."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTicketNewOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="portal-ticket-form" loading={ticketBusy}>
              Send to the works desk
            </Button>
          </div>
        }
      >
        <form
          id="portal-ticket-form"
          className="flex flex-col gap-4"
          onSubmit={(event) => void createTicket(event)}
        >
          <Input
            label="Subject"
            required
            value={ticketForm.subject}
            onChange={(event) => setTicketForm({ ...ticketForm, subject: event.target.value })}
          />
          <Select
            label="Category"
            value={ticketForm.category}
            onChange={(event) =>
              setTicketForm({ ...ticketForm, category: event.target.value as TicketCategory })
            }
            options={(Object.keys(categoryLabel) as TicketCategory[]).map((value) => ({
              value,
              label: categoryLabel[value],
            }))}
          />
          <Textarea
            label="What happened?"
            rows={5}
            required
            value={ticketForm.body}
            onChange={(event) => setTicketForm({ ...ticketForm, body: event.target.value })}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(ticketOpen)}
        onClose={() => {
          setTicketOpen(null)
          setReply('')
        }}
        title={ticketOpen ? `${ticketOpen.ref} · ${ticketOpen.subject}` : 'Request'}
        description={
          ticketOpen
            ? `${categoryLabel[ticketOpen.category]} · ${ticketStatusLabel[ticketOpen.status]} · opened ${formatDate(ticketOpen.createdAt)}`
            : undefined
        }
        size="lg"
        footer={
          <div className="flex flex-wrap justify-between gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setTicketOpen(null)
                setReply('')
              }}
            >
              Close
            </Button>
            {ticketOpen && ticketOpen.status !== 'closed' ? (
              <Button type="submit" form="portal-reply-form" loading={ticketBusy}>
                Send reply
              </Button>
            ) : null}
          </div>
        }
      >
        {ticketOpen ? (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
              {ticketOpen.messages.map((message) => (
                <li
                  key={message.id}
                  className={
                    message.authorRole === 'customer'
                      ? 'ml-auto max-w-[85%] border border-cold/30 bg-cold/[0.06] p-3'
                      : 'mr-auto max-w-[85%] border border-line bg-panel/40 p-3'
                  }
                >
                  <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                    {message.authorName} · {formatDateTime(message.at)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-fg-dim">
                    {message.body}
                  </p>
                </li>
              ))}
            </ul>
            {ticketOpen.status === 'closed' ? (
              <p className="border border-line bg-panel/30 p-3 text-[11px] text-fg-faint">
                This request is closed. Raise a new one if the issue returns.
              </p>
            ) : (
              <form id="portal-reply-form" onSubmit={(event) => void sendReply(event)}>
                <Textarea
                  label="Reply"
                  rows={3}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Add the meter reading, the invoice reference or the access constraint."
                />
              </form>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(invoice)}
        onClose={() => setInvoice(null)}
        title={invoice ? `Invoice ${invoice.ref}` : 'Invoice'}
        description={
          invoice
            ? `${invoice.service || 'HVAC service'} · issued ${formatDate(invoice.issueDate)} · due ${formatDate(invoice.dueDate)}`
            : undefined
        }
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
              {invoice?.totals.state}
            </span>
            <div className="flex flex-wrap gap-2">
              {invoice ? (
                <ButtonAnchor
                  href={`/api/v1/portal/invoices/${invoice.id}/pdf`}
                  download
                  variant="secondary"
                  icon="download"
                >
                  Download PDF
                </ButtonAnchor>
              ) : null}
              <Button variant="secondary" onClick={() => setInvoice(null)}>
                Close
              </Button>
            </div>
          </div>
        }
      >
        {invoice ? (
          <div id="portal-invoice-print" className="flex flex-col gap-5">
            <div className="grid gap-3 border border-line bg-base/30 p-4 sm:grid-cols-2">
              <div>
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  Billed to
                </span>
                <p className="mt-1 text-[12px] text-fg">{invoice.customerName}</p>
                <p className="text-[11px] text-fg-dim">{invoice.customerAddress}</p>
                <p className="text-[11px] text-fg-dim">
                  {invoice.customerEmail} · {invoice.customerPhone}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-[12px] text-fg">Balance due</p>
                <p className="font-display text-2xl text-fg">
                  {formatMoneyExact(invoice.totals.balance)}
                </p>
                <p className="text-[10px] text-fg-faint">
                  Total {formatMoneyExact(invoice.totals.total)} · paid{' '}
                  {formatMoneyExact(invoice.totals.paid)}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto border border-line">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <caption className="sr-only">Invoice lines</caption>
                <thead>
                  <tr className="border-b border-line font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                    <th scope="col" className="p-3">
                      Description
                    </th>
                    <th scope="col" className="p-3 text-right">
                      Qty
                    </th>
                    <th scope="col" className="p-3 text-right">
                      Rate
                    </th>
                    <th scope="col" className="p-3 text-right">
                      Tax
                    </th>
                    <th scope="col" className="p-3 text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {invoice.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="p-3 text-[12px] text-fg">{line.description}</td>
                      <td className="p-3 text-right text-[11px] text-fg-dim">{line.quantity}</td>
                      <td className="p-3 text-right text-[11px] text-fg-dim">
                        {formatMoneyExact(line.unitPrice)}
                      </td>
                      <td className="p-3 text-right text-[11px] text-fg-dim">{line.taxPercent}%</td>
                      <td className="p-3 text-right text-[12px] text-fg">
                        {formatMoneyExact(line.quantity * line.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto grid w-full max-w-[320px] gap-2 text-[12px]">
              <div className="flex justify-between gap-4">
                <dt className="text-fg-faint">Subtotal</dt>
                <dd className="text-fg">{formatMoneyExact(invoice.totals.subtotal)}</dd>
              </div>
              {invoice.totals.discount ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-faint">Discount</dt>
                  <dd className="text-fg">−{formatMoneyExact(invoice.totals.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-fg-faint">Tax</dt>
                <dd className="text-fg">{formatMoneyExact(invoice.totals.taxTotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-2">
                <dt className="text-fg">Total</dt>
                <dd className="text-fg">{formatMoneyExact(invoice.totals.total)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-fg-faint">Paid</dt>
                <dd className="text-fg">{formatMoneyExact(invoice.totals.paid)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-2 font-medium">
                <dt className="text-fg">Balance</dt>
                <dd className="text-fg">{formatMoneyExact(invoice.totals.balance)}</dd>
              </div>
            </dl>
            {invoice.payments.length ? (
              <div>
                <h3 className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                  Payments received
                </h3>
                <ul className="mt-2 divide-y divide-line border border-line">
                  {invoice.payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex flex-wrap justify-between gap-3 p-3 text-[11px]"
                    >
                      <span className="text-fg">
                        {formatDate(payment.receivedAt)} · {payment.method}
                        {payment.reference ? ` · ${payment.reference}` : ''}
                      </span>
                      <span className="text-fg">{formatMoneyExact(payment.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {invoice.notes ? (
              <p className="border border-line bg-panel/30 p-3 text-[11px] leading-relaxed text-fg-dim">
                {invoice.notes}
              </p>
            ) : null}
            {invoice.terms ? (
              <p className="text-[10px] leading-relaxed text-fg-faint">{invoice.terms}</p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <RecordDrawer
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.title ?? 'Record'}
        subtitle={detail?.subtitle}
        record={detail?.record ?? null}
        exclude={detail?.exclude}
      />
      </div>
    </div>
  )
}
