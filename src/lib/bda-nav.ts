import {
  LayoutDashboard, Users, Kanban, Building2, Phone, Smartphone, CalendarDays, ListTodo,
  FileText, CheckSquare, Target, Trophy, ClipboardList, MessageSquare,
  Clock, BarChart3, Bell, Umbrella, type LucideIcon,
} from 'lucide-react';
import { bdaBasePath } from '@/lib/bda-path';

export interface BdaNavItem {
  name: string;
  /** Path segment after the company BDA base (empty = home). */
  to: string;
  icon: LucideIcon;
  module?: string;
  /** Show when any of these modules are on */
  anyModules?: string[];
}

export interface BdaNavSection {
  title: string;
  items: BdaNavItem[];
}

/** LeadSquared-style BDA sidebar — admin-only surfaces omitted. Paths are relative to `/{slug}/bda`. */
export const BDA_NAV_SECTIONS: BdaNavSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'My Day', to: '', icon: LayoutDashboard },
      { name: 'Dashboard', to: 'dashboard', icon: BarChart3, module: 'dashboard.sales' },
      { name: 'Notifications', to: 'notifications', icon: Bell },
    ],
  },
  {
    title: 'Pipeline',
    items: [
      { name: 'Leads', to: 'leads', icon: Users, module: 'leads.management' },
      { name: 'Deals', to: 'deals', icon: Kanban, module: 'sales.deals' },
      { name: 'Customers', to: 'customers', icon: Building2, module: 'customers.management' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { name: 'Calls', to: 'calls', icon: Phone, module: 'comm.calls' },
      { name: 'Link phone', to: 'phone', icon: Smartphone, module: 'comm.calls' },
      { name: 'Meetings', to: 'meetings', icon: CalendarDays, module: 'comm.meetings' },
      { name: 'Follow-ups', to: 'follow-ups', icon: ListTodo, module: 'comm.followups' },
      { name: 'Email / WhatsApp', to: 'messages', icon: MessageSquare, module: 'comm.email_whatsapp' },
    ],
  },
  {
    title: 'Documents',
    items: [
      { name: 'Quotations', to: 'quotations', icon: FileText, module: 'docs.quotations' },
      { name: 'Proposals', to: 'proposals', icon: FileText, module: 'docs.proposals' },
    ],
  },
  {
    title: 'Work',
    items: [
      { name: 'Tasks', to: 'tasks', icon: CheckSquare, module: 'tasks.management' },
      { name: 'Calendar', to: 'calendar', icon: CalendarDays, module: 'tasks.calendar' },
      { name: 'Approvals', to: 'approvals', icon: ClipboardList, module: 'admin.approvals' },
    ],
  },
  {
    title: 'Performance',
    items: [
      { name: 'Targets', to: 'targets', icon: Target, module: 'perf.targets' },
      { name: 'Performance', to: 'performance', icon: BarChart3, anyModules: ['perf.performance', 'perf.productivity', 'sales.forecast'] },
      { name: 'Leaderboard', to: 'leaderboard', icon: Trophy, module: 'perf.leaderboard' },
      { name: 'Work status', to: 'work-status', icon: ClipboardList, module: 'perf.daily_work_status' },
      { name: 'Attendance', to: 'attendance', icon: Clock },
      { name: 'Leave', to: 'leave', icon: Umbrella },
    ],
  },
];

export function bdaItemVisible(item: BdaNavItem, modules: Record<string, boolean>) {
  if (item.anyModules?.length) return item.anyModules.some((k) => modules[k]);
  if (item.module) return Boolean(modules[item.module]);
  return true;
}

export function bdaHref(orgSlug: string | undefined | null, to = '') {
  const base = bdaBasePath(orgSlug);
  return to ? `${base}/${to}` : base;
}
