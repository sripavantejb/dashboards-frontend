import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUIStore, useAuthStore } from '@/stores/auth';
import { CompanyMark } from '@/components/company/company-mark';
import { PLATFORM_ADMIN_PATH } from '@/lib/admin-routes';
import { ChevronLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link, useLocation } from 'react-router';
import { NAV_SECTIONS } from '@/lib/nav';
import { hasAny } from '@/lib/permissions';

export function Sidebar() {
  const { pathname } = useLocation();
  const { user, organization } = useAuthStore();
  const { sidebarCollapsed, setSidebarCollapsed, sidebarOpen, setSidebarOpen } = useUIStore();
  const reduceMotion = useReducedMotion();

  const sections = useMemo(() => {
    const perms = user?.role === 'super_admin' ? ['*'] : user?.permissions;
    return NAV_SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter(
        (i) => hasAny(perms, Array.isArray(i.permission) ? i.permission : [i.permission]) || (user?.role && i.roles?.includes(user.role))
      ),
    })).filter((s) => s.items.length > 0);
  }, [user]);

  const handleNavClick = () => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const isActive = (href: string) =>
    pathname === href || (pathname.startsWith(href + '/') && !(href === '/settings' && pathname.startsWith('/settings/')));

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
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2" onClick={handleNavClick}>
            <CompanyMark name={organization?.name} logo={organization?.logo} />
            <span className="truncate font-display text-base font-semibold tracking-tight">{organization?.name || 'Editco'}</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden h-8 w-8 md:flex"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300 ease-out', sidebarCollapsed && 'rotate-180')} />
        </Button>
      </div>

      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-4 px-2">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-0.5">
              {!sidebarCollapsed ? (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{section.title}</p>
              ) : (
                <div className="mx-3 mb-1 border-t" />
              )}
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-out',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-surface-soft hover:text-foreground hover:translate-x-0.5'
                    )}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
          {user?.role === 'super_admin' && (
            <Link
              to={PLATFORM_ADMIN_PATH}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 rounded-md border border-dashed px-3 py-2 text-sm font-medium transition-all duration-200 ease-out',
                pathname.startsWith(PLATFORM_ADMIN_PATH)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface-soft hover:text-foreground'
              )}
              title={sidebarCollapsed ? 'Platform admin' : undefined}
            >
              <Shield className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>Platform admin</span>}
            </Link>
          )}
        </nav>
      </ScrollArea>
    </motion.aside>
  );
}
