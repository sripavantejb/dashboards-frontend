'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  DollarSign, Users, Briefcase, CheckCircle, TrendingUp, Target,
} from 'lucide-react';
import { api } from '@/lib/api';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { StaggerGrid, StaggerItem } from '@/components/shared/motion';
import { PageHeader } from '@/components/layout/page-header';
import { PageGrid } from '@/components/layout/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, formatDate, LEAD_STATUS_LABELS } from '@/lib/utils';
import { PageError } from '@/components/shared/page-states';
import type { DashboardStats } from '@/types';

const PIE_COLORS = ['#111111', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  });

  const stats = data?.data;

  if (isLoading) {
    return (
      <>
        <PageHeader title="Executive Dashboard" description="Loading your analytics..." />
        <PageGrid cols="4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-surface-card" />
          ))}
        </PageGrid>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Executive Dashboard" description="Real-time overview of your agency performance" />
        <PageError onRetry={() => refetch()} />
      </>
    );
  }

  const kpis = stats?.kpis;

  return (
    <>
      <PageHeader
        title="Executive Dashboard"
        description="Real-time overview of your agency performance"
      />

      <StaggerGrid className="grid gap-4 lg:gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StaggerItem><KpiCard title="Monthly Revenue" value={kpis?.monthlyRevenue || 0} format="currency" change={kpis?.monthlyGrowth} icon={<DollarSign className="h-4 w-4" />} /></StaggerItem>
        <StaggerItem><KpiCard title="Total Leads" value={kpis?.totalLeads || 0} format="number" icon={<Target className="h-4 w-4" />} /></StaggerItem>
        <StaggerItem><KpiCard title="Active Clients" value={kpis?.activeClients || 0} format="number" icon={<Users className="h-4 w-4" />} /></StaggerItem>
        <StaggerItem><KpiCard title="Active Projects" value={kpis?.activeProjects || 0} format="number" icon={<Briefcase className="h-4 w-4" />} /></StaggerItem>
        <StaggerItem><KpiCard title="Pending Tasks" value={kpis?.pendingTasks || 0} format="number" icon={<CheckCircle className="h-4 w-4" />} /></StaggerItem>
        <StaggerItem><KpiCard title="Completed Tasks" value={kpis?.completedTasks || 0} format="number" /></StaggerItem>
        <StaggerItem><KpiCard title="Cash Flow" value={kpis?.cashFlow || 0} format="currency" icon={<TrendingUp className="h-4 w-4" />} /></StaggerItem>
        <StaggerItem><KpiCard title="Revenue Forecast" value={kpis?.revenueForecast || 0} format="currency" /></StaggerItem>
      </StaggerGrid>

      <PageGrid cols="2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats?.charts.revenue || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#111111" fill="#111111" fillOpacity={0.1} name="Revenue" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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
      </PageGrid>

      <PageGrid cols="3">
        <Card>
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats?.salesPipeline || []}
                  dataKey="count"
                  nameKey="stage"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
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

        <Card>
          <CardHeader>
            <CardTitle>Top Lead Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats?.topServices || []).map((service, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: service.color || PIE_COLORS[i] }} />
                  <span className="text-sm font-medium">{service.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{service.count} leads</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Sales Performers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats?.topSalesEmployees || []).map((emp, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(emp.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{emp.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{emp.wonCount} won</p>
                  <p className="text-xs text-muted-foreground">{emp.leadCount} total</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </PageGrid>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(stats?.recentActivities || []).map((activity) => (
              <div key={activity._id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {getInitials(`${activity.createdBy?.firstName || ''} ${activity.createdBy?.lastName || ''}`)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.leadId ? `${activity.leadId.firstName} ${activity.leadId.lastName || ''}` : ''}
                    {activity.leadId?.company ? ` · ${activity.leadId.company}` : ''}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(activity.createdAt)}</span>
              </div>
            ))}
            {(!stats?.recentActivities || stats.recentActivities.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activities</p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
