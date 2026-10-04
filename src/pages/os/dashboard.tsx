import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { AlertTriangle, BellRing, Briefcase, Building2, CircleDollarSign, FolderKanban, Save, Send, Target, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCan } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth';
import { PageHeader } from '@/components/layout/page-header';
import { PageGrid } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { SectionCard, StatCard, StatusPill, fmtDate, fmtDateTime, humanize, inr } from '@/components/shared/os-ui';

const PIPELINE_STAGES = ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'] as const;

interface Dashboard {
  canSeeAll: boolean;
  unread: number;
  taskStats: { open: number; today: number; overdue: number; blocked: number; trackerOpen: number };
  growth: { referrers: number; totalClients: number; salesCustomers: number };
  tasks: { id: string; title: string; status: string; dueDate?: string; assignee: string; mine: boolean }[];
  tracker: { id: string; label: string; projectName: string; status: string; mine: boolean }[];
  myProjects: { owned: number; working: number; list: { id: string; name: string }[] };
  workload: { id: string; name: string; role: string; active: number; completed: number; blocked: number; overdue: number; total: number }[];
  kpis: { received: number; activeClients: number; activeProjects: number; openLeads: number; pipelineValue: number; outstanding: number };
  pipeline: { counts: Record<string, number>; conversionRate: number };
  operations: { dueSoon: number; meetings: { _id: string; title: string; startsAt: string }[] };
  finance: { invoiced: number; collected: number; outstanding: number; overdue: number; monthPaid: number; quarterPaid: number; otherIncome: number; totalSpent: number; monthSpent: number; net: number };
  attention: { overdueInvoices: { count: number; amount: number }; followUps: { id: string; notes: string; dueAt: string }[]; deliveryRisk: { dueSoon: number; overdueTasks: number } };
}

type StageTargetRow = {
  employeeId: string;
  name: string;
  employeeCode?: string;
  stages: Record<string, number>;
  actual: Record<string, number>;
};

export default function OsDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const can = useCan();
  const qc = useQueryClient();
  const canManageBdaTargets = can('sales_crm:write') || user?.role === 'admin';
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['os-dashboard'], queryFn: () => api.data<Dashboard>('/os/dashboard') });
  const stageTargets = useQuery({
    queryKey: ['sales-stage-targets'],
    queryFn: () => api.data<StageTargetRow[]>('/sales-crm/stage-targets'),
    enabled: canManageBdaTargets || can('sales_crm:read'),
    retry: false,
  });
  const [drafts, setDrafts] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    if (!stageTargets.data) return;
    setDrafts(Object.fromEntries(stageTargets.data.map((r) => [r.employeeId, { ...r.stages }])));
  }, [stageTargets.data]);

  const alerts = useMutation({
    mutationFn: () => api.data<{ message: string }>('/os/dashboard/alerts', 'POST'),
    onSuccess: (r) => toast.success(r.message),
    onError: (e: Error) => toast.error(e.message),
  });
  const nudge = useMutation({
    mutationFn: (w: Dashboard['workload'][number]) => api.data<{ message: string }>('/os/dashboard/nudge', 'POST', { userId: w.id, name: w.name, active: w.active, overdue: w.overdue }),
    onSuccess: (r) => toast.success(r.message),
    onError: (e: Error) => toast.error(e.message),
  });
  const saveStages = useMutation({
    mutationFn: ({ employeeId, stages }: { employeeId: string; stages: Record<string, number> }) =>
      api.data('/sales-crm/stage-targets', 'PUT', { employeeId, stages }),
    onSuccess: () => {
      toast.success('Pipeline stage targets saved');
      void qc.invalidateQueries({ queryKey: ['sales-stage-targets'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isError) return <PageError onRetry={() => refetch()} />;
  if (isLoading || !data) return <PageLoading rows={6} />;
  const d = data;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const bdaRows = stageTargets.data || [];

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user?.firstName || 'there'}`}
        description="Everything that needs your attention across sales, delivery and finance."
        action={
          <>
            <Button variant="outline" asChild><Link to="/notifications"><BellRing className="mr-2 h-4 w-4" />Inbox ({d.unread})</Link></Button>
            {can('tasks:write') && (
              <Button variant="outline" disabled={alerts.isPending} onClick={() => alerts.mutate()}>
                <Send className="mr-2 h-4 w-4" />{alerts.isPending ? 'Sending…' : 'Send alerts'}
              </Button>
            )}
          </>
        }
      />

      <PageGrid cols="4">
        <StatCard label="Open tasks" value={d.taskStats.open} hint={`${d.taskStats.today} due today`} icon={<Target className="h-4 w-4" />} />
        <StatCard label="Overdue" value={d.taskStats.overdue} tone={d.taskStats.overdue ? 'danger' : 'default'} hint={`${d.taskStats.blocked} blocked`} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="My projects" value={d.myProjects.working} hint={`${d.myProjects.owned} as POC`} icon={<FolderKanban className="h-4 w-4" />} />
        <StatCard label="Total clients" value={d.growth.totalClients} hint={`${d.growth.referrers} referrers`} icon={<Building2 className="h-4 w-4" />} />
      </PageGrid>

      {d.canSeeAll && (
        <PageGrid cols="3">
          <StatCard label="Received" value={inr(d.kpis.received)} tone="success" icon={<CircleDollarSign className="h-4 w-4" />} />
          <StatCard label="Outstanding" value={inr(d.kpis.outstanding)} hint={d.attention.overdueInvoices.count ? `${d.attention.overdueInvoices.count} overdue · ${inr(d.attention.overdueInvoices.amount)}` : 'Nothing overdue'} />
          <StatCard label="Pipeline" value={inr(d.kpis.pipelineValue)} hint={`${d.kpis.openLeads} open leads · ${d.pipeline.conversionRate}% conversion`} icon={<Users className="h-4 w-4" />} />
        </PageGrid>
      )}

      <PageGrid cols="2">
        <SectionCard title="My tasks" action={<Link to="/tasks?view=my" className="text-xs font-medium text-muted-foreground hover:text-foreground">View all →</Link>}>
          {d.tasks.length === 0 ? <p className="text-sm text-muted-foreground">You're all caught up.</p> : (
            <ul className="divide-y">
              {d.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link to={`/tasks/${t.id}`} className="block truncate text-sm font-medium hover:underline">{t.title}</Link>
                    <p className="text-xs text-muted-foreground">{t.assignee || 'Unassigned'} · {t.dueDate ? fmtDate(t.dueDate) : 'No due date'}</p>
                  </div>
                  <StatusPill value={t.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Needs attention">
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex items-center justify-between"><span>Overdue invoices</span><Link to="/outstanding" className="font-medium hover:underline">{d.attention.overdueInvoices.count} · {inr(d.attention.overdueInvoices.amount)}</Link></li>
            <li className="flex items-center justify-between"><span>Projects due in 7 days</span><span className="font-medium">{d.attention.deliveryRisk.dueSoon}</span></li>
            <li className="flex items-center justify-between"><span>Overdue tasks</span><span className="font-medium">{d.attention.deliveryRisk.overdueTasks}</span></li>
            <li className="flex items-center justify-between"><span>Open tracker rows</span><Link to="/tracker" className="font-medium hover:underline">{d.taskStats.trackerOpen}</Link></li>
          </ul>
          {d.attention.followUps.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Follow-ups due</p>
              <ul className="flex flex-col gap-1.5">
                {d.attention.followUps.map((f) => (
                  <li key={f.id} className="flex justify-between text-sm"><span className="truncate">{f.notes}</span><span className="text-xs text-muted-foreground">{fmtDateTime(f.dueAt)}</span></li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      </PageGrid>

      {d.canSeeAll && (
        <PageGrid cols="2">
          <SectionCard title="Finance snapshot" action={<Link to="/revenue" className="text-xs font-medium text-muted-foreground hover:text-foreground">Revenue →</Link>}>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {([
                ['Invoiced', d.finance.invoiced], ['Collected', d.finance.collected], ['This month', d.finance.monthPaid], ['This quarter', d.finance.quarterPaid],
                ['Other income', d.finance.otherIncome], ['Spent (month)', d.finance.monthSpent], ['Total spent', d.finance.totalSpent], ['Net', d.finance.net],
              ] as [string, number][]).map(([k, v]) => (
                <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-display text-lg font-semibold">{inr(v)}</dd></div>
              ))}
            </dl>
          </SectionCard>

          <SectionCard title="Sales pipeline" action={<Link to="/pipeline" className="text-xs font-medium text-muted-foreground hover:text-foreground">Pipeline →</Link>}>
            <div className="flex flex-col gap-2">
              {Object.entries(d.pipeline.counts).filter(([, n]) => n > 0).map(([status, n]) => {
                const max = Math.max(1, ...Object.values(d.pipeline.counts));
                return (
                  <div key={status} className="flex items-center gap-3 text-sm">
                    <span className="w-32 shrink-0 truncate text-muted-foreground">{humanize(status)}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div>
                    <span className="w-8 text-right tabular-nums">{n}</span>
                  </div>
                );
              })}
              {Object.values(d.pipeline.counts).every((n) => !n) && <p className="text-sm text-muted-foreground">No leads yet.</p>}
            </div>
          </SectionCard>
        </PageGrid>
      )}

      <PageGrid cols="2">
        <SectionCard title="Master tracker" action={<Link to="/tracker" className="text-xs font-medium text-muted-foreground hover:text-foreground">Open →</Link>}>
          {d.tracker.length === 0 ? <p className="text-sm text-muted-foreground">No open tracker rows.</p> : (
            <ul className="divide-y">
              {d.tracker.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{r.label}</p><p className="text-xs text-muted-foreground">{r.projectName}{r.mine && ' · You'}</p></div>
                  <StatusPill value={r.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Upcoming meetings" action={<Link to="/meetings" className="text-xs font-medium text-muted-foreground hover:text-foreground">All →</Link>}>
          {d.operations.meetings.length === 0 ? <p className="text-sm text-muted-foreground">No meetings scheduled.</p> : (
            <ul className="divide-y">
              {d.operations.meetings.map((m) => (
                <li key={m._id} className="flex items-center justify-between py-2.5 text-sm"><span className="truncate font-medium">{m.title}</span><span className="text-xs text-muted-foreground">{fmtDateTime(m.startsAt)}</span></li>
              ))}
            </ul>
          )}
        </SectionCard>
      </PageGrid>

      {d.canSeeAll && d.workload.length > 0 && (
        <SectionCard
          title="Team workload & check-in"
          action={<p className="max-w-xs text-right text-xs text-muted-foreground">Nudge sends a check-in notification (not a new task). Sales/BDA people open it in their portal.</p>}
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                {['Teammate', 'Active', 'Overdue', 'Blocked', 'Completed', 'Check-in'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {d.workload.map((w) => (
                  <tr key={w.id} className="border-b last:border-0">
                    <td className="px-5 py-3"><p className="font-medium">{w.name}</p><p className="text-xs text-muted-foreground">{humanize(w.role)}</p></td>
                    <td className="px-5 py-3 tabular-nums">{w.active}</td>
                    <td className={`px-5 py-3 tabular-nums ${w.overdue ? 'text-error' : ''}`}>{w.overdue}</td>
                    <td className="px-5 py-3 tabular-nums">{w.blocked}</td>
                    <td className="px-5 py-3 tabular-nums">{w.completed}</td>
                    <td className="px-5 py-3 text-right">
                      {w.id !== user?.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Send a workload check-in notification to this teammate"
                          onClick={() => nudge.mutate(w)}
                        >
                          <Briefcase className="mr-1.5 h-3.5 w-3.5" />Nudge
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {(canManageBdaTargets || bdaRows.length > 0) && (
        <SectionCard
          title="BDA pipeline stage targets"
          action={<p className="max-w-sm text-right text-xs text-muted-foreground">This month · set how many leads each BDA should move through each stage. Actual = leads assigned to them created this month.</p>}
          bodyClassName="p-0"
        >
          {stageTargets.isLoading ? (
            <div className="p-5"><PageLoading rows={3} /></div>
          ) : stageTargets.isError ? (
            <p className="p-5 text-sm text-muted-foreground">Sales CRM is not available for stage targets yet.</p>
          ) : bdaRows.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No BDAs yet. Add sales employees from Employees or Sales CRM → Team.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-medium">BDA</th>
                    {PIPELINE_STAGES.map((st) => (
                      <th key={st} className="px-3 py-3 font-medium">{humanize(st)}</th>
                    ))}
                    {canManageBdaTargets && <th className="px-5 py-3 font-medium" />}
                  </tr>
                </thead>
                <tbody>
                  {bdaRows.map((row) => {
                    const draft = drafts[row.employeeId] || row.stages;
                    return (
                      <tr key={row.employeeId} className="border-b last:border-0 align-top">
                        <td className="px-5 py-3">
                          <p className="font-medium">{row.name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{row.employeeCode}</p>
                        </td>
                        {PIPELINE_STAGES.map((st) => {
                          const target = Number(draft[st] || 0);
                          const actual = Number(row.actual?.[st] || 0);
                          const met = target > 0 && actual >= target;
                          return (
                            <td key={st} className="px-3 py-3">
                              {canManageBdaTargets ? (
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-9 w-20"
                                  value={Number.isFinite(target) ? target : 0}
                                  onChange={(e) =>
                                    setDrafts((prev) => ({
                                      ...prev,
                                      [row.employeeId]: {
                                        ...(prev[row.employeeId] || row.stages),
                                        [st]: Math.max(0, Number(e.target.value) || 0),
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <span className="tabular-nums font-medium">{target}</span>
                              )}
                              <p className={`mt-1 text-[11px] tabular-nums ${met ? 'text-success' : 'text-muted-foreground'}`}>
                                actual {actual}{target > 0 ? ` / ${target}` : ''}
                              </p>
                            </td>
                          );
                        })}
                        {canManageBdaTargets && (
                          <td className="px-5 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={saveStages.isPending}
                              onClick={() => saveStages.mutate({ employeeId: row.employeeId, stages: draft })}
                            >
                              <Save className="mr-1.5 h-3.5 w-3.5" />Save
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      <SectionCard title="Where to work">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {can('growth:read') && <Link className="hover:underline" to="/growth/ega">EGA form</Link>}
          {can('growth:read') && <Link className="hover:underline" to="/growth/magazine">Magazine</Link>}
          {can('growth:read') && <Link className="hover:underline" to="/growth/newsletter">Campaigns</Link>}
          {can('documents:read') && <Link className="hover:underline" to="/assets">Assets</Link>}
          {can('documents:read') && <Link className="hover:underline" to="/sow-templates">SOW</Link>}
          {can('knowledge:read') && <Link className="hover:underline" to="/knowledge">Knowledge</Link>}
          {can('campaigns:read') && <Link className="hover:underline" to="/content-calendar">Content calendar</Link>}
          {can('leaves:read') && <Link className="hover:underline" to="/leave">Leave</Link>}
        </div>
      </SectionCard>
    </>
  );
}
