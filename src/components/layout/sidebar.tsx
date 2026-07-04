'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUIStore, useAuthStore } from '@/stores/auth';
import {
  LayoutDashboard, Users, Kanban, CheckSquare, FolderKanban,
  DollarSign, BarChart3, Settings, ChevronLeft, Building2,
  Import, Phone, FileText, Zap, UserCog, Table2, CalendarClock, FileCheck, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { staggerContainer, staggerItem } from '@/lib/motion';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'CRM', href: '/crm', icon: Users },
  { name: 'Lead Table', href: '/lead-table', icon: Table2 },
  { name: 'Lead Lists', href: '/lead-lists', icon: Building2 },
  { name: 'Pipeline', href: '/pipeline', icon: Kanban },
  { name: 'Import Center', href: '/import', icon: Import },
  { name: 'Cold Calling', href: '/calling', icon: Phone },
  { name: 'Follow-ups', href: '/follow-ups', icon: CalendarClock },
  { name: 'Proposals', href: '/proposals', icon: FileCheck },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Finance', href: '/finance', icon: DollarSign },
  { name: 'Marketing', href: '/marketing', icon: BarChart3 },
  { name: 'Employees', href: '/employees', icon: UserCog },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Automation', href: '/automation', icon: Zap },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { sidebarCollapsed, setSidebarCollapsed, sidebarOpen, setSidebarOpen } = useUIStore();
  const reduceMotion = useReducedMotion();

  const handleNavClick = () => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <motion.aside
      className={cn(
        'fixed left-0 top-0 z-50 flex h-screen flex-col border-r bg-background transition-transform duration-300 ease-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'md:translate-x-0'
      )}
      animate={{ width: sidebarCollapsed ? 68 : 260 }}
      transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="font-display text-lg font-semibold tracking-tight" onClick={handleNavClick}>
            Agency ERP
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex h-8 w-8"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300 ease-out', sidebarCollapsed && 'rotate-180')} />
        </Button>
      </div>

      <ScrollArea className="flex-1 py-4">
        <motion.nav
          className="space-y-1 px-2"
          variants={reduceMotion ? undefined : staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <motion.div key={item.href} variants={reduceMotion ? undefined : staggerItem}>
                <Link
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-out',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-surface-soft hover:text-foreground hover:translate-x-0.5'
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              </motion.div>
            );
          })}
          {user?.role === 'super_admin' && (
            <motion.div variants={reduceMotion ? undefined : staggerItem}>
              <Link
                href="/admin"
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-out mt-2 border border-dashed',
                  pathname.startsWith('/admin')
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-muted-foreground hover:bg-surface-soft hover:text-foreground'
                )}
                title={sidebarCollapsed ? 'Admin Panel' : undefined}
              >
                <Shield className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>Admin Panel</span>}
              </Link>
            </motion.div>
          )}
        </motion.nav>
      </ScrollArea>
    </motion.aside>
  );
}
