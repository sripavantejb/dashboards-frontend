import { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuthStore, useUIStore } from '@/stores/auth';
import { Sidebar } from './sidebar';
import { TopNavbar } from './top-navbar';
import { AnimatedPage } from '@/components/shared/motion';
import { ActivityTracker } from '@/components/shared/activity-tracker';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const { sidebarCollapsed, sidebarOpen, setSidebarOpen } = useUIStore();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [hasHydrated, isAuthenticated, navigate]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <ActivityTracker />
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
      <Sidebar />
      <TopNavbar />
      <motion.main
        layout
        className={cn(
          'min-h-screen pt-16 transition-[padding] duration-300 ease-out',
          'pl-0 md:transition-[padding]',
          sidebarCollapsed ? 'md:pl-[68px]' : 'md:pl-[var(--sidebar-width)]'
        )}
        transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedPage>{children}</AnimatedPage>
        </div>
      </motion.main>
    </div>
  );
}
