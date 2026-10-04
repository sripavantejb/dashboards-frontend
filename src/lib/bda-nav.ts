import {
  LayoutDashboard, Users, Kanban, Building2, Phone, Smartphone, CalendarDays, ListTodo,
  FileText, CheckSquare, Target, Trophy, ClipboardList, MessageSquare,
  Clock, BarChart3, Bell, type LucideIcon,
} from 'lucide-react';

export interface BdaNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  module?: string;
  /** Show when any of these modules are on */
  anyModules?: string[];
}

export interface BdaNavSection {
  title: string;
  items: BdaNavItem[];
}

/** LeadSquared-style BDA sidebar — admin-only surfaces omitted. */
export const BDA_NAV_SECTIONS: BdaNavSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'My Day', href: '/bda', icon: LayoutDashboard },
      { name: 'Dashboard', href: '/bda/dashboard', icon: BarChart3, module: 'dashboard.sales' },
      { name: 'Notifications', href: '/bda/notifications', icon: Bell },
    ],
  },
  {
    title: 'Pipeline',
    items: [
      { name: 'Leads', href: '/bda/leads', icon: Users, module: 'leads.management' },
      { name: 'Deals', href: '/bda/deals', icon: Kanban, module: 'sales.deals' },
      { name: 'Customers', href: '/bda/customers', icon: Building2, module: 'customers.management' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { name: 'Calls', href: '/bda/calls', icon: Phone, module: 'comm.calls' },
      { name: 'Link phone', href: '/bda/phone', icon: Smartphone, module: 'comm.calls' },
      { name: 'Meetings', href: '/bda/meetings', icon: CalendarDays, module: 'comm.meetings' },
      { name: 'Follow-ups', href: '/bda/follow-ups', icon: ListTodo, module: 'comm.followups' },
      { name: 'Email / WhatsApp', href: '/bda/messages', icon: MessageSquare, module: 'comm.email_whatsapp' },
    ],
  },
  {
    title: 'Documents',
    items: [
      { name: 'Quotations', href: '/bda/quotations', icon: FileText, module: 'docs.quotations' },
      { name: 'Proposals', href: '/bda/proposals', icon: FileText, module: 'docs.proposals' },
    ],
  },
  {
    title: 'Work',
    items: [
      { name: 'Tasks', href: '/bda/tasks', icon: CheckSquare, module: 'tasks.management' },
      { name: 'Calendar', href: '/bda/calendar', icon: CalendarDays, module: 'tasks.calendar' },
      { name: 'Approvals', href: '/bda/approvals', icon: ClipboardList, module: 'admin.approvals' },
    ],
  },
  {
    title: 'Performance',
    items: [
      { name: 'Targets', href: '/bda/targets', icon: Target, module: 'perf.targets' },
      { name: 'Performance', href: '/bda/performance', icon: BarChart3, anyModules: ['perf.performance', 'perf.productivity', 'sales.forecast'] },
      { name: 'Leaderboard', href: '/bda/leaderboard', icon: Trophy, module: 'perf.leaderboard' },
      { name: 'Work status', href: '/bda/work-status', icon: ClipboardList, module: 'perf.daily_work_status' },
      { name: 'Attendance', href: '/bda/attendance', icon: Clock, module: 'workforce.attendance_sync' },
    ],
  },
];

export function bdaItemVisible(item: BdaNavItem, modules: Record<string, boolean>) {
  if (item.anyModules?.length) return item.anyModules.some((k) => modules[k]);
  if (item.module) return Boolean(modules[item.module]);
  return true;
}
