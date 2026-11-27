import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { AdminRolesPanel } from '@/admin/AdminRolesPanel'
import { AdminPageHeader } from '@/admin/ui'

const tabs = [
  { label: 'Directory', to: '/admin/team', end: true },
  { label: 'Salary structures', to: '/admin/team/salary' },
  { label: 'Payroll & payslips', to: '/admin/team/payroll' },
  { label: 'Attendance', to: '/admin/team/attendance' },
  { label: 'Leave & advances', to: '/admin/team/leave' },
  { label: 'Payroll settings', to: '/admin/team/settings' },
  { label: 'Roles & access', to: '/admin/team/roles' },
]

export function AdminTeam() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="People"
        title="Team, salaries and attendance."
        description="One register for the crew, their pay structures, daily attendance, leave, advances and monthly payslips. Every calc uses the same settings and totals the API stores."
      />

      <nav
        aria-label="Team sections"
        className="flex flex-wrap items-center gap-1 border-b border-line"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'border-b-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors',
                isActive
                  ? 'border-cold text-cold'
                  : 'border-transparent text-fg-faint hover:text-fg',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}

export function AdminTeamRoles() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="t-h4 text-fg">Roles and access</h2>
        <p className="mt-1 text-[13px] text-fg-dim">
          Which staff accounts can read the register, run payroll, pay salaries and export records.
        </p>
      </div>
      <AdminRolesPanel />
    </div>
  )
}
