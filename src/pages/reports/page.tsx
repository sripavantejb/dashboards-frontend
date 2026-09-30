import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { PageGrid } from '@/components/layout/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { LEAD_STATUS_LABELS } from '@/lib/utils';
import { DollarSign, Target, Users, Briefcase } from 'lucide-react';
import type { DashboardStats } from '@/types';

const PIE_COLORS = ['#111111', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function ReportsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  });

  const stats = data?.data;

  if (isLoading) return <><PageHeader title="Reports" /><PageLoading rows={6} /></>;
  if (isError) return <><PageHeader title="Reports" /><PageError onRetry={() => refetch()} /></>;

  const kpis = stats?.kpis;

  return (
    <>
      <PageHeader title="Reports" description="Analytics and performance reports" />

      <PageGrid cols="4">
        <KpiCard title="Monthly Revenue" value={kpis?.monthlyRevenue || 0} format="currency" change={kpis?.monthlyGrowth} icon={<DollarSign className="h-4 w-4" />} />
        <KpiCard title="Total Leads" value={kpis?.totalLeads || 0} format="number" icon={<Target className="h-4 w-4" />} />
        <KpiCard title="Active Clients" value={kpis?.activeClients || 0} format="number" icon={<Users className="h-4 w-4" />} />
        <KpiCard title="Active Projects" value={kpis?.activeProjects || 0} format="number" icon={<Briefcase className="h-4 w-4" />} />
      </PageGrid>

      <PageGrid cols="2">
        <Card>
          <CardHeader><CardTitle>Revenue Report</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats?.charts.revenue || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#111111" fill="#111111" fillOpacity={0.1} name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pipeline Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats?.salesPipeline || []}
                  dataKey="count"
                  nameKey="stage"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ stage, count }) => `${LEAD_STATUS_LABELS[stage] || stage}: ${count}`}
                >
                  {(stats?.salesPipeline || []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </PageGrid>

      <Card>
        <CardHeader><CardTitle>Lead Conversion</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats?.charts.leads || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="leads" fill="#111111" name="New Leads" radius={[4, 4, 0, 0]} />
              <Bar dataKey="won" fill="#10b981" name="Won" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}
