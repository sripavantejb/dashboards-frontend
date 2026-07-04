'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Phone, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { PageToolbar } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageError, PageLoading, EmptyState } from '@/components/shared/page-states';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, formatDate } from '@/lib/utils';
import type { Lead, LeadCategory } from '@/types';

export default function LeadListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: catData, isLoading: catLoading, isError: catError, refetch: refetchCat } = useQuery({
    queryKey: ['lead-category', id],
    queryFn: () => api.get<LeadCategory>(`/lead-categories/${id}`),
  });

  const { data: leadsData, isLoading: leadsLoading, isError: leadsError, refetch: refetchLeads } = useQuery({
    queryKey: ['leads', 'category', id],
    queryFn: () => api.get<Lead[]>(`/leads?categoryId=${id}&limit=50`),
    enabled: !!catData?.success,
  });

  const queueMutation = useMutation({
    mutationFn: (leadIds: string[]) =>
      api.patch('/leads/bulk', { leadIds, updates: { inCallingQueue: true } }),
    onSuccess: (_, leadIds) => {
      queryClient.invalidateQueries({ queryKey: ['leads', 'category', id] });
      queryClient.invalidateQueries({ queryKey: ['leads-for-calling'] });
      setSelectedIds(new Set());
      toast.success(`${leadIds.length} lead${leadIds.length === 1 ? '' : 's'} added to calling queue`);
    },
    onError: () => toast.error('Failed to add leads to queue'),
  });

  const category = catData?.data;
  const leads = leadsData?.data || [];
  const isLoading = catLoading || leadsLoading;

  const toggleSelect = (leadId: string) => {
    const next = new Set(selectedIds);
    if (next.has(leadId)) next.delete(leadId);
    else next.add(leadId);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    const selectable = leads.filter((l) => !l.inCallingQueue);
    if (selectedIds.size === selectable.length && selectable.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectable.map((l) => l._id)));
    }
  };

  const assignSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    queueMutation.mutate(ids);
  };

  const assignAll = () => {
    const ids = leads.filter((l) => !l.inCallingQueue).map((l) => l._id);
    if (ids.length === 0) {
      toast.info('All leads in this list are already in the calling queue');
      return;
    }
    queueMutation.mutate(ids);
  };

  const selectableCount = leads.filter((l) => !l.inCallingQueue).length;
  const queuedCount = leads.filter((l) => l.inCallingQueue).length;

  if (catError || leadsError) {
    return <PageError onRetry={() => { refetchCat(); refetchLeads(); }} />;
  }

  return (
    <>
      <PageHeader
        title={category?.name || 'Lead List'}
        description={category?.description || `${category?.leadCount || 0} leads in this category`}
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {leads.length > 0 && (
              <Button
                variant="default"
                size="sm"
                className="w-full sm:w-auto"
                onClick={assignAll}
                disabled={selectableCount === 0 || queueMutation.isPending}
              >
                <Phone className="h-4 w-4 mr-2" />
                Add All to Calling Queue
              </Button>
            )}
            <Link href="/lead-lists">
              <Button variant="outline" className="w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
            </Link>
          </div>
        }
      />

      {isLoading ? (
        <PageLoading rows={5} />
      ) : leads.length === 0 ? (
        <EmptyState message="No leads in this category yet." />
      ) : (
        <>
          <PageToolbar>
            {queuedCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {queuedCount} in calling queue
              </Badge>
            )}
            {selectedIds.size > 0 && (
              <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center">
                <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
                <Button
                  size="sm"
                  onClick={assignSelected}
                  disabled={queueMutation.isPending}
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Add to Calling Queue
                </Button>
              </div>
            )}
          </PageToolbar>

          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="w-10">
                        <button onClick={toggleAll} disabled={selectableCount === 0}>
                          {selectedIds.size === selectableCount && selectableCount > 0
                            ? <CheckSquare className="h-4 w-4" />
                            : <Square className="h-4 w-4" />}
                        </button>
                      </th>
                      <th>Lead</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead._id} className={lead.inCallingQueue ? 'opacity-60' : ''}>
                        <td>
                          {lead.inCallingQueue ? (
                            <Badge variant="outline" className="text-[10px] px-1.5">Queued</Badge>
                          ) : (
                            <button onClick={() => toggleSelect(lead._id)}>
                              {selectedIds.has(lead._id)
                                ? <CheckSquare className="h-4 w-4" />
                                : <Square className="h-4 w-4" />}
                            </button>
                          )}
                        </td>
                        <td>
                          <Link href={`/crm/${lead._id}`} className="font-medium hover:underline">
                            {lead.firstName} {lead.lastName}
                          </Link>
                          <p className="text-xs text-muted-foreground">{lead.email || lead.phone}</p>
                        </td>
                        <td>{lead.company || '—'}</td>
                        <td>
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${LEAD_STATUS_COLORS[lead.status] || ''}`}>
                            {LEAD_STATUS_LABELS[lead.status] || lead.status}
                          </span>
                        </td>
                        <td>{lead.score}</td>
                        <td className="text-muted-foreground">{formatDate(lead.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          <div className="md:hidden flex flex-col gap-3">
            {leads.map((lead) => (
              <div
                key={lead._id}
                className={`rounded-lg border p-4 lg:p-5 ${lead.inCallingQueue ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {!lead.inCallingQueue ? (
                    <button onClick={() => toggleSelect(lead._id)} className="mt-0.5">
                      {selectedIds.has(lead._id)
                        ? <CheckSquare className="h-4 w-4" />
                        : <Square className="h-4 w-4" />}
                    </button>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Queued</Badge>
                  )}
                  <Link href={`/crm/${lead._id}`} className="flex-1 hover:bg-surface-soft transition-colors -m-2 p-2 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                        <p className="text-xs text-muted-foreground">{lead.company || lead.email}</p>
                      </div>
                      <Badge variant="outline">{LEAD_STATUS_LABELS[lead.status] || lead.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Score: {lead.score} · {formatDate(lead.createdAt)}</p>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
