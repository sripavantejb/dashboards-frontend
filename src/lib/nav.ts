import {
  LayoutDashboard, Table, Users, Kanban, ListTodo, FileText, Archive, Building2, Link2, FolderKanban,
  CheckSquare, CalendarDays, FileStack, TrendingUp, ArrowLeftRight, Receipt, Wallet, Repeat, AlertCircle,
  KeyRound, Activity, BarChart3, Settings, UserCog, Layers, Factory, Gift, Briefcase, Inbox, Sparkles, Mail,
  Store, Phone, Import, Zap, Bell, Newspaper, Images, BookOpen, CalendarRange, Umbrella, ScrollText, UserPlus, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  permission: string | string[];
  roles?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:read' },
      { name: 'Notifications', href: '/notifications', icon: Bell, permission: 'notifications:read' },
    ],
  },
  {
    title: 'Sales team (BDA)',
    items: [
      { name: 'BDA settings', href: '/bda-settings', icon: UserPlus, permission: 'users:write' },
      { name: 'BDA logins', href: '/employees', icon: UserCog, permission: 'users:write' },
      { name: 'BDA team & access', href: '/sales-crm/team', icon: Users, permission: 'sales_crm:write' },
      { name: 'BDA activity', href: '/dashboard#sales-team-bda', icon: Activity, permission: 'sales_crm:read' },
      { name: 'BDA attendance', href: '/sales-crm/attendance', icon: CalendarDays, permission: 'sales_crm:read' },
      { name: 'Sales CRM', href: '/sales-crm', icon: Store, permission: 'sales_crm:read' },
    ],
  },
  {
    title: 'Tracker',
    items: [{ name: 'Master Tracker', href: '/tracker', icon: Table, permission: 'tracker:write' }],
  },
  {
    title: 'Editco internal clients',
    items: [
      { name: 'Leads', href: '/crm', icon: Users, permission: 'leads:read' },
      { name: 'Pipeline', href: '/pipeline', icon: Kanban, permission: 'leads:read' },
      { name: 'Cold Calling', href: '/calling', icon: Phone, permission: 'calls:read' },
      { name: 'Follow-ups', href: '/follow-ups', icon: ListTodo, permission: 'followups:read' },
      { name: 'Proposals', href: '/proposals', icon: FileText, permission: 'proposals:read' },
      { name: 'Projects Vault', href: '/projects-vault', icon: Archive, permission: 'vault:read' },
      { name: 'Import Center', href: '/import', icon: Import, permission: 'leads:write' },
    ],
  },
  {
    title: 'Clients',
    items: [{ name: 'Clients', href: '/clients', icon: Building2, permission: 'vendors:read' }],
  },
  {
    title: 'Delivery',
    items: [
      { name: 'Conversions', href: '/conversions', icon: Link2, permission: 'conversions:read' },
      { name: 'Projects', href: '/projects', icon: FolderKanban, permission: 'projects:read' },
      { name: 'Tasks', href: '/tasks', icon: CheckSquare, permission: 'tasks:read' },
      { name: 'Meetings', href: '/meetings', icon: CalendarDays, permission: 'meetings:read' },
      { name: 'Documents', href: '/documents', icon: FileStack, permission: 'documents:read' },
      { name: 'Assets', href: '/assets', icon: Images, permission: 'documents:read' },
      { name: 'SOW Templates', href: '/sow-templates', icon: ScrollText, permission: 'documents:read' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { name: 'Revenue', href: '/revenue', icon: TrendingUp, permission: 'finance:read' },
      { name: 'Transactions', href: '/transactions', icon: ArrowLeftRight, permission: 'finance:read' },
      { name: 'Invoices', href: '/invoices', icon: Receipt, permission: 'invoices:read' },
      { name: 'Payments', href: '/payments', icon: Wallet, permission: 'payments:read' },
      { name: 'Recurring payments', href: '/recurring-payments', icon: Repeat, permission: 'payments:read' },
      { name: 'Outstanding', href: '/outstanding', icon: AlertCircle, permission: 'finance:read' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Credentials', href: '/credentials', icon: KeyRound, permission: 'vault:credentials' },
      { name: 'Activity', href: '/activity', icon: Activity, permission: 'activity:read' },
      { name: 'Analytics', href: '/analytics', icon: BarChart3, permission: 'analytics:read' },
      { name: 'Automation', href: '/automation', icon: Zap, permission: 'settings:write' },
      { name: 'Leave', href: '/leave', icon: Umbrella, permission: 'leaves:read' },
      { name: 'Knowledge', href: '/knowledge', icon: BookOpen, permission: 'knowledge:read' },
      { name: 'Content Calendar', href: '/content-calendar', icon: CalendarRange, permission: 'campaigns:read' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { name: 'Refer & Earn', href: '/growth/referrals', icon: Gift, permission: 'growth:read' },
      { name: 'Rewards', href: '/growth/rewards', icon: Wallet, permission: 'growth:read' },
      { name: 'Jobs', href: '/growth/jobs', icon: Briefcase, permission: 'growth:read' },
      { name: 'Applications', href: '/growth/applications', icon: Inbox, permission: 'growth:read' },
      { name: 'EGA', href: '/growth/ega', icon: Sparkles, permission: 'growth:read' },
      { name: 'Newsletter', href: '/growth/newsletter', icon: Mail, permission: 'growth:read' },
      { name: 'Magazine', href: '/growth/magazine', icon: Newspaper, permission: 'growth:read' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { name: 'Users & roles', href: '/employees', icon: UserCog, permission: 'users:write' },
      { name: 'Services', href: '/settings/services', icon: Layers, permission: 'settings:write' },
      { name: 'Industries', href: '/settings/industries', icon: Factory, permission: 'settings:write' },
      { name: 'Settings', href: '/settings', icon: Settings, permission: 'settings:read' },
    ],
  },
];
