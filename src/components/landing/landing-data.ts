import {
  Users, Kanban, Phone, CalendarClock, FileCheck, Import,
  CheckSquare, FolderKanban, DollarSign, BarChart3, FileText,
  Zap, Shield, Building2, Table2, UserCog, Bell, LayoutDashboard,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const stats = [
  { value: '17+', label: 'Integrated modules' },
  { value: 'Multi-tenant', label: 'Organization isolation' },
  { value: 'Real-time', label: 'Analytics & KPIs' },
  { value: 'RBAC', label: 'Role-based permissions' },
];

export const overviewFeatures = [
  {
    title: 'CRM & Lead Management',
    description: 'Centralize leads, companies, and contacts with full activity history and smart segmentation.',
    icon: Users,
  },
  {
    title: 'Visual Sales Pipeline',
    description: 'Drag-and-drop Kanban boards to track every deal from first contact to closed-won.',
    icon: Kanban,
  },
  {
    title: 'Cold Calling Suite',
    description: 'Log calls, track daily outreach metrics, and measure team performance in real time.',
    icon: Phone,
  },
  {
    title: 'Follow-ups & Proposals',
    description: 'Never miss a touchpoint. Schedule follow-ups and send professional proposals from one place.',
    icon: CalendarClock,
  },
  {
    title: 'Import Center',
    description: 'Bulk import leads via CSV upload, paste, or manual entry with full job tracking.',
    icon: Import,
  },
  {
    title: 'Lead Table & Views',
    description: 'Spreadsheet-style lead table with inline editing, bulk actions, and saved custom views.',
    icon: Table2,
  },
  {
    title: 'Tasks & Projects',
    description: 'Assign work, track milestones, and keep delivery teams aligned across every client.',
    icon: CheckSquare,
  },
  {
    title: 'Finance & Billing',
    description: 'Manage invoices, track expenses, and monitor cash flow without switching tools.',
    icon: DollarSign,
  },
];

export interface DetailedFeature {
  id: string;
  badge: string;
  title: string;
  description: string;
  icon: LucideIcon;
  highlights: string[];
  metrics?: { label: string; value: string }[];
}

export const detailedFeatures: DetailedFeature[] = [
  {
    id: 'crm',
    badge: 'Sales & CRM',
    title: 'Complete CRM built for agency sales teams',
    description:
      'Agency ERP gives your sales team a unified workspace to capture, qualify, and nurture leads. From individual contact records to company hierarchies, every interaction is logged and searchable — so nothing falls through the cracks.',
    icon: Users,
    highlights: [
      'Lead, company, and contact management with rich profiles',
      'Dynamic lead categories and segmented lead lists',
      'Full activity timeline on every record',
      'Inline-editable lead table with bulk update actions',
      'Saved views for repeatable list filters and columns',
      'CSV import with job tracking and error reporting',
    ],
    metrics: [
      { label: 'Lead sources', value: 'CSV · Manual · Bulk' },
      { label: 'Views', value: 'Custom saved' },
    ],
  },
  {
    id: 'pipeline',
    badge: 'Pipeline & Outreach',
    title: 'Move deals forward with visual pipeline and outreach tools',
    description:
      'See your entire sales funnel at a glance. Drag deals between stages, log cold calls with daily stats, schedule follow-ups, and send proposals — all without leaving the platform. Built for high-velocity agency sales.',
    icon: Kanban,
    highlights: [
      'Kanban pipeline with customizable deal stages',
      'Cold calling module with call logging and daily analytics',
      'Follow-up scheduler with upcoming and missed views',
      'Proposal creation, tracking, and status management',
      'Lead lists for targeted outreach campaigns',
      'Import center for rapid list building at scale',
    ],
    metrics: [
      { label: 'Pipeline view', value: 'Kanban' },
      { label: 'Call tracking', value: 'Daily stats' },
    ],
  },
  {
    id: 'operations',
    badge: 'Operations',
    title: 'Run delivery and internal ops from one command center',
    description:
      'Once deals close, keep projects on track. Assign tasks, manage project timelines, coordinate your team, and automate repetitive workflows — so your agency delivers consistently without operational chaos.',
    icon: FolderKanban,
    highlights: [
      'Task management with assignment and status tracking',
      'Project CRUD with team visibility across clients',
      'Employee and user management with role assignments',
      'Automation rules for repetitive workflow triggers',
      'In-app notifications for critical updates',
      'Activity tracking and session monitoring',
    ],
    metrics: [
      { label: 'Team roles', value: 'Admin · Sales · Finance' },
      { label: 'Automation', value: 'Rule-based' },
    ],
  },
  {
    id: 'finance',
    badge: 'Finance & Analytics',
    title: 'Financial visibility and executive analytics for agency leaders',
    description:
      'Agency ERP surfaces the numbers that matter. Track revenue, monitor invoices and expenses, and access executive dashboards with real-time KPIs — giving leadership the clarity to make confident decisions.',
    icon: BarChart3,
    highlights: [
      'Executive dashboard with revenue, leads, and cash flow KPIs',
      'Interactive charts: revenue trends, lead generation, pipeline breakdown',
      'Invoice management with status tracking',
      'Expense logging and categorization',
      'Marketing analytics derived from platform data',
      'Export-ready reports for leadership reviews',
    ],
    metrics: [
      { label: 'Dashboard KPIs', value: '8+ metrics' },
      { label: 'Charts', value: 'Revenue · Leads · Pipeline' },
    ],
  },
  {
    id: 'platform',
    badge: 'Platform & Security',
    title: 'Enterprise-grade multi-tenant platform architecture',
    description:
      'Built as a true SaaS from the ground up. Each agency organization gets isolated data, configurable access controls, and a dedicated admin experience — with a separate super-admin console for platform operators.',
    icon: Shield,
    highlights: [
      'Multi-tenant organization isolation with dedicated workspaces',
      'JWT authentication with refresh tokens and secure httpOnly cookies',
      'Granular role-based access control across all modules',
      'Organization registration with invite-only mode support',
      'Super-admin panel for tenant and platform management',
      'Audit logs, activity tracking, and session heartbeat monitoring',
    ],
    metrics: [
      { label: 'Auth', value: 'JWT + RBAC' },
      { label: 'Tenants', value: 'Fully isolated' },
    ],
  },
];

export const workflowSteps = [
  {
    step: '01',
    title: 'Register your agency',
    description: 'Create your organization workspace in minutes. Invite your team or start solo — your data is isolated from day one.',
    icon: Building2,
  },
  {
    step: '02',
    title: 'Import and organize leads',
    description: 'Upload CSVs, paste bulk data, or add leads manually. Segment them into categories and custom lead lists for targeted outreach.',
    icon: Import,
  },
  {
    step: '03',
    title: 'Sell and deliver',
    description: 'Move deals through your pipeline, log calls, send proposals, and assign tasks — all tracked in one unified timeline.',
    icon: Kanban,
  },
  {
    step: '04',
    title: 'Measure and grow',
    description: 'Monitor KPIs on the executive dashboard, track finances, and use reports to optimize your agency performance.',
    icon: LayoutDashboard,
  },
];

export const platformCapabilities = [
  { icon: Shield, title: 'Secure by design', description: 'JWT auth, bcrypt hashing, rate limiting, and Helmet security headers on every request.' },
  { icon: UserCog, title: 'Team permissions', description: 'Assign roles like Admin, Manager, Sales, and Finance with module-level access control.' },
  { icon: Bell, title: 'Live notifications', description: 'In-app notification center keeps your team informed on leads, tasks, and follow-ups.' },
  { icon: Zap, title: 'Workflow automation', description: 'Define automation rules to eliminate repetitive manual work across your sales process.' },
  { icon: FileText, title: 'Audit & compliance', description: 'Platform audit logs and activity tracking for full operational transparency.' },
  { icon: Building2, title: 'Multi-org SaaS', description: 'Super-admin console to manage tenants, invites, and platform-wide settings.' },
];

export const footerLinks = {
  product: [
    { label: 'CRM & Leads', href: '#crm' },
    { label: 'Sales Pipeline', href: '#pipeline' },
    { label: 'Finance', href: '#finance' },
    { label: 'Analytics', href: '#finance' },
  ],
  platform: [
    { label: 'Multi-tenant', href: '#platform' },
    { label: 'Security', href: '#platform' },
    { label: 'Automation', href: '#operations' },
  ],
  company: [
    { label: 'EditcoMedia', href: 'https://edicomedia.com', external: true },
    { label: 'Request access', href: '#request-access' },
    { label: 'Sign in', href: '/login' },
  ],
};
