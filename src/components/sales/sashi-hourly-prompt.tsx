import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { SimpleModal } from '@/components/shared/simple-modal';
import { Textarea } from '@/components/shared/os-ui';

type Prompt = {
  eligible: boolean;
  hourKey?: string;
  contacted?: number;
  calls?: number;
  submitted?: boolean;
};

function looksLikeSashi(email?: string, name?: string) {
  const blob = `${email || ''} ${name || ''}`.toLowerCase();
  return blob.includes('shashi') || blob.includes('sashi');
}

export function SashiHourlyPrompt() {
  const user = useAuthStore((s) => s.user);
  const enabled = looksLikeSashi(user?.email, user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [reason, setReason] = useState('');

  const q = useQuery({
    queryKey: ['sales', '/hourly-checkin'],
    queryFn: () => api.data<Prompt>('/sales-crm/hourly-checkin'),
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!q.data?.eligible || q.data.submitted || !q.data.hourKey) {
      setOpen(false);
      return;
    }
    const snooze = sessionStorage.getItem(`sashi-hourly-snooze:${q.data.hourKey}`);
    if (snooze && Date.now() < Number(snooze)) return;
    setOpen(true);
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => api.data('/sales-crm/hourly-checkin', 'POST', { remarks, reason }),
    onSuccess: () => {
      toast.success('Hourly update saved');
      setOpen(false);
      setRemarks('');
      setReason('');
      qc.invalidateQueries({ queryKey: ['sales', '/hourly-checkin'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!enabled || !q.data?.eligible || !open) return null;
  const hour = (q.data.hourKey || '').replace('T', ' ');

  return (
    <SimpleModal
      open={open}
      onClose={() => {
        if (q.data?.hourKey) sessionStorage.setItem(`sashi-hourly-snooze:${q.data.hourKey}`, String(Date.now() + 15 * 60_000));
        setOpen(false);
      }}
      title="Hourly update"
      className="max-w-lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Last hour snapshot ({hour} IST). This check-in is only for you.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Contacted</p>
            <p className="text-2xl font-semibold tabular-nums">{q.data.contacted ?? 0}</p>
          </div>
          <div className="rounded-md border px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Calls</p>
            <p className="text-2xl font-semibold tabular-nums">{q.data.calls ?? 0}</p>
          </div>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Remarks</span>
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="What happened this hour?" rows={3} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Why this update</span>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is the contacted count at this number?" rows={3} />
        </label>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (q.data?.hourKey) sessionStorage.setItem(`sashi-hourly-snooze:${q.data.hourKey}`, String(Date.now() + 15 * 60_000));
              setOpen(false);
            }}
          >
            Later
          </Button>
          <Button type="button" disabled={remarks.trim().length < 2 || reason.trim().length < 2 || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : 'Submit update'}
          </Button>
        </div>
      </div>
    </SimpleModal>
  );
}
