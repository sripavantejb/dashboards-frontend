'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import { ADMIN_LOGIN_PATH } from '@/lib/admin-routes';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Building2, Shield, Activity, ArrowLeft, LogOut, Settings, Inbox,
} from 'lucide-react';
import { AnimatedPage } from '@/components/shared/motion';

const adminNav = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Access Requests', href: '/admin/access-requests', icon: Inbox },
  { name: 'Companies', href: '/admin/organizations', icon: Building2 },
  { name: 'Platform Admins', href: '/admin/admins', icon: Shield },
  { name: 'Activity', href: '/admin/activity', icon: Activity },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(ADMIN_LOGIN_PATH);
      return;
    }
    if (user?.role !== 'super_admin') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'super_admin') return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b bg-background flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5" />
          <span className="font-display font-semibold">Agency ERP Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> ERP App
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => { logout(); router.push(ADMIN_LOGIN_PATH); }}>
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <div className="flex pt-16">
        <aside className="hidden md:flex w-[260px] shrink-0 flex-col border-r min-h-[calc(100vh-4rem)] py-4">
          <nav className="space-y-1 px-3">
            {adminNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-out',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-surface-soft hover:text-foreground hover:translate-x-0.5'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 pb-24 md:pb-0">
          <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <AnimatedPage>{children}</AnimatedPage>
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background flex justify-around py-2 z-50">
        {adminNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1 text-[10px]',
              pathname === item.href ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name.split(' ')[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
