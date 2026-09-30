import {
  LayoutDashboard, Users, Kanban, DollarSign, TrendingUp, Target,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { scrollScaleIn, scrollViewport } from '@/lib/motion';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: Users, label: 'CRM' },
  { icon: Kanban, label: 'Pipeline' },
  { icon: DollarSign, label: 'Finance' },
];

const kpis = [
  { label: 'Monthly Revenue', value: '₹4.2L', change: '+12%', icon: TrendingUp },
  { label: 'Total Leads', value: '1,284', change: '', icon: Target },
  { label: 'Active Clients', value: '47', change: '', icon: Users },
  { label: 'Pending Tasks', value: '23', change: '', icon: LayoutDashboard },
];

export function LandingDashboardPreview() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="relative"
      initial={reduceMotion ? undefined : 'hidden'}
      whileInView={reduceMotion ? undefined : 'visible'}
      viewport={scrollViewport}
      variants={scrollScaleIn}
    >
      <div className="absolute -inset-4 rounded-2xl bg-gradient-to-b from-accent/5 to-transparent blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-xl border bg-background shadow-card">
        <div className="flex items-center gap-2 border-b bg-surface-soft px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
          </div>
          <span className="mx-auto text-xs text-muted-foreground">app.agencyerp.com/dashboard</span>
        </div>

        <div className="flex min-h-[280px] sm:min-h-[320px]">
          <div className="hidden w-44 shrink-0 border-r bg-background p-3 sm:block">
            <p className="mb-4 px-2 font-display text-xs font-semibold">Agency ERP</p>
            <nav className="space-y-0.5">
              {sidebarItems.map((item, i) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                    i === 0
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  {item.label}
                </div>
              ))}
            </nav>
          </div>

          <div className="flex-1 p-4 sm:p-5">
            <div className="mb-4">
              <p className="font-display text-sm font-semibold">Executive Dashboard</p>
              <p className="text-xs text-muted-foreground">Real-time overview of your agency</p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground sm:text-xs">{kpi.label}</p>
                    <kpi.icon className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <p className="mt-1 font-display text-sm font-semibold sm:text-base">{kpi.value}</p>
                  {kpi.change && (
                    <p className="text-[10px] text-success sm:text-xs">{kpi.change}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-card p-3">
                <p className="mb-2 text-xs font-medium">Revenue Overview</p>
                <div className="flex h-16 items-end gap-1 sm:h-20">
                  {[40, 55, 45, 70, 60, 85, 75].map((h, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-sm bg-primary/20"
                      initial={reduceMotion ? undefined : { height: 0 }}
                      whileInView={reduceMotion ? undefined : { height: `${h}%` }}
                      viewport={scrollViewport}
                      transition={{ duration: 0.5, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="mb-2 text-xs font-medium">Lead Generation</p>
                <div className="flex h-16 items-end gap-1 sm:h-20">
                  {[30, 50, 65, 45, 80, 55, 90].map((h, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-sm bg-accent/30"
                      initial={reduceMotion ? undefined : { height: 0 }}
                      whileInView={reduceMotion ? undefined : { height: `${h}%` }}
                      viewport={scrollViewport}
                      transition={{ duration: 0.5, delay: i * 0.06 + 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
