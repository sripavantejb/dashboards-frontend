'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { PageToolbar } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, formatDate, getInitials } from '@/lib/utils';
import type { Lead } from '@/types';

export default function CRMPageWrapper() {
  return (
    <Suspense fallback={<PageLoading rows={5} />}>
      <CRMPage />
    </Suspense>
  );
}

function CRMPage() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['leads', search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');
      return api.get<Lead[]>(`/leads?${params}`);
    },
  });

  const leads = data?.data || [];

  return (
    <>
      <PageHeader
        title="CRM"
        description="Manage all your leads and contacts"
        action={
          <Link href="/crm/new">
            <Button className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Add Lead</Button>
          </Link>
        }
      />

      <PageToolbar>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-auto sm:min-w-[160px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </PageToolbar>

      {isError ? (
        <PageError onRetry={() => refetch()} />
      ) : isLoading ? (
        <PageLoading rows={5} />
      ) : leads.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No leads found</CardContent></Card>
      ) : (
        <>
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr className="border-b">
                      <th>Lead</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Assigned To</th>
                      <th>Source</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead._id}>
                        <td>
                          <Link href={`/crm/${lead._id}`} className="hover:underline">
                            <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                            <p className="text-xs text-muted-foreground">{lead.email || lead.phone}</p>
                          </Link>
                        </td>
                        <td>{lead.company || '—'}</td>
                        <td>
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${LEAD_STATUS_COLORS[lead.status] || ''}`}>
                            {LEAD_STATUS_LABELS[lead.status] || lead.status}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 rounded-full bg-surface-card overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${lead.score}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{lead.score}</span>
                          </div>
                        </td>
                        <td>
                          {lead.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(`${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{lead.assignedTo.firstName}</span>
                            </div>
                          ) : '—'}
                        </td>
                        <td><Badge variant="outline">{lead.source || '—'}</Badge></td>
                        <td className="text-muted-foreground">{formatDate(lead.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="md:hidden flex flex-col gap-3">
            {leads.map((lead) => (
              <Link key={lead._id} href={`/crm/${lead._id}`} className="block rounded-lg border p-4 lg:p-5 hover:bg-surface-soft transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{lead.company || lead.email || lead.phone}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${LEAD_STATUS_COLORS[lead.status] || ''}`}>
                    {LEAD_STATUS_LABELS[lead.status] || lead.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Score: {lead.score}</span>
                  <span>{formatDate(lead.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
