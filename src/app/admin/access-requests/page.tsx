'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageLoading } from '@/components/shared/page-states';
import { formatDate } from '@/lib/utils';
import type { AccessRequest } from '@/types';

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'destructive' | 'outline'> = {
  pending: 'warning',
  contacted: 'default',
  approved: 'success',
  rejected: 'destructive',
};

const STATUS_FILTERS = ['all', 'pending', 'contacted', 'approved', 'rejected'] as const;

export default function AdminAccessRequestsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<AccessRequest | null>(null);
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-access-requests', statusFilter],
    queryFn: () => api.get<AccessRequest[]>(`/admin/access-requests${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) =>
      api.patch(`/admin/access-requests/${id}`, { status, adminNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-access-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Request updated');
      setSelected(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/access-requests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-access-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Request deleted');
      setSelected(null);
    },
  });

  const requests = data?.data || [];

  const openDetail = (req: AccessRequest) => {
    setSelected(req);
    setNotes(req.adminNotes || '');
  };

  if (isLoading) return <PageLoading rows={6} />;

  return (
    <>
      <PageHeader
        title="Access Requests"
        description="Landing page demo and access requests from prospective agencies"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'default' : 'outline'}
            onClick={() => setStatusFilter(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No access requests{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''} yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req._id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => openDetail(req)}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {req.firstName} {req.lastName}
                    </p>
                    <Badge variant={STATUS_VARIANT[req.status] || 'outline'} className="capitalize">
                      {req.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{req.companyName}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {req.email}
                    </span>
                    {req.phone && <span>{req.phone}</span>}
                    {req.teamSize && <span>Team: {req.teamSize}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  {formatDate(req.createdAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SimpleModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.firstName} ${selected.lastName}` : ''}
      >
        {selected && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">{selected.companyName}</p>
            <div className="grid gap-3 text-sm">
              <div><span className="text-muted-foreground">Email:</span> {selected.email}</div>
              {selected.phone && <div><span className="text-muted-foreground">Phone:</span> {selected.phone}</div>}
              {selected.teamSize && <div><span className="text-muted-foreground">Team size:</span> {selected.teamSize}</div>}
              <div><span className="text-muted-foreground">Submitted:</span> {formatDate(selected.createdAt)}</div>
            </div>

            {selected.message && (
              <div className="rounded-lg border bg-surface-soft p-4">
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <MessageSquare className="h-3 w-3" /> Message
                </p>
                <p className="text-sm leading-relaxed">{selected.message}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Admin notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes about this request..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(['pending', 'contacted', 'approved', 'rejected'] as const).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={selected.status === status ? 'default' : 'outline'}
                  className="capitalize"
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ id: selected._id, status, adminNotes: notes })}
                >
                  {status}
                </Button>
              ))}
            </div>

            <div className="flex justify-between border-t pt-4">
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(selected._id)}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        )}
      </SimpleModal>
    </>
  );
}
