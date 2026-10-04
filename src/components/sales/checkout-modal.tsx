import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { SimpleModal } from '@/components/shared/simple-modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/shared/os-ui';
import { humanize } from '@/components/shared/os-ui';
import { PageError, PageLoading } from '@/components/shared/page-states';

export type CheckoutSnapshot = {
  date: string;
  totalLeads: number;
  openLeads: number;
  newToday: number;
  convertedToday: number;
  lostToday: number;
  byStatus: Record<string, number>;
  callsToday: number;
  followUpsCompleted: number;
  dealsWonToday: number;
  remarks?: string;
  newLeads?: { id: string; name: string; status: string }[];
  convertedLeads?: { id: string; name: string; notes?: string }[];
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-surface-soft/50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function CheckoutSnapshotView({ snapshot }: { snapshot: CheckoutSnapshot }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Total leads" value={snapshot.totalLeads} />
        <Stat label="New today" value={snapshot.newToday} />
        <Stat label="Converted" value={snapshot.convertedToday} />
        <Stat label="Calls today" value={snapshot.callsToday} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Open {snapshot.openLeads}</span>
        <span>Lost today {snapshot.lostToday}</span>
        <span>Follow-ups done {snapshot.followUpsCompleted}</span>
        <span>Deals won {snapshot.dealsWonToday}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(snapshot.byStatus || {}).filter(([, n]) => n > 0).map(([k, n]) => (
          <span key={k} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{humanize(k)} {n}</span>
        ))}
      </div>
      {!!snapshot.newLeads?.length && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Newly added</p>
          <ul className="space-y-0.5 text-sm">{snapshot.newLeads.map((l) => <li key={l.id}>{l.name}</li>)}</ul>
        </div>
      )}
      {!!snapshot.convertedLeads?.length && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Converted</p>
          <ul className="space-y-0.5 text-sm">{snapshot.convertedLeads.map((l) => <li key={l.id}>{l.name}{l.notes ? ` — ${l.notes}` : ''}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

const emptySnap: CheckoutSnapshot = {
  date: '', totalLeads: 0, openLeads: 0, newToday: 0, convertedToday: 0, lostToday: 0,
  byStatus: {}, callsToday: 0, followUpsCompleted: 0, dealsWonToday: 0, newLeads: [], convertedLeads: [],
};

export function CheckoutModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: () => void }) {
  const qc = useQueryClient();
  const [remarks, setRemarks] = useState('');
  const preview = useQuery({
    queryKey: ['sales', '/attendance/checkout-preview'],
    queryFn: () => api.data<{ today: { checkOutAt?: string } | null; snapshot: CheckoutSnapshot }>('/sales-crm/attendance/checkout-preview'),
    enabled: open,
    retry: 1,
  });

  useEffect(() => {
    if (open) {
      setRemarks('');
      void preview.refetch();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useMutation({
    mutationFn: () => api.data('/sales-crm/attendance/check-out', 'POST', { remarks }),
    onSuccess: () => {
      toast.success('Checked out. Snapshot sent to admins.');
      void qc.invalidateQueries({ queryKey: ['sales'] });
      void qc.invalidateQueries({ queryKey: ['os-dashboard'] });
      void qc.invalidateQueries({ queryKey: ['bda-attendance-history'] });
      onDone?.();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alreadyOut = Boolean(preview.data?.today?.checkOutAt);
  const snap = preview.data?.snapshot || emptySnap;

  return (
    <SimpleModal open={open} onClose={onClose} title="Check out — daily snapshot">
      {preview.isLoading ? (
        <PageLoading rows={4} />
      ) : preview.isError ? (
        <div className="space-y-4">
          <PageError message={(preview.error as Error).message || 'Could not load today’s snapshot. You can still check out with remarks.'} onRetry={() => preview.refetch()} />
          <div>
            <p className="mb-1 text-xs font-medium">Remarks</p>
            <Textarea rows={3} placeholder="What moved today, pending callbacks, anything admins should know…" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={remarks.trim().length < 8 || submit.isPending} onClick={() => submit.mutate()}>
              {submit.isPending ? 'Sending…' : 'Check out & send'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Review today’s pipeline, add remarks (at least 8 characters), then check out. Admins see this on the company dashboard.</p>
          <CheckoutSnapshotView snapshot={snap} />
          <div>
            <p className="mb-1 text-xs font-medium">Remarks</p>
            <Textarea
              rows={3}
              placeholder="What moved today, pending callbacks, anything admins should know…"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={alreadyOut}
            />
            {remarks.trim().length > 0 && remarks.trim().length < 8 && (
              <p className="mt-1 text-xs text-error">Add at least 8 characters so admins get a real note.</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              disabled={alreadyOut || remarks.trim().length < 8 || submit.isPending}
              onClick={() => submit.mutate()}
            >
              {alreadyOut ? 'Already checked out' : submit.isPending ? 'Sending…' : 'Check out & send'}
            </Button>
          </div>
        </div>
      )}
    </SimpleModal>
  );
}
