import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom'
import { Icon, type IconName } from '@/components/icons'
import { Badge, Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { adminApi, type AdminUser } from '@/admin/api'
import { SalesLogin } from '@/sales/SalesLogin'
import {
  SalesFollowUps,
  SalesJobs,
  SalesOverview,
  SalesPerformance,
  SalesPipeline,
  SalesQuotes,
  SalesSettings,
} from '@/sales/sections'
import { monthLabel } from '@/sales/shared'
import type { SalesWorkspace } from '@hvac/shared'

type SalesNav = { label: string; to: string; icon: IconName; end?: boolean }

const navigation: { label: string; items: SalesNav[] }[] = [
  {
    label: 'Desk',
    items: [
      { label: 'Overview', to: '/sales', icon: 'gauge', end: true },
      { label: 'My pipeline', to: '/sales/pipeline', icon: 'airflow' },
      { label: 'Follow-ups', to: '/sales/follow-ups', icon: 'calendar' },
      { label: 'Quotes', to: '/sales/quotes', icon: 'tag' },
    ],
  },
  {
    label: 'Results',
    items: [
      { label: 'Performance', to: '/sales/performance', icon: 'gauge' },
      { label: 'Customer jobs', to: '/sales/jobs', icon: 'wrench' },
      { label: 'Targets & pay', to: '/sales/settings', icon: 'shield' },
    ],
  },
]

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export function SalesPortal() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [workspace, setWorkspace] = useState<SalesWorkspace | null>(null)
  const [month, setMonth] = useState(currentMonth)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [loginNotice, setLoginNotice] = useState('')
  const location = useLocation()

  useEffect(() => {
    document.title = 'Sales desk · Coolvane HVAC'
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.appendChild(robots)
    }
    robots.content = 'noindex, nofollow'
  }, [])

  useEffect(() => {
    let active = true
    adminApi
      .me()
      .then((session) => {
        if (active) setUser(session)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setChecking(false)
      })
    const onUnauthorised = () => setUser(null)
    window.addEventListener('hvac-admin-unauthorised', onUnauthorised)
    return () => {
      active = false
      window.removeEventListener('hvac-admin-unauthorised', onUnauthorised)
    }
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const load = useCallback(async () => {
    if (!user || user.role !== 'sales') return
    setLoading(true)
    setError('')
    try {
      setWorkspace(await adminApi.salesWorkspace(month))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The sales desk could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [month, user])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onDataChanged = () => void load()
    window.addEventListener('hvac-admin-data-changed', onDataChanged)
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('hvac-admin-data-changed', onDataChanged)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  const signOut = async () => {
    setMenuOpen(false)
    try {
      await adminApi.logout()
    } catch {
      // A dead session is still a signed-out session.
    }
    setUser(null)
    setWorkspace(null)
  }

  if (checking) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-base">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-faint">
          <span className="h-2 w-2 animate-pulse bg-cold" />
          Opening sales desk
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <SalesLogin
        key={loginNotice}
        notice={loginNotice}
        onSuccess={async (result) => {
          if (result.role !== 'sales') {
            await adminApi.logout().catch(() => undefined)
            setLoginNotice('That account is not a sales account. Ask an owner to set its role to Sales.')
            return
          }
          setUser(result)
        }}
      />
    )
  }

  if (user.role !== 'sales') {
    if (user.role === 'owner' || user.role === 'admin' || user.role === 'manager') {
      return <Navigate to="/admin/sales" replace />
    }
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-base p-6">
        <div className="max-w-md border border-line bg-panel/50 p-8">
          <Badge tone="danger">No sales access</Badge>
          <h1 className="t-h3 mt-4 text-fg">This desk is for the sales team.</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-fg-dim">
            Your account does not have a sales role. Contact an owner if you need access.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
            <Link
              to="/"
              className="inline-flex h-9 items-center border border-line px-4 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim"
            >
              Public site
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const section = (() => {
    if (!workspace) return null
    const props = { workspace, onRefresh: () => void load() }
    if (location.pathname === '/sales/pipeline') return <SalesPipeline {...props} />
    if (location.pathname === '/sales/follow-ups') return <SalesFollowUps {...props} />
    if (location.pathname === '/sales/quotes') return <SalesQuotes {...props} />
    if (location.pathname === '/sales/performance') return <SalesPerformance {...props} />
    if (location.pathname === '/sales/jobs') return <SalesJobs {...props} />
    if (location.pathname === '/sales/settings') return <SalesSettings {...props} />
    return <SalesOverview {...props} />
  })()

  const nav = (onNavigate?: () => void) => (
    <nav aria-label="Sales" className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 py-5">
      {navigation.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-3 font-mono text-[8px] uppercase tracking-[0.16em] text-fg-faint">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex min-w-0 items-center gap-2.5 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors',
                    isActive
                      ? 'border-cold/40 bg-cold/[0.07] text-cold'
                      : 'border-transparent text-fg-dim hover:border-line hover:text-fg',
                  )
                }
              >
                <Icon name={item.icon} size={14} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )

  return (
    <div className="min-h-[100svh] bg-base lg:grid lg:grid-cols-[224px_minmax(0,1fr)]">
      <a
        href="#sales-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-cold focus:bg-base focus:px-4 focus:py-2 focus:text-[11px] focus:text-fg"
      >
        Skip to sales content
      </a>

      <aside className="border-b border-line bg-panel/30 lg:sticky lg:top-0 lg:flex lg:h-[100svh] lg:min-h-0 lg:flex-col lg:overflow-hidden lg:border-b-0 lg:border-r">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-4">
          <Link to="/sales" className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-line-strong font-mono text-[10px] text-cold">
              CV
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-fg">
                Sales desk
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                Coolvane HVAC
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              aria-label="Open sales navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="flex h-8 w-8 items-center justify-center border border-line text-fg-dim"
            >
              <Icon name="menu" size={15} />
            </button>
          </div>
        </div>

        <div className="hidden min-h-0 flex-1 flex-col lg:flex">
          {nav()}
          <div className="shrink-0 border-t border-line p-4">
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
              Signed in as
            </span>
            <p className="mt-1 truncate font-mono text-[10px] text-fg-dim">{user.email}</p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                to="/"
                target="_blank"
                className="flex h-8 flex-1 items-center justify-center gap-1.5 border border-line font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:text-cold"
              >
                <Icon name="external" size={12} /> Site
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
              <span className="h-1 w-1 bg-success" /> Scoped to your book
            </p>
          </div>
        </div>
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Sales menu">
          <button
            type="button"
            aria-label="Close sales navigation"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col border-r border-line bg-base shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg">
                Sales desk
              </span>
              <button
                type="button"
                aria-label="Close sales navigation"
                onClick={() => setMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center border border-line text-fg-faint"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
            {nav(() => setMenuOpen(false))}
            <div className="shrink-0 border-t border-line p-4">
              <p className="truncate font-mono text-[10px] text-fg-dim">{user.email}</p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-3 flex h-8 w-full items-center justify-center border border-line font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint hover:text-danger"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main id="sales-main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 lg:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <Badge tone="cold">{workspace?.scope.label ?? 'Sales desk'}</Badge>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
              {monthLabel(month)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="sales-month">
              Sales month
            </label>
            <input
              id="sales-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value || currentMonth())}
              className="h-8 border border-line bg-transparent px-2 font-mono text-[9px] uppercase tracking-[0.08em] text-fg-dim outline-none focus:border-cold"
            />
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              aria-label="Refresh sales desk"
              className="flex h-8 w-8 items-center justify-center border border-line text-fg-faint hover:text-cold disabled:opacity-40"
            >
              <Icon name="refresh" size={13} />
            </button>
          </div>
        </div>

        {error ? (
          <div className="border border-danger/40 bg-danger/[0.06] px-4 py-3 text-[12px] text-fg-dim">
            {error}
          </div>
        ) : null}
        {loading && !workspace ? (
          <div className="flex items-center gap-2 py-12 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-faint">
            <span className="h-2 w-2 animate-pulse bg-cold" /> Loading your desk
          </div>
        ) : workspace ? (
          section
        ) : null}
      </main>
    </div>
  )
}
