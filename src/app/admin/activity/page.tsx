'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { PageGrid, PageToolbar } from '@/components/layout/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageLoading } from '@/components/shared/page-states';
import { formatDate, formatDuration } from '@/lib/utils';
import type { UserActivitySummary, AdminOrganization } from '@/types';

interface ActivityData {
  summary: UserActivitySummary[];
  recentSessions: Array<{
    _id: string;
    page?: string;
    module?: string;
    durationSeconds: number;
    lastActiveAt: string;
    userId: { firstName: string; lastName: string; email: string; role: string };
    organizationId: { name: string; slug: string };
  }>;
  auditLogs: Array<{
    _id: string;
    action: string;
    entityType: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    userId?: { firstName: string; lastName: string; email: string };
  }>;
}

export default function AdminActivityPage() {
  const [organizationId, setOrganizationId] = useState('');
  const [days, setDays] = useState('30');

  const { data: orgsData } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: () => api.get<AdminOrganization[]>('/admin/organizations'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-activity', organizationId, days],
    queryFn: () => {
      const params = new URLSearchParams({ days });
      if (organizationId) params.set('organizationId', organizationId);
      return api.get<ActivityData>(`/admin/activity?${params.toString()}`);
    },
  });

  const orgs = orgsData?.data || [];
  const activity = data?.data;
  const summary = activity?.summary || [];
  const sessions = activity?.recentSessions || [];
  const auditLogs = activity?.auditLogs || [];

  return (
    <>
      <PageHeader
        title="Activity & Time Tracking"
        description="Filter by company to see user sessions and time spent"
      />

      <PageToolbar>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
        >
          <option value="">All companies</option>
          {orgs.map((org) => (
            <option key={org._id} value={org._id}>{org.name}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </PageToolbar>

      {isLoading ? (
        <PageLoading rows={6} />
      ) : (
        <>
          <PageGrid cols="2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Time Spent by User ({days} days)
                  {organizationId && orgs.find((o) => o._id === organizationId) && (
                    <span className="text-muted-foreground font-normal text-sm ml-2">
                      — {orgs.find((o) => o._id === organizationId)?.name}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                {summary.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No activity recorded yet</p>
                ) : (
                  summary.map((row) => (
                    <div key={row.userId} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div>
                        <p className="font-medium">{row.firstName} {row.lastName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.organizationName || 'Unknown org'} · {row.role} · {row.sessions} sessions
                        </p>
                      </div>
                      <Badge variant="outline">{formatDuration(row.totalSeconds)}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Recent Sessions</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No sessions yet</p>
                ) : (
                  sessions.map((s) => (
                    <div key={s._id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {s.userId?.firstName} {s.userId?.lastName}
                        </p>
                        <Badge variant="outline">{formatDuration(s.durationSeconds)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {s.organizationId?.name} · {s.module || s.page || 'app'} · {formatDate(s.lastActiveAt)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </PageGrid>

          <Card>
            <CardHeader><CardTitle className="text-base">Platform Audit Log</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No audit events yet</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log._id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium capitalize">{log.action} {log.entityType.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        by {log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : 'System'} · {formatDate(log.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline">{log.entityType}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
