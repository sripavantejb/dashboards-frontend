import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Clock, Shield, Activity, Inbox } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { PageGrid, PageSection } from '@/components/layout/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { PageLoading } from '@/components/shared/page-states';
import { formatDuration } from '@/lib/utils';
import type { AdminStats } from '@/types';
import { Link } from 'react-router';

export default function AdminOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<AdminStats>('/admin/stats'),
  });

  const stats = data?.data;

  if (isLoading) return <PageLoading rows={4} />;

  return (
    <>
      <PageHeader
        title="Platform Overview"
        description="SaaS admin dashboard — manage agencies, logins, and user activity"
      />

      <PageSection>
        <PageGrid cols="4">
          <KpiCard title="Companies" value={stats?.totalOrganizations || 0} format="number" icon={<Building2 className="h-4 w-4" />} />
          <KpiCard title="Active Companies" value={stats?.activeOrganizations || 0} format="number" icon={<Building2 className="h-4 w-4" />} />
          <KpiCard title="Pending Requests" value={stats?.pendingAccessRequests || 0} format="number" icon={<Inbox className="h-4 w-4" />} />
          <KpiCard title="ERP Users" value={stats?.totalUsers || 0} format="number" icon={<Users className="h-4 w-4" />} />
        </PageGrid>

        <PageGrid cols="2">
          <KpiCard title="Total Sessions" value={stats?.totalSessions || 0} format="number" icon={<Activity className="h-4 w-4" />} />
          <KpiCard title="Total Time Spent" value={formatDuration(stats?.totalTimeSeconds || 0)} icon={<Clock className="h-4 w-4" />} />
        </PageGrid>
      </PageSection>

      {stats?.planBreakdown && Object.keys(stats.planBreakdown).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Companies by Plan</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {Object.entries(stats.planBreakdown).map(([plan, count]) => (
              <div key={plan} className="rounded-lg border px-5 py-4 text-center min-w-[100px]">
                <p className="text-2xl font-semibold">{count}</p>
                <p className="text-xs text-muted-foreground capitalize">{plan}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <PageGrid cols="4">
        <Card>
          <CardHeader><CardTitle className="text-base">Access Requests</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">Review demo and access requests from the landing page.</p>
            <Link to="/admin/access-requests"><Button size="sm">View Requests</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Companies</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">Create agency tenants with ERP admin logins and default lead lists.</p>
            <Link to="/admin/organizations"><Button size="sm">Manage Companies</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Platform Admins</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">Create super admins who can manage the entire SaaS platform.</p>
            <Link to="/admin/admins"><Button size="sm">Manage Admins</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Activity</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">Filter activity and time spent by company.</p>
            <Link to="/admin/activity"><Button size="sm">View Activity</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Settings & Invites</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">Invite-only registration, plans, and invite links.</p>
            <Link to="/admin/settings"><Button size="sm">Platform Settings</Button></Link>
          </CardContent>
        </Card>
      </PageGrid>
    </>
  );
}
