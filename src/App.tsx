import { Navigate, Route, Routes, useLocation } from 'react-router';
import { ADMIN_LOGIN_PATH, DEFAULT_ADMIN_LOGIN_PATH, PLATFORM_ADMIN_PATH } from '@/lib/admin-routes';
import DashboardLayout from '@/layouts/dashboard-layout';
import BdaLayout from '@/layouts/bda-layout';
import AdminLayout from '@/layouts/admin-layout';
import HomePage from '@/pages/home/page';
import LoginPage from '@/pages/login/page';
import RegisterPage from '@/pages/register/page';
import SuperAdminPage from '@/pages/super-admin/page';
import AutomationPage from '@/pages/automation/page';
import CallingPage from '@/pages/calling/page';
import CrmPage from '@/pages/crm/page';
import CrmNewPage from '@/pages/crm/new/page';
import CrmDetailPage from '@/pages/crm/detail/page';
import EmployeesPage from '@/pages/employees/page';
import FollowUpsPage from '@/pages/follow-ups/page';
import ImportPage from '@/pages/import/page';
import LeadListsPage from '@/pages/lead-lists/page';
import LeadListDetailPage from '@/pages/lead-lists/detail/page';
import LeadTablePage from '@/pages/lead-table/page';
import MarketingPage from '@/pages/marketing/page';
import NotificationsPage from '@/pages/notifications/page';
import PipelinePage from '@/pages/pipeline/page';
import ProposalsPage from '@/pages/proposals/page';
import ReportsPage from '@/pages/reports/page';
import SettingsPage from '@/pages/settings/page';
import ProfileSettingsPage from '@/pages/settings/profile/page';
import AdminPage from '@/pages/admin/page';
import AdminAccessRequestsPage from '@/pages/admin/access-requests/page';
import AdminActivityPage from '@/pages/admin/activity/page';
import AdminAdminsPage from '@/pages/admin/admins/page';
import AdminOrganizationsPage from '@/pages/admin/organizations/page';
import AdminOrganizationDetailPage from '@/pages/admin/organizations/detail/page';
import AdminSettingsPage from '@/pages/admin/settings/page';
import OsDashboardPage from '@/pages/os/dashboard';
import { ClientDetailPage, ClientsPage, ConversionHubPage, ConversionsPage } from '@/pages/os/clients';
import { DocumentsPage, MeetingsPage, ProjectWorkspacePage, ProjectsPage, TaskDetailPage, TasksPage } from '@/pages/os/delivery';
import { InvoiceEditorPage, InvoicesPage, OutstandingPage, PaymentsPage, RecurringPaymentsPage, RevenuePage, TransactionsPage } from '@/pages/os/finance';
import { ActivityPage, AnalyticsPage, CredentialsPage, IndustriesPage, ServicesPage, TrackerPage, VaultDetailPage, VaultPage } from '@/pages/os/operations';
import { ApplicationsPage, EgaPage, JobsPage, MagazinePage, NewsletterPage, ReferralsPage, RewardsPage } from '@/pages/os/growth';
import { AssetsPage, ContentCalendarPage, KnowledgePage, LeavePage, SowPage } from '@/pages/os/agency';
import { CareerJobPage, CareersPage, EgaApplyPage, MagazineArticlePage, MagazineHomePage, NewsletterSubscribePage, PortalInvoicePage, PortalPage, ReferPage, TrackPage } from '@/pages/os/public';
import {
  SalesAnalyticsPage, SalesApprovalsPage, SalesAttendancePage, SalesCalendarPage, SalesCallsPage, SalesCrmLayout, SalesCustomersPage,
  SalesDashboardPage, SalesDealDetailPage, SalesDealsPage, SalesEmployeeDetailPage, SalesFollowUpsPage, SalesLeadDetailPage, SalesLeadsPage,
  SalesLeaderboardPage, SalesMeetingsPage, SalesMessagesPage, SalesMyDayPage, SalesPerformancePage, SalesProposalsPage, SalesQuotationsPage, SalesTargetsPage, SalesTasksPage,
  SalesTeamPage, SalesTerritoriesPage, SalesWorkStatusPage,
} from '@/pages/os/sales-crm';
import { SalesPhonePage } from '@/components/sales/phone-companion';

function LegacyAdminRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate to={`${PLATFORM_ADMIN_PATH}${pathname.slice('/admin'.length)}${search}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path={DEFAULT_ADMIN_LOGIN_PATH} element={<SuperAdminPage />} />
      {ADMIN_LOGIN_PATH !== DEFAULT_ADMIN_LOGIN_PATH && (
        <Route path={ADMIN_LOGIN_PATH} element={<SuperAdminPage />} />
      )}
      {/* Old platform admin URLs */}
      <Route path="/super-admin" element={<Navigate to={ADMIN_LOGIN_PATH} replace />} />
      <Route path="/admin/login" element={<Navigate to={ADMIN_LOGIN_PATH} replace />} />
      <Route path="/admin/*" element={<LegacyAdminRedirect />} />
      <Route path="/ops/*" element={<Navigate to="/login" replace />} />

      {/* Public, unauthenticated pages */}
      <Route path="/portal/:slug/:token" element={<PortalPage />} />
      <Route path="/portal/:slug/:token/invoices/:id" element={<PortalInvoicePage />} />
      <Route path="/track/:slug/:code" element={<TrackPage />} />
      <Route path="/careers/:slug" element={<CareersPage />} />
      <Route path="/careers/:slug/:jobSlug" element={<CareerJobPage />} />
      <Route path="/refer/:slug" element={<ReferPage />} />
      <Route path="/ega/:slug" element={<EgaApplyPage />} />
      <Route path="/magazine/:slug" element={<MagazineHomePage />} />
      <Route path="/magazine/:slug/:articleSlug" element={<MagazineArticlePage />} />
      <Route path="/newsletter/:slug" element={<NewsletterSubscribePage />} />

      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<OsDashboardPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/tracker" element={<TrackerPage />} />

        <Route path="/crm" element={<CrmPage />} />
        <Route path="/crm/new" element={<CrmNewPage />} />
        <Route path="/crm/:id" element={<CrmDetailPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/calling" element={<CallingPage />} />
        <Route path="/follow-ups" element={<FollowUpsPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />
        <Route path="/projects-vault" element={<VaultPage />} />
        <Route path="/projects-vault/:id" element={<VaultDetailPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/lead-lists" element={<LeadListsPage />} />
        <Route path="/lead-lists/:id" element={<LeadListDetailPage />} />
        <Route path="/lead-table" element={<LeadTablePage />} />
        <Route path="/marketing" element={<MarketingPage />} />

        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/conversions" element={<ConversionsPage />} />
        <Route path="/conversions/:code" element={<ConversionHubPage />} />

        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectWorkspacePage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/:id" element={<TaskDetailPage />} />
        <Route path="/meetings" element={<MeetingsPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/sow-templates" element={<SowPage />} />
        <Route path="/sows" element={<SowPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/content-calendar" element={<ContentCalendarPage />} />
        <Route path="/leave" element={<LeavePage />} />

        <Route path="/revenue" element={<RevenuePage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/new" element={<InvoiceEditorPage />} />
        <Route path="/invoices/:id" element={<InvoiceEditorPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/recurring-payments" element={<RecurringPaymentsPage />} />
        <Route path="/outstanding" element={<OutstandingPage />} />
        <Route path="/finance" element={<Navigate to="/revenue" replace />} />

        <Route path="/credentials" element={<CredentialsPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/automation" element={<AutomationPage />} />
        <Route path="/reports" element={<ReportsPage />} />

        <Route path="/growth" element={<Navigate to="/growth/referrals" replace />} />
        <Route path="/growth/referrals" element={<ReferralsPage />} />
        <Route path="/growth/rewards" element={<RewardsPage />} />
        <Route path="/growth/jobs" element={<JobsPage />} />
        <Route path="/growth/applications" element={<ApplicationsPage />} />
        <Route path="/growth/ega" element={<EgaPage />} />
        <Route path="/growth/newsletter" element={<NewsletterPage />} />
        <Route path="/growth/magazine" element={<MagazinePage />} />

        <Route path="/sales-crm" element={<SalesCrmLayout />}>
          <Route index element={<SalesDashboardPage />} />
          <Route path="leads" element={<SalesLeadsPage />} />
          <Route path="leads/:id" element={<SalesLeadDetailPage />} />
          <Route path="phone" element={<SalesPhonePage />} />
          <Route path="deals" element={<SalesDealsPage />} />
          <Route path="deals/:id" element={<SalesDealDetailPage />} />
          <Route path="customers" element={<SalesCustomersPage />} />
          <Route path="calls" element={<SalesCallsPage />} />
          <Route path="meetings" element={<SalesMeetingsPage />} />
          <Route path="follow-ups" element={<SalesFollowUpsPage />} />
          <Route path="messages" element={<SalesMessagesPage />} />
          <Route path="quotations" element={<SalesQuotationsPage />} />
          <Route path="proposals" element={<SalesProposalsPage />} />
          <Route path="tasks" element={<SalesTasksPage />} />
          <Route path="calendar" element={<SalesCalendarPage />} />
          <Route path="approvals" element={<SalesApprovalsPage />} />
          <Route path="attendance" element={<SalesAttendancePage />} />
          <Route path="work-status" element={<SalesWorkStatusPage />} />
          <Route path="targets" element={<SalesTargetsPage />} />
          <Route path="territories" element={<SalesTerritoriesPage />} />
          <Route path="performance" element={<SalesPerformancePage />} />
          <Route path="leaderboard" element={<SalesLeaderboardPage />} />
          <Route path="analytics" element={<SalesAnalyticsPage />} />
          <Route path="team" element={<SalesTeamPage />} />
          <Route path="team/:id" element={<SalesEmployeeDetailPage />} />
        </Route>

        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/profile" element={<ProfileSettingsPage />} />
        <Route path="/settings/services" element={<ServicesPage />} />
        <Route path="/settings/industries" element={<IndustriesPage />} />
      </Route>

      <Route path="/bda" element={<BdaLayout />}>
        <Route element={<SalesCrmLayout basePath="/bda" />}>
          <Route index element={<SalesMyDayPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="dashboard" element={<SalesDashboardPage />} />
          <Route path="leads" element={<SalesLeadsPage />} />
          <Route path="leads/:id" element={<SalesLeadDetailPage />} />
          <Route path="phone" element={<SalesPhonePage />} />
          <Route path="deals" element={<SalesDealsPage />} />
          <Route path="deals/:id" element={<SalesDealDetailPage />} />
          <Route path="customers" element={<SalesCustomersPage />} />
          <Route path="calls" element={<SalesCallsPage />} />
          <Route path="meetings" element={<SalesMeetingsPage />} />
          <Route path="follow-ups" element={<SalesFollowUpsPage />} />
          <Route path="messages" element={<SalesMessagesPage />} />
          <Route path="quotations" element={<SalesQuotationsPage />} />
          <Route path="proposals" element={<SalesProposalsPage />} />
          <Route path="tasks" element={<SalesTasksPage />} />
          <Route path="calendar" element={<SalesCalendarPage />} />
          <Route path="approvals" element={<SalesApprovalsPage />} />
          <Route path="attendance" element={<SalesAttendancePage />} />
          <Route path="work-status" element={<SalesWorkStatusPage />} />
          <Route path="targets" element={<SalesTargetsPage />} />
          <Route path="performance" element={<SalesPerformancePage />} />
          <Route path="leaderboard" element={<SalesLeaderboardPage />} />
        </Route>
      </Route>

      <Route path={PLATFORM_ADMIN_PATH} element={<AdminLayout />}>
        <Route index element={<AdminPage />} />
        <Route path="access-requests" element={<AdminAccessRequestsPage />} />
        <Route path="activity" element={<AdminActivityPage />} />
        <Route path="admins" element={<AdminAdminsPage />} />
        <Route path="organizations" element={<AdminOrganizationsPage />} />
        <Route path="organizations/:id" element={<AdminOrganizationDetailPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
