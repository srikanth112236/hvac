import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from '@/components/icons'
import { Button } from '@/components/ui'
import { adminApi, type AdminUser } from '@/admin/api'
import { AdminLogin } from '@/admin/AdminLogin'
import { AdminSearch } from '@/admin/AdminSearch'

const nav: { label: string; to: string; icon: IconName; end?: boolean }[] = [
  { label: 'Overview', to: '/admin', icon: 'gauge', end: true },
  { label: 'Leads', to: '/admin/leads', icon: 'airflow' },
  { label: 'Customers', to: '/admin/customers', icon: 'thermostat' },
  { label: 'Dispatch', to: '/admin/dispatch', icon: 'calendar' },
  { label: 'Jobs', to: '/admin/jobs', icon: 'wrench' },
  { label: 'Invoices', to: '/admin/invoices', icon: 'coil' },
  { label: 'Quotations', to: '/admin/quotations', icon: 'tag' },
  { label: 'Expenses', to: '/admin/expenses', icon: 'refrigerant' },
  { label: 'Team & payroll', to: '/admin/team', icon: 'wrench' },
  { label: 'Reminders', to: '/admin/reminders', icon: 'calendar' },
  { label: 'Newsletters', to: '/admin/newsletters', icon: 'mail' },
  { label: 'Coupons', to: '/admin/coupons', icon: 'tag' },
  { label: 'Website content', to: '/admin/content', icon: 'thermostat' },
  { label: 'Revisions', to: '/admin/content/revisions', icon: 'clock' },
  { label: 'Journal', to: '/admin/blog', icon: 'airflow' },
  { label: 'Settings', to: '/admin/settings', icon: 'shield' },
]

export function AdminLayout() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    document.title = 'Control room · Coolvane HVAC'
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

  if (checking) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-base">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-faint">
          <span className="h-2 w-2 animate-pulse bg-cold" />
          Opening control room
        </div>
      </div>
    )
  }

  if (!user) return <AdminLogin onSuccess={setUser} />

  const signOut = async () => {
    try {
      await adminApi.logout()
    } catch {
      // A dead session is still a signed-out session.
    }
    setUser(null)
  }

  return (
    <div className="min-h-[100svh] bg-base lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-cold focus:bg-base focus:px-4 focus:py-2 focus:text-[11px] focus:text-fg"
      >
        Skip to admin content
      </a>

      <aside className="border-b border-line bg-panel/30 lg:sticky lg:top-0 lg:flex lg:h-[100svh] lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 lg:px-5">
          <Link to="/admin" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center border border-line-strong font-mono text-[10px] text-cold">
              CV
            </span>
            <span className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg">
                Control room
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                Coolvane HVAC
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              to="/"
              aria-label="Open public site"
              className="flex h-8 w-8 items-center justify-center border border-line text-fg-faint hover:text-cold"
            >
              <Icon name="external" size={14} />
            </Link>
            <Button variant="quiet" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>

        <nav
          aria-label="Admin"
          className="flex gap-1 overflow-x-auto px-3 py-2 lg:flex-col lg:overflow-visible lg:py-4"
        >
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-2.5 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors duration-2',
                  isActive
                    ? 'border-cold/40 bg-cold/[0.07] text-cold'
                    : 'border-transparent text-fg-dim hover:border-line hover:text-fg',
                )
              }
            >
              <Icon name={item.icon} size={14} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-2 lg:px-4 lg:py-3">
          <AdminSearch />
        </div>

        <div className="mt-auto hidden border-t border-line p-4 lg:block">
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
            Signed in as
          </span>
          <p className="mt-1 truncate font-mono text-[10px] text-fg-dim">{user.email}</p>
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
              onClick={signOut}
              className="flex h-8 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint hover:border-danger/50 hover:text-danger"
            >
              Sign out
            </button>
          </div>
          <p className="mt-4 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
            <span className="h-1 w-1 bg-success" />
            Content live · 10 s poll
          </p>
        </div>
      </aside>

      <main id="admin-main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <Outlet />
      </main>
    </div>
  )
}
