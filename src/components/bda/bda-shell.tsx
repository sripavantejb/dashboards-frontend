import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, LogOut, Menu, X, Bell } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore, useUIStore } from '@/stores/auth';
import { CompanyMark } from '@/components/company/company-mark';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BDA_NAV_SECTIONS, bdaHref, bdaItemVisible } from '@/lib/bda-nav';
import { ActivityTracker } from '@/components/shared/activity-tracker';
import { AnimatedPage } from '@/components/shared/motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StickyAlerts } from '@/components/notifications/sticky-alerts';
import { CheckoutModal } from '@/components/sales/checkout-modal';

interface BdaShellProps {
  children: React.ReactNode;
  modules: Record<string, boolean>;
  employeeCode?: string;
  displayName: string;
  basePath: string;
  orgSlug: string;
}

export function BdaShell({ children, modules, employeeCode, displayName, basePath, orgSlug }: BdaShellProps) {
  const { organization, logout } = useAuthStore();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [signOutAfterCheckout, setSignOutAfterCheckout] = useState(false);
  const orgName = organization?.name || 'Sales';

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sections = useMemo(
    () =>
      BDA_NAV_SECTIONS.map((s) => ({
        ...s,
        items: s.items
          .filter((i) => bdaItemVisible(i, modules))
          .map((i) => ({ ...i, href: bdaHref(orgSlug, i.to) })),
      })).filter((s) => s.items.length > 0),
    [modules, orgSlug]
  );

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 30_000,
  });
  const unread = notifData?.data?.count || 0;

  const attendance = useQuery({
    queryKey: ['sales', '/attendance'],
    queryFn: () => api.data<{ today?: { checkInAt?: string; checkOutAt?: string } | null }>('/sales-crm/attendance'),
    refetchInterval: 60_000,
  });
  const needsCheckout = !attendance.data?.today?.checkOutAt;

  const closeMobile = () => setMobileOpen(false);
  const loginPath = `/${orgSlug}/bda`;

  const finishSignOut = () => {
    logout();
    navigate(loginPath);
  };

  const sidebar = (
    <aside
      className={cn(
        'bda-sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-black/[0.06] transition-[width] duration-300',
        sidebarCollapsed ? 'w-[72px]' : 'w-[var(--sidebar-width)]',
        'max-md:shadow-xl',
        mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full md:translate-x-0'
      )}
    >
      <div className={cn('flex h-[4.25rem] items-center gap-3 border-b border-black/[0.06] px-4', sidebarCollapsed && 'justify-center px-2')}>
        <CompanyMark name={orgName} logo={organization?.logo} className="h-9 w-9 shrink-0 shadow-sm" />
        {!sidebarCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-semibold tracking-tight text-foreground">{orgName}</p>
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">BDA Portal</p>
          </div>
        )}
        <Button variant="ghost" size="icon" className="ml-auto hidden h-8 w-8 md:inline-flex" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300', sidebarCollapsed && 'rotate-180')} />
        </Button>
        <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 md:hidden" onClick={closeMobile}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="flex flex-col gap-5 px-2.5">
          {sections.map((section) => (
            <div key={section.title}>
              {!sidebarCollapsed && (
                <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                  {section.title}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.href === basePath}
                    onClick={closeMobile}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-foreground text-background shadow-sm'
                          : 'text-muted-foreground hover:bg-black/[0.04] hover:text-foreground',
                        sidebarCollapsed && 'justify-center px-2'
                      )
                    }
                    title={item.name}
                  >
                    <item.icon className="h-4 w-4 shrink-0 opacity-90 transition-transform duration-200 group-hover:scale-105" />
                    {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className={cn('border-t border-black/[0.06] p-3', sidebarCollapsed && 'px-2')}>
        <div className={cn('mb-3 flex items-center gap-2.5 rounded-lg bg-black/[0.03] p-2', sidebarCollapsed && 'justify-center bg-transparent p-0')}>
          <Avatar className="h-9 w-9 ring-2 ring-white">
            <AvatarFallback className="bg-foreground text-[11px] font-semibold text-background">{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{displayName}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{employeeCode || 'BDA'}</p>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className={cn('w-full border-black/10 bg-white/70 hover:bg-white', sidebarCollapsed && 'px-0')}
          onClick={() => {
            if (needsCheckout) {
              setSignOutAfterCheckout(true);
              setCheckoutOpen(true);
              return;
            }
            finishSignOut();
          }}
        >
          <LogOut className="h-4 w-4" />
          {!sidebarCollapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="bda-portal min-h-screen">
      <ActivityTracker />
      <StickyAlerts orgSlug={orgSlug} />
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[3px] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>
      {sidebar}

      <header
        className={cn(
          'bda-topbar fixed top-0 right-0 z-30 flex h-[4.25rem] items-center gap-3 px-4 sm:px-6',
          'left-0 md:transition-[left]',
          sidebarCollapsed ? 'md:left-[72px]' : 'md:left-[var(--sidebar-width)]'
        )}
      >
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 items-center gap-3">
          <CompanyMark name={orgName} logo={organization?.logo} className="hidden h-9 w-9 border shadow-sm sm:flex" />
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold tracking-tight sm:text-lg">{orgName}</p>
            <p className="truncate text-xs text-muted-foreground">BDA workspace · leads, deals, and follow-ups</p>
          </div>
        </div>
        <Link
          to={`${basePath}/notifications`}
          className="relative ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg border border-black/[0.06] bg-white/70 text-muted-foreground shadow-sm backdrop-blur transition hover:border-black/10 hover:bg-white hover:text-foreground"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-error px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
      </header>

      <motion.main
        layout
        className={cn(
          'min-h-screen pt-[4.25rem] transition-[padding] duration-300 ease-out',
          sidebarCollapsed ? 'md:pl-[72px]' : 'md:pl-[var(--sidebar-width)]'
        )}
        transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedPage>{children}</AnimatedPage>
        </div>
      </motion.main>
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => {
          setCheckoutOpen(false);
          setSignOutAfterCheckout(false);
        }}
        onDone={() => {
          if (signOutAfterCheckout) finishSignOut();
        }}
      />
    </div>
  );
}
