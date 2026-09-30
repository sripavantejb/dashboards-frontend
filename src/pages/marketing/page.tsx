import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { PageGrid } from '@/components/layout/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { DashboardStats } from '@/types';

export default function MarketingPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  });

  const stats = data?.data;

  if (isLoading) return <><PageHeader title="Marketing" /><PageLoading rows={4} /></>;
  if (isError) return <><PageHeader title="Marketing" /><PageError onRetry={() => refetch()} /></>;

  const leadSources = stats?.topServices || [];
  const leadsChart = stats?.charts.leads || [];

  return (
    <>
      <PageHeader title="Marketing" description="Lead generation and campaign performance" />

      <PageGrid cols="4">
        <Card><CardContent className="pt-5 lg:pt-6"><p className="text-xs text-muted-foreground">Total Leads</p><p className="mt-1 text-2xl font-semibold">{stats?.kpis.totalLeads || 0}</p></CardContent></Card>
        <Card><CardContent className="pt-5 lg:pt-6"><p className="text-xs text-muted-foreground">Active Leads</p><p className="mt-1 text-2xl font-semibold">{stats?.kpis.activeLeads || 0}</p></CardContent></Card>
        <Card><CardContent className="pt-5 lg:pt-6"><p className="text-xs text-muted-foreground">Categories</p><p className="mt-1 text-2xl font-semibold">{leadSources.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5 lg:pt-6"><p className="text-xs text-muted-foreground">Growth</p><p className="mt-1 text-2xl font-semibold">{stats?.kpis.monthlyGrowth || 0}%</p></CardContent></Card>
      </PageGrid>

      <PageGrid cols="2">
        <Card>
          <CardHeader><CardTitle>Lead Generation Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={leadsChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="leads" fill="#111111" name="New Leads" radius={[4, 4, 0, 0]} />
                <Bar dataKey="won" fill="#10b981" name="Won" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Leads by Category</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {leadSources.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color || '#111' }} />
                  <span className="text-sm font-medium truncate">{s.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-2 w-16 sm:w-24 rounded-full bg-surface-card overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (s.count / (stats?.kpis.totalLeads || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8 text-right">{s.count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </PageGrid>
    </>
  );
}
