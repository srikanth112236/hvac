import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { Icon } from '@/components/icons'
import { Badge, Button } from '@/components/ui'
import { useSiteContent } from '@/content/SiteContentProvider'
import { adminApi, type AdminUser, type AuditEntry, type DataHealth } from '@/admin/api'
import { AdminPageHeader, Panel, formatDateTime } from '@/admin/ui'

export function AdminSettings() {
  const { content, syncedAt, stale, refresh } = useSiteContent()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [mail, setMail] = useState<{ configured: boolean; from: string; notify: string } | null>(null)
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [health, setHealth] = useState<DataHealth | null>(null)

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
  }, [])
  useLiveRefresh(load, 30_000)

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Settings"
        title="Access, feed and storage."
        description="The operational settings for this deployment. Credentials live in the API environment, never in the browser bundle."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Account">
          <dl className="flex flex-col">
            <div className="flex items-center justify-between border-b border-line/70 py-3 first:pt-0">
              <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">Email</dt>
              <dd className="font-mono text-[11px] text-fg">{user?.email ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-line/70 py-3">
              <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">Role</dt>
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
            One owner account protects this desk. Set ADMIN_EMAIL and ADMIN_PASSWORD in the API
            environment before deployment; the development fallback is disabled in production.
          </p>
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
              ['HttpOnly session cookie', 'SameSite=Strict, twelve-hour expiry, no token in JS.'],
              ['Login rate limiting', 'Eight attempts per IP in a fifteen-minute window.'],
              ['Mutation checks', 'Same-origin verification plus X-Admin-Request header.'],
              ['Private admin API', 'Every /admin route requires a live session.'],
              ['No public lead list', 'Lead reads exist only behind authentication.'],
            ].map(([label, body]) => (
              <li key={label} className="flex items-start gap-2.5 border-t border-line/70 pt-3 first:border-0 first:pt-0">
                <Icon name="shield" size={14} className="mt-0.5 shrink-0 text-cold" />
                <span>
                  <span className="block text-[12px] text-fg">{label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-fg-faint">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Data stores">
          <p className="text-[12px] leading-relaxed text-fg-dim">
            Content, leads, customers, invoices, reminders and the audit/email ledgers persist as JSON
            documents under <code className="font-mono text-[11px] text-cold">apps/api/data/</code>.
            The directory is gitignored. Swap the store module for a database without changing the API
            contracts.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['content.json', 'leads.json', 'customers.json', 'invoices.json', 'audit-log.json', 'email-log.json'].map((file) => (
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
              ? 'A provider is configured. Enquiry acknowledgements, invoice reminders, booking confirmations and newsletter sends are delivered and logged.'
              : 'No provider is configured. Nothing is sent: set RESEND_API_KEY or MAIL_WEBHOOK_URL in the API environment. Enquiry acknowledgements and newsletter sends stay blocked until it is set.'}
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

        <Panel
          title="Data health & backup"
          action={
            <Badge tone={health && health.issues.length ? 'warn' : 'success'} dot>
              {health ? (health.issues.length ? `${health.issues.length} issues` : 'Consistent') : 'Checking'}
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
                A daily copy is kept under <code className="font-mono">data/backups</code> for seven days.
                Session and password-reset files are excluded.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-fg-faint">Data health could not be read.</p>
          )}
        </Panel>

        <Panel title="Audit log" action={<Badge tone="neutral">{audit.length} recent</Badge>}>
          {audit.length === 0 ? (
            <p className="text-[12px] leading-relaxed text-fg-faint">
              No admin mutations recorded yet. Creates, edits and deletes are logged with the actor,
              route, status and time; request bodies are not stored.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line/70">
              {audit.slice(0, 12).map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-4 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[10px] uppercase tracking-[0.06em] text-fg-dim">
                      {entry.method} {entry.path}
                    </p>
                    <p className="mt-0.5 text-[10px] text-fg-faint">
                      {entry.actor ?? 'unauthenticated'} · {entry.ip}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={entry.status >= 400 ? 'font-mono text-[10px] text-danger' : 'font-mono text-[10px] text-success'}>
                      {entry.status}
                    </span>
                    <p className="mt-0.5 text-[10px] text-fg-faint">{formatDateTime(entry.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="border border-line bg-panel/30 p-4">
        <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.08em] text-fg-faint">
          Tip · Keep ADMIN_PASSWORD out of the repository. Rotate it by changing the API environment and
          restarting the service; existing sessions expire within twelve hours.
        </p>
      </div>
    </div>
  )
}
