import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ScrollProgress, useSmoothScroll } from '@/motion'
import { ThemeSwitcher } from '@/theme/ThemeSwitcher'
import { SiteLayout } from '@/components/site/SiteLayout'
import { useRouteScroll } from '@/lib/useRouteScroll'
import { About } from '@/routes/About'
import { AmcPage } from '@/routes/AmcPage'
import { Blog } from '@/routes/Blog'
import { BlogPost } from '@/routes/BlogPost'
import { BookPage } from '@/routes/BookPage'
import { Contact } from '@/routes/Contact'
import { Home } from '@/routes/Home'
import { LegalPage } from '@/routes/LegalPage'
import { NotFound } from '@/routes/NotFound'
import { ProcessPage } from '@/routes/ProcessPage'
import { Products } from '@/routes/Products'
import { QuotePage } from '@/routes/QuotePage'
import { ServiceDetailPage } from '@/routes/ServiceDetailPage'
import { Services } from '@/routes/Services'
import { ToolsPage } from '@/routes/ToolsPage'
import { ToolDetailPage } from '@/routes/ToolDetailPage'
import { WorkPage } from '@/routes/WorkPage'
import { Styleguide } from '@/routes/Styleguide'
import { PortalPage } from '@/portal/PortalPage'

const AdminLayout = lazy(() =>
  import('@/admin/AdminLayout').then((module) => ({ default: module.AdminLayout })),
)
const AdminOverview = lazy(() =>
  import('@/admin/AdminOverview').then((module) => ({ default: module.AdminOverview })),
)
const AdminNotifications = lazy(() =>
  import('@/admin/AdminNotifications').then((module) => ({
    default: module.AdminNotifications,
  })),
)
const AdminLeads = lazy(() =>
  import('@/admin/AdminLeads').then((module) => ({ default: module.AdminLeads })),
)
const AdminNotificationDetail = lazy(() =>
  import('@/admin/AdminNotificationDetail').then((module) => ({
    default: module.AdminNotificationDetail,
  })),
)
const AdminSearchPage = lazy(() =>
  import('@/admin/AdminSearchPage').then((module) => ({ default: module.AdminSearchPage })),
)
const AdminReminders = lazy(() =>
  import('@/admin/AdminReminders').then((module) => ({ default: module.AdminReminders })),
)
const AdminInvoices = lazy(() =>
  import('@/admin/AdminInvoices').then((module) => ({ default: module.AdminInvoices })),
)
const AdminInvoiceDetail = lazy(() =>
  import('@/admin/AdminInvoiceDetail').then((module) => ({ default: module.AdminInvoiceDetail })),
)
const AdminExpenses = lazy(() =>
  import('@/admin/AdminExpenses').then((module) => ({ default: module.AdminExpenses })),
)
const AdminProfitLoss = lazy(() =>
  import('@/admin/AdminProfitLoss').then((module) => ({ default: module.AdminProfitLoss })),
)
const AdminReports = lazy(() =>
  import('@/admin/AdminReports').then((module) => ({ default: module.AdminReports })),
)
const AdminSales = lazy(() =>
  import('@/admin/AdminSales').then((module) => ({ default: module.AdminSales })),
)
const SalesPortal = lazy(() =>
  import('@/sales/SalesPortal').then((module) => ({ default: module.SalesPortal })),
)
const AdminTeam = lazy(() =>
  import('@/admin/AdminTeam').then((module) => ({ default: module.AdminTeam })),
)
const AdminTeamRoles = lazy(() =>
  import('@/admin/AdminTeam').then((module) => ({ default: module.AdminTeamRoles })),
)
const AdminTeamDirectory = lazy(() =>
  import('@/admin/AdminTeamDirectory').then((module) => ({ default: module.AdminTeamDirectory })),
)
const AdminSalaryStructures = lazy(() =>
  import('@/admin/AdminSalaryStructures').then((module) => ({
    default: module.AdminSalaryStructures,
  })),
)
const AdminPayroll = lazy(() =>
  import('@/admin/AdminPayroll').then((module) => ({ default: module.AdminPayroll })),
)
const AdminAttendance = lazy(() =>
  import('@/admin/AdminAttendance').then((module) => ({ default: module.AdminAttendance })),
)
const AdminTeamLeave = lazy(() =>
  import('@/admin/AdminTeamLeave').then((module) => ({ default: module.AdminTeamLeave })),
)
const AdminPayrollSettings = lazy(() =>
  import('@/admin/AdminPayrollSettings').then((module) => ({
    default: module.AdminPayrollSettings,
  })),
)
const AdminContent = lazy(() =>
  import('@/admin/AdminContent').then((module) => ({ default: module.AdminContent })),
)
const ContentStudioV2 = lazy(() =>
  import('@/admin/ContentStudioV2').then((module) => ({ default: module.ContentStudioV2 })),
)
const AdminRevisions = lazy(() =>
  import('@/admin/AdminRevisions').then((module) => ({ default: module.AdminRevisions })),
)
const AdminBlog = lazy(() =>
  import('@/admin/AdminBlog').then((module) => ({ default: module.AdminBlog })),
)
const AdminSettings = lazy(() =>
  import('@/admin/AdminSettings').then((module) => ({ default: module.AdminSettings })),
)
const AdminCustomers = lazy(() =>
  import('@/admin/AdminCustomers').then((module) => ({ default: module.AdminCustomers })),
)
const AdminDispatch = lazy(() =>
  import('@/admin/AdminDispatch').then((module) => ({ default: module.AdminDispatch })),
)
const AdminJobs = lazy(() =>
  import('@/admin/AdminJobs').then((module) => ({ default: module.AdminJobs })),
)
const AdminQuotations = lazy(() =>
  import('@/admin/AdminQuotations').then((module) => ({ default: module.AdminQuotations })),
)
const AdminCustomerFile = lazy(() =>
  import('@/admin/AdminCustomerFile').then((module) => ({ default: module.AdminCustomerFile })),
)
const AdminNewsletters = lazy(() =>
  import('@/admin/AdminNewsletters').then((module) => ({ default: module.AdminNewsletters })),
)
const AdminCoupons = lazy(() =>
  import('@/admin/AdminCoupons').then((module) => ({ default: module.AdminCoupons })),
)

function AdminFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-faint">
        <span className="h-1.5 w-1.5 animate-pulse bg-cold" />
        Opening workspace
      </div>
    </div>
  )
}

export function App() {
  const { pathname } = useLocation()
  // Lenis owns wheel events globally; inside the admin workspace that fights
  // modals, drawers and long text fields. Keep the admin on native scrolling.
  useSmoothScroll(!pathname.startsWith('/admin'))
  useRouteScroll()

  return (
    <>
      <ScrollProgress />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:id" element={<ServiceDetailPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/process" element={<ProcessPage />} />
          <Route path="/work" element={<WorkPage />} />
          <Route path="/amc" element={<AmcPage />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/products" element={<Products />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/book" element={<BookPage />} />
          <Route path="/quote" element={<QuotePage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/tools/:slug" element={<ToolDetailPage />} />
          <Route path="/legal/:slug" element={<LegalPage />} />
          <Route path="/privacy" element={<Navigate to="/legal/privacy" replace />} />
          <Route path="/terms" element={<Navigate to="/legal/terms" replace />} />
          <Route path="/cookies" element={<Navigate to="/legal/cookies" replace />} />
          <Route path="/refund-policy" element={<Navigate to="/legal/refunds" replace />} />
          <Route path="/accessibility" element={<Navigate to="/legal/accessibility" replace />} />
          <Route path="/journal" element={<Navigate to="/blog" replace />} />
          <Route path="/insights" element={<Navigate to="/blog" replace />} />
          <Route path="/systems" element={<Navigate to="/products" replace />} />
          <Route path="/shop" element={<Navigate to="/products" replace />} />
          <Route path="/portfolio" element={<Navigate to="/work" replace />} />
        </Route>
        <Route path="/portal" element={<PortalPage />} />
        <Route
          path="/sales/*"
          element={
            <Suspense fallback={null}>
              <SalesPortal />
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminLayout />
            </Suspense>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="notifications/:notificationId" element={<AdminNotificationDetail />} />
          <Route path="search" element={<AdminSearchPage />} />
          <Route path="leads" element={<AdminLeads />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="customers/:customerId" element={<AdminCustomerFile />} />
          <Route path="dispatch" element={<AdminDispatch />} />
          <Route path="jobs" element={<AdminJobs />} />
          <Route path="newsletters" element={<AdminNewsletters />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="reminders" element={<AdminReminders />} />
          <Route path="invoices" element={<AdminInvoices />} />
          <Route path="invoices/:invoiceId" element={<AdminInvoiceDetail />} />
          <Route path="quotations" element={<AdminQuotations />} />
          <Route path="expenses" element={<AdminExpenses />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="sales" element={<AdminSales />} />
          <Route path="reports/profit-loss" element={<AdminProfitLoss />} />
          <Route path="team" element={<AdminTeam />}>
            <Route index element={<AdminTeamDirectory />} />
            <Route path="salary" element={<AdminSalaryStructures />} />
            <Route path="payroll" element={<AdminPayroll />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route path="leave" element={<AdminTeamLeave />} />
            <Route path="settings" element={<AdminPayrollSettings />} />
            <Route path="roles" element={<AdminTeamRoles />} />
          </Route>
          <Route path="content" element={<ContentStudioV2 />} />
          <Route path="content/classic" element={<AdminContent />} />
          <Route path="content/revisions" element={<AdminRevisions />} />
          <Route path="blog" element={<AdminBlog />} />
          <Route path="blog/:postId" element={<AdminBlog />} />
          <Route path="products" element={<Navigate to="/admin/content" replace />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        {import.meta.env.DEV ? <Route path="/__styleguide" element={<Styleguide />} /> : null}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ThemeSwitcher />
    </>
  )
}
