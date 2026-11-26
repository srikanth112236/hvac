import { useCallback, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ADMIN_ROLES, adminRoleLabel, type AdminRole } from '@hvac/shared'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { useRecordDeepLink } from '@/admin/useDeepLink'
import { Icon } from '@/components/icons'
import { Badge, Button, Input, RecordDrawer, RecordViewButton, Select, useToast } from '@/components/ui'
import { useSiteContent } from '@/content/SiteContentProvider'
import {
  adminApi,
  type AdminUser,
  type AuditEntry,
  type DataHealth,
  type PermissionMatrix,
  type PublicAdminUser,
  type TwoFactorSetupChallenge,
  type TwoFactorStatus,
} from '@/admin/api'
import { AdminPageHeader, Panel, formatDateTime } from '@/admin/ui'
import { AdminLeadScoringPanel } from '@/admin/AdminLeadScoringPanel'

export function AdminSettings() {
  const { content, syncedAt, stale, refresh } = useSiteContent()
  const { toast } = useToast()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [mail, setMail] = useState<{ configured: boolean; from: string; notify: string } | null>(
    null,
  )
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [health, setHealth] = useState<DataHealth | null>(null)
  const [twoFactor, setTwoFactor] = useState<TwoFactorStatus | null>(null)
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorSetupChallenge | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorBusy, setTwoFactorBusy] = useState(false)
  const [permissions, setPermissions] = useState<PermissionMatrix | null>(null)
  const [users, setUsers] = useState<PublicAdminUser[]>([])
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer' as AdminRole,
  })
  const [userBusy, setUserBusy] = useState(false)
  const [viewingUser, setViewingUser] = useState<PublicAdminUser | null>(null)
  const [viewingAudit, setViewingAudit] = useState<AuditEntry | null>(null)

  useRecordDeepLink({
    param: 'user',
    records: users,
    resolve: (value) => users.find((entry) => entry.id === value),
    onOpen: setViewingUser,
  })

  const load = useCallback(() => {
    adminApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
    adminApi
      .mailStatus()
      .then(setMail)
      .catch(() => setMail(null))
    adminApi
      .audit()
      .then(setAudit)
      .catch(() => setAudit([]))
    adminApi
      .dataHealth()
      .then(setHealth)
      .catch(() => setHealth(null))
    adminApi
      .twoFactorStatus()
      .then(setTwoFactor)
      .catch(() => setTwoFactor(null))
    adminApi
      .permissions()
      .then(setPermissions)
      .catch(() => setPermissions(null))
    adminApi
      .users()
      .then(setUsers)
      .catch(() => setUsers([]))
  }, [])
  useLiveRefresh(load, 30_000)

  const startTwoFactor = async (purpose: 'enable' | 'disable') => {
    setTwoFactorBusy(true)
    try {
      const challenge = await adminApi.setupTwoFactor(purpose)
      setTwoFactorChallenge(challenge)
      setTwoFactorCode('')
      toast({
        title: purpose === 'enable' ? 'Confirmation sent' : 'Disable code sent',
        description: `Check ${challenge.maskedEmail} for the six-digit code.`,
        tone: 'success',
      })
    } catch (caught) {
      toast({
        title: 'Could not send the code',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setTwoFactorBusy(false)
    }
  }

  const confirmTwoFactor = async (event: FormEvent) => {
    event.preventDefault()
    if (!twoFactorChallenge) return
    setTwoFactorBusy(true)
    try {
      const status = await adminApi.confirmTwoFactor(
        twoFactorChallenge.challengeId,
        twoFactorCode,
        twoFactorChallenge.purpose,
      )
      setTwoFactor(status)
      setTwoFactorChallenge(null)
      setTwoFactorCode('')
      toast({
        title: status.enabled ? 'Two-factor enabled' : 'Two-factor disabled',
        description: status.enabled
          ? 'Future sign-ins require a code sent to this inbox.'
          : 'Sign-in now uses password only.',
        tone: status.enabled ? 'success' : 'warn',
      })
    } catch (caught) {
      toast({
        title: 'Code not accepted',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setTwoFactorBusy(false)
    }
  }

  const createUser = async (event: FormEvent) => {
    event.preventDefault()
    setUserBusy(true)
    try {
      const created = await adminApi.createAdminUser(userForm)
      setUsers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
      setUserForm({ name: '', email: '', password: '', role: 'viewer' })
      toast({
        title: 'User created',
        description: `${created.email} can sign in as ${created.role}.`,
        tone: 'success',
      })
    } catch (caught) {
      toast({
        title: 'Could not create user',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setUserBusy(false)
    }
  }

  const patchUser = async (
    id: string,
    patch: { role?: AdminRole; status?: 'active' | 'disabled' },
  ) => {
    try {
      const updated = await adminApi.patchAdminUser(id, patch)
      setUsers((current) => current.map((entry) => (entry.id === id ? updated : entry)))
      toast({ title: 'User updated', tone: 'success' })
    } catch (caught) {
      toast({
        title: 'Could not update user',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const canAdministerData = user?.role === 'owner' || user?.role === 'admin'

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Settings"
        title="Access, feed and storage."
        description="The operational settings for this deployment. Credentials live in the API environment, never in the browser bundle."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Brand, appearance & documents"
          action={<Badge tone="cold">One place</Badge>}
          className="xl:col-span-2"
        >
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <p className="text-[12px] leading-relaxed text-fg-dim">
                The live palette, button colours, logo and document settings all live in the
                content document. Saving a change rewrites the tokens on <code>:root</code>, so the
                public site, customer portal and this control room recolor together — and invoices,
                quotations and expense reports pick up the same accent and signature.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    ['Canvas', content.theme?.palette.base],
                    ['Panel', content.theme?.palette.panel],
                    ['Text', content.theme?.palette.text],
                    ['Accent', content.theme?.buttons.primaryBg ?? content.theme?.palette.cold],
                    ['Heat', content.theme?.palette.heat],
                    ['Line', content.theme?.palette.line],
                  ] as const
                ).map(([label, value]) => (
                  <span key={label} className="flex items-center gap-2 border border-line px-2 py-1.5">
                    <span
                      className="h-5 w-5 border border-line"
                      style={{ background: value ? `rgb(${value})` : 'transparent' }}
                    />
                    <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                      {label}
                    </span>
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  ['brand', 'Logo, palette & buttons'],
                  ['billing', 'Billing identity'],
                  ['documents', 'Documents & signature'],
                  ['navigation', 'Navigation & menus'],
                ].map(([workspace, label]) => (
                  <Link
                    key={workspace}
                    to={`/admin/content?workspace=${workspace}`}
                    className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
                  >
                    {label} <Icon name="arrow-up-right" size={11} />
                  </Link>
                ))}
              </div>
            </div>
            <div className="border border-line bg-panel/30 p-4">
              <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                Documents
              </p>
              <dl className="mt-2 flex flex-col gap-2 text-[11px] text-fg-dim">
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-faint">Paper</dt>
                  <dd>{content.brand.documents?.paper ?? 'A4'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-faint">Signature</dt>
                  <dd>{content.brand.documents?.signatureName || 'Authorised signatory'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-faint">Bank details</dt>
                  <dd>{content.brand.documents?.showBankDetails === false ? 'Hidden' : 'Printed'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-faint">Content</dt>
                  <dd>{stale ? 'Stale' : `v${content.version}`}</dd>
                </div>
              </dl>
              <Link
                to="/admin/content?workspace=documents"
                className="mt-4 flex h-9 items-center justify-center gap-2 border border-cold/50 bg-cold/[0.08] font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:bg-cold/[0.14]"
              >
                Edit documents <Icon name="arrow-up-right" size={11} />
              </Link>
            </div>
          </div>
        </Panel>

        <Panel title="Account">
          <dl className="flex flex-col">
            <div className="flex items-center justify-between border-b border-line/70 py-3 first:pt-0">
              <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                Email
              </dt>
              <dd className="font-mono text-[11px] text-fg">{user?.email ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-line/70 py-3">
              <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                Role
              </dt>
              <dd className="font-mono text-[11px] text-fg">{user?.role ?? 'owner'}</dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                Session expires
              </dt>
              <dd className="font-mono text-[11px] text-fg-dim">
                {user ? formatDateTime(new Date(user.expiresAt).toISOString()) : '—'}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-fg-faint">
            The environment owner remains the recovery account. Additional staff accounts are
            managed in Users &amp; roles; write actions are limited by role on the API.
          </p>
        </Panel>

        <Panel
          title="Two-factor authentication"
          action={
            <Badge
              tone={twoFactor?.enabled ? 'success' : twoFactor?.mailConfigured ? 'neutral' : 'warn'}
              dot
            >
              {twoFactor
                ? twoFactor.enabled
                  ? 'Email OTP on'
                  : twoFactor.mailConfigured
                    ? 'Off'
                    : 'Email not configured'
                : 'Checking'}
            </Badge>
          }
        >
          <p className="text-[12px] leading-relaxed text-fg-dim">
            When on, every sign-in needs a six-digit code sent to{' '}
            {twoFactor?.maskedEmail ?? 'the account inbox'}. Codes expire in ten minutes, allow five
            attempts and are delivered by email only — there is no SMS fallback anywhere in the
            product.
          </p>
          {twoFactor?.enabledAt ? (
            <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
              On since {formatDateTime(twoFactor.enabledAt)}
            </p>
          ) : null}
          {!twoFactor?.mailConfigured ? (
            <p className="mt-3 border border-warn/30 bg-warn/[0.06] p-3 text-[11px] leading-relaxed text-fg-dim">
              Set RESEND_API_KEY or MAIL_WEBHOOK_URL before enabling. Without a provider the API
              refuses to enable two-factor rather than pretending codes were sent.
            </p>
          ) : null}

          {twoFactorChallenge ? (
            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={(event) => void confirmTwoFactor(event)}
            >
              <Input
                label={`Code sent to ${twoFactorChallenge.maskedEmail}`}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={twoFactorCode}
                onChange={(event) =>
                  setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                required
                autoFocus
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={twoFactorBusy || twoFactorCode.length !== 6}
                >
                  {twoFactorBusy
                    ? 'Checking…'
                    : twoFactorChallenge.purpose === 'enable'
                      ? 'Enable two-factor'
                      : 'Disable two-factor'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="quiet"
                  onClick={() => {
                    setTwoFactorChallenge(null)
                    setTwoFactorCode('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={twoFactor?.enabled ? 'quiet' : 'primary'}
                disabled={twoFactorBusy || !twoFactor?.mailConfigured}
                onClick={() => void startTwoFactor(twoFactor?.enabled ? 'disable' : 'enable')}
              >
                {twoFactor?.enabled ? 'Turn off two-factor' : 'Turn on two-factor'}
              </Button>
            </div>
          )}
        </Panel>

        {user?.role === 'owner' ? (
          <Panel title="Users & roles" action={<Badge tone="neutral">{users.length}</Badge>}>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => void createUser(event)}
            >
              <Input
                label="Name"
                required
                value={userForm.name}
                onChange={(event) => setUserForm({ ...userForm, name: event.target.value })}
              />
              <Input
                label="Email"
                type="email"
                required
                value={userForm.email}
                onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
              />
              <Input
                label="Password"
                type="password"
                required
                minLength={8}
                hint="At least 8 characters."
                value={userForm.password}
                onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
              />
              <Select
                label="Role"
                value={userForm.role}
                onChange={(event) =>
                  setUserForm({ ...userForm, role: event.target.value as AdminRole })
                }
                options={ADMIN_ROLES.map((role) => ({ value: role, label: adminRoleLabel[role] }))}
              />
              <div className="sm:col-span-2">
                <Button type="submit" size="sm" disabled={userBusy}>
                  {userBusy ? 'Creating…' : 'Add user'}
                </Button>
              </div>
            </form>

            <ul className="mt-4 flex flex-col divide-y divide-line/70">
              {users.length === 0 ? (
                <li className="py-3 text-[11px] text-fg-faint">
                  No additional users. The environment owner is the only account.
                </li>
              ) : (
                users.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12px] text-fg">{entry.name}</p>
                      <p className="truncate text-[10px] text-fg-faint">{entry.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <RecordViewButton
                        label={`user ${entry.email}`}
                        onClick={() => setViewingUser(entry)}
                      />
                      <Select
                        aria-label={`Role for ${entry.email}`}
                        value={entry.role}
                        onChange={(event) =>
                          void patchUser(entry.id, { role: event.target.value as AdminRole })
                        }
                        options={ADMIN_ROLES.map((role) => ({
                          value: role,
                          label: adminRoleLabel[role],
                        }))}
                        className="min-w-[120px]"
                      />
                      <Badge tone={entry.status === 'active' ? 'success' : 'danger'}>
                        {entry.status}
                      </Badge>
                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={() =>
                          void patchUser(entry.id, {
                            status: entry.status === 'active' ? 'disabled' : 'active',
                          })
                        }
                      >
                        {entry.status === 'active' ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Panel>
        ) : null}

        <Panel title="Lead scoring" action={<Badge tone="cold">Kanban rules</Badge>}>
          <AdminLeadScoringPanel />
        </Panel>

        <Panel
          title="Permissions matrix"
          action={
            <Link
              to="/admin/team"
              className="font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:text-fg"
            >
              Edit in Team → Roles & access
            </Link>
          }
        >
          {permissions ? (
            <>
              <p className="text-[12px] leading-relaxed text-fg-dim">
                Every admin route enforces this matrix. Reads stay available to all signed-in staff;
                writes are limited to the roles marked below. The owner account is the recovery
                account and cannot be removed from the matrix.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="py-2 pr-4 font-mono text-[9px] font-normal uppercase tracking-[0.1em] text-fg-faint">
                        Capability
                      </th>
                      {permissions.roles.map((role) => (
                        <th
                          key={role}
                          className={`px-2 py-2 text-center font-mono text-[9px] font-normal uppercase tracking-[0.08em] ${
                            user?.role === role ? 'text-cold' : 'text-fg-faint'
                          }`}
                        >
                          {adminRoleLabel[role]}
                          {user?.role === role ? ' · you' : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.permissions.map((permission) => (
                      <tr key={permission.key} className="border-b border-line/60 last:border-0">
                        <td className="py-3 pr-4">
                          <span className="block text-[12px] text-fg">{permission.label}</span>
                          <span className="mt-0.5 block text-[10px] leading-snug text-fg-faint">
                            {permission.description}
                          </span>
                        </td>
                        {permissions.roles.map((role) => {
                          const allowed = permissions.matrix[role].includes(permission.key)
                          return (
                            <td
                              key={role}
                              className={`px-2 py-3 text-center ${
                                user?.role === role ? 'bg-cold/[0.04]' : ''
                              }`}
                            >
                              {allowed ? (
                                <Icon name="check" size={13} className="mx-auto text-success" />
                              ) : (
                                <span className="text-fg-faint">—</span>
                              )}
                              <span className="sr-only">{allowed ? 'allowed' : 'not allowed'}</span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.08em] text-fg-faint">
                Read-only role:{' '}
                {permissions.roles
                  .filter((role) => permissions.matrix[role].length === 1)
                  .map((role) => adminRoleLabel[role])
                  .join(', ') || 'none'}
                .
              </p>
            </>
          ) : (
            <p className="text-[11px] text-fg-faint">
              The permissions matrix could not be read. Confirm the API is reachable and the session
              is active.
            </p>
          )}
        </Panel>

        <Panel
          title="Public content feed"
          action={
            <Badge tone={stale ? 'warn' : 'success'} dot>
              {stale ? 'Stale' : 'Live'}
            </Badge>
          }
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="t-num text-h3 text-fg">v{content.version}</p>
                <p className="mt-1 text-[11px] text-fg-faint">
                  Published {formatDateTime(content.updatedAt)}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => void refresh()} icon="airflow">
                Check feed
              </Button>
            </div>
            <div className="border border-line bg-base p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                Browser last read
              </p>
              <p className="mt-1 text-[12px] text-fg-dim">
                {syncedAt ? new Date(syncedAt).toLocaleTimeString() : 'Waiting for first poll'}
              </p>
            </div>
            <p className="text-[11px] leading-relaxed text-fg-faint">
              Public tabs poll every 10 seconds and re-read on focus. The admin save invalidates the
              feed immediately; the public change window is under 15 seconds.
            </p>
          </div>
        </Panel>

        <Panel title="Security controls">
          <ul className="flex flex-col gap-3">
            {[
              ['Email two-factor', 'Optional per account; a one-time code per sign-in. No SMS.'],
              ['HttpOnly session cookie', 'SameSite=Strict, twelve-hour expiry, no token in JS.'],
              ['Login rate limiting', 'Eight attempts per IP in a fifteen-minute window.'],
              ['Mutation checks', 'Same-origin verification plus X-Admin-Request header.'],
              ['Private admin API', 'Every /admin route requires a live session.'],
              ['No public lead list', 'Lead reads exist only behind authentication.'],
            ].map(([label, body]) => (
              <li
                key={label}
                className="flex items-start gap-2.5 border-t border-line/70 pt-3 first:border-0 first:pt-0"
              >
                <Icon name="shield" size={14} className="mt-0.5 shrink-0 text-cold" />
                <span>
                  <span className="block text-[12px] text-fg">{label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-fg-faint">
                    {body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Data stores">
          <p className="text-[12px] leading-relaxed text-fg-dim">
            Content, leads, customers, invoices, reminders and the audit/email ledgers persist as
            JSON documents under{' '}
            <code className="font-mono text-[11px] text-cold">apps/api/data/</code>. The directory
            is gitignored. Swap the store module for a database without changing the API contracts.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              'content.json',
              'leads.json',
              'customers.json',
              'invoices.json',
              'audit-log.json',
              'email-log.json',
            ].map((file) => (
              <span
                key={file}
                className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.06em] text-fg-faint"
              >
                {file}
              </span>
            ))}
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <Link
              to="/admin/content"
              className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:text-fg"
            >
              Open content console
              <Icon name="arrow-right" size={11} />
            </Link>
          </div>
        </Panel>
        <Panel
          title="Email delivery"
          action={
            <Badge tone={mail?.configured ? 'success' : 'warn'} dot>
              {mail ? (mail.configured ? 'Configured' : 'Disabled') : 'Checking'}
            </Badge>
          }
        >
          <p className="text-[12px] leading-relaxed text-fg-dim">
            {mail?.configured
              ? 'A provider is configured. Enquiries, quotations, AMC renewal, support updates, invoice reminders, bookings, newsletters and staff 2FA codes are delivered and logged.'
              : 'No provider is configured. Nothing is sent: set RESEND_API_KEY or MAIL_WEBHOOK_URL in the API environment. Enquiry acknowledgements, newsletter sends and staff 2FA setup stay blocked until it is set.'}
          </p>
          {mail ? (
            <dl className="mt-4 flex flex-col gap-2 font-mono text-[10px] uppercase tracking-[0.06em] text-fg-faint">
              <div className="flex justify-between gap-4">
                <dt>From</dt>
                <dd className="truncate text-fg-dim">{mail.from}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Works inbox</dt>
                <dd className="truncate text-fg-dim">{mail.notify}</dd>
              </div>
            </dl>
          ) : null}
        </Panel>

        {canAdministerData ? (
          <>
            <Panel
              title="Data health & backup"
              action={
                <Badge tone={health && health.issues.length ? 'warn' : 'success'} dot>
                  {health
                    ? health.issues.length
                      ? `${health.issues.length} issues`
                      : 'Consistent'
                    : 'Checking'}
                </Badge>
              }
            >
              {health ? (
                <>
                  <p className="text-[11px] leading-relaxed text-fg-dim">
                    Schema version {health.dataVersion ?? '—'} · checked{' '}
                    {formatDateTime(health.generatedAt)}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[9px] uppercase tracking-[0.06em] text-fg-faint">
                    {Object.entries(health.counts).map(([key, value]) => (
                      <div key={key} className="border border-line px-2 py-1.5">
                        <span className="block truncate">{key}</span>
                        <span className="mt-1 block font-sans text-[13px] normal-case tracking-normal text-fg">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                  {health.issues.length ? (
                    <ul className="mt-3 max-h-32 overflow-auto border border-warn/30 bg-warn/[0.06] p-2 text-[10px] leading-relaxed text-fg-dim">
                      {health.issues.slice(0, 20).map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[11px] text-fg-faint">
                      No orphaned payroll, report, AMC or customer references found.
                    </p>
                  )}
                  <a
                    href="/api/v1/admin/export"
                    className="mt-4 inline-flex h-8 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:border-cold/50 hover:text-fg"
                  >
                    Download JSON backup
                  </a>
                  <p className="mt-2 text-[10px] leading-relaxed text-fg-faint">
                    A daily copy is kept under <code className="font-mono">data/backups</code> for
                    seven days. Session and password-reset files are excluded.
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-fg-faint">Data health could not be read.</p>
              )}
            </Panel>

            <Panel title="Audit log" action={<Badge tone="neutral">{audit.length} recent</Badge>}>
              {audit.length === 0 ? (
                <p className="text-[12px] leading-relaxed text-fg-faint">
                  No admin mutations recorded yet. Creates, edits and deletes are logged with the
                  actor, route, status and time; request bodies are not stored.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-line/70">
                  {audit.slice(0, 12).map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start justify-between gap-4 py-2 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[10px] uppercase tracking-[0.06em] text-fg-dim">
                          {entry.method} {entry.path}
                        </p>
                        <p className="mt-0.5 text-[10px] text-fg-faint">
                          {entry.actor ?? 'unauthenticated'} · {entry.ip}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <RecordViewButton
                            label={`audit entry ${entry.path}`}
                            onClick={() => setViewingAudit(entry)}
                          />
                          <span
                            className={
                              entry.status >= 400
                                ? 'font-mono text-[10px] text-danger'
                                : 'font-mono text-[10px] text-success'
                            }
                          >
                            {entry.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-fg-faint">
                          {formatDateTime(entry.at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        ) : null}
      </div>

      <div className="border border-line bg-panel/30 p-4">
        <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.08em] text-fg-faint">
          Tip · Keep ADMIN_PASSWORD out of the repository. Rotate it by changing the API environment
          and restarting the service; existing sessions expire within twelve hours.
        </p>
      </div>

      <RecordDrawer
        open={Boolean(viewingUser)}
        onClose={() => setViewingUser(null)}
        title={viewingUser?.name ?? 'Admin user'}
        subtitle={viewingUser?.email}
        record={viewingUser as unknown as Record<string, unknown> | null}
        exclude={['id']}
      />

      <RecordDrawer
        open={Boolean(viewingAudit)}
        onClose={() => setViewingAudit(null)}
        title={viewingAudit ? `${viewingAudit.method} ${viewingAudit.path}` : 'Audit entry'}
        subtitle={viewingAudit ? `${viewingAudit.actor ?? 'Unauthenticated'} · ${formatDateTime(viewingAudit.at)}` : undefined}
        record={viewingAudit as unknown as Record<string, unknown> | null}
        exclude={['id']}
      />
    </div>
  )
}
