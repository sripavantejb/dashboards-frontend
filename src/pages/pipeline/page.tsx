import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, FileText, Handshake, PhoneCall, Trophy, Users, X, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useCan } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { Select, StatusPill, inr } from '@/components/shared/os-ui';
import type { LeadCategory } from '@/types';

type StageKey = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'converted';
type ColumnKey = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'lost' | 'on_hold';

interface PipelineLead {
  _id: string;
  firstName: string;
  lastName?: string;
  company?: string;
  status: string;
  estimatedValue?: number;
  assignedTo?: { firstName: string; lastName: string } | null;
}

interface PipelineAnalytics {
  total: number;
  stages: { key: StageKey; reached: number }[];
  openValue: number;
  openCount: number;
  converted: number;
  lost: number;
  onHold: number;
  winRate: number;
  columns: { key: ColumnKey; leads: PipelineLead[]; total: number }[];
  owners: { id: string; name: string }[];
  sources: string[];
}

const STAGE_COPY: Record<StageKey, { title: string; advanced: string; dropped: string; icon: LucideIcon }> = {
  new: { title: 'Total leads', advanced: 'Leads', dropped: '', icon: Users },
  contacted: { title: 'Contacted', advanced: 'Contacted', dropped: 'Not contacted', icon: PhoneCall },
  qualified: { title: 'Qualified', advanced: 'Qualified', dropped: 'Not qualified', icon: BadgeCheck },
  proposal: { title: 'Proposal sent', advanced: 'Proposal sent', dropped: 'No proposal', icon: FileText },
  negotiation: { title: 'Negotiation', advanced: 'Negotiating', dropped: 'Stalled before negotiation', icon: Handshake },
  converted: { title: 'Converted', advanced: 'Converted', dropped: 'Not converted', icon: Trophy },
};
const STEP_COLORS = ['#1e3a5f', '#1f4b7a', '#2a5d8c', '#3a7299', '#4887a3', '#4f9ea5'];
const COLUMN_LABELS: Record<ColumnKey, string> = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified', proposal: 'Proposal', negotiation: 'Negotiation', lost: 'Lost', on_hold: 'On hold',
};
const RANGES = [
  { value: 'all', label: 'All time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '365d', label: 'Last 12 months' },
];

const pct = (n: number, d: number) => (d === 0 ? '0.0' : ((n / d) * 100).toFixed(1));
const leadName = (l: PipelineLead) => `${l.firstName} ${l.lastName || ''}`.trim();

function StageCards({ data }: { data: PipelineAnalytics }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {data.stages.map((s, i) => {
        const copy = STAGE_COPY[s.key];
        const prev = data.stages[i - 1];
        return (
          <div key={s.key} className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{copy.title}</p>
              <copy.icon className="h-4 w-4 text-[#1e3a5f]" />
            </div>
            <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{s.reached.toLocaleString('en-IN')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {i === 0 ? 'Base stage: 100.0%' : `${pct(s.reached, prev.reached)}% from ${STAGE_COPY[prev.key].title}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function SummaryTiles({ data }: { data: PipelineAnalytics }) {
  const tiles = [
    { label: 'Open pipeline value', value: inr(data.openValue), note: `${data.openCount} open lead${data.openCount === 1 ? '' : 's'}` },
    { label: 'Win rate', value: `${data.winRate.toFixed(1)}%`, note: 'Converted vs lost' },
    { label: 'Lost', value: data.lost.toLocaleString('en-IN'), note: `${pct(data.lost, data.total)}% of all leads` },
    { label: 'On hold', value: data.onHold.toLocaleString('en-IN'), note: `${pct(data.onHold, data.total)}% of all leads` },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border bg-surface-soft p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t.label}</p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{t.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.note}</p>
        </div>
      ))}
    </div>
  );
}

function PipelineFunnel({ data }: { data: PipelineAnalytics }) {
  const max = Math.max(data.total, 1);
  const steps = data.stages.map((s, i) => {
    const copy = STAGE_COPY[s.key];
    return {
      key: s.key,
      label: i === 0 ? 'Total leads added' : copy.title,
      cohort: i === 0 ? data.total : data.stages[i - 1].reached,
      advanced: s.reached,
      advancedLabel: copy.advanced,
      droppedLabel: copy.dropped || 'Dropped',
      color: STEP_COLORS[i],
    };
  });

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.14em]">Funnel visualization</h3>
          <p className="mt-1 text-xs text-muted-foreground">Advanced vs dropped at each step (bar width = cohort size)</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#1e3a5f]" />Advanced</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#e2e8f0]" />Dropped</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {steps.map((s) => {
          const dropped = s.cohort - s.advanced;
          const advancedPct = s.cohort ? (s.advanced / s.cohort) * 100 : 0;
          return (
            <div key={s.key} className="grid grid-cols-[110px_1fr] items-center gap-3 sm:grid-cols-[180px_1fr]">
              <p className="truncate text-right text-xs text-muted-foreground sm:text-sm">{s.label}</p>
              {s.cohort === 0 ? (
                <p className="text-xs text-muted-foreground">No leads</p>
              ) : (
                <div className="group relative h-8">
                  <div className="flex h-8 overflow-hidden rounded-md bg-[#e2e8f0]" style={{ width: `${Math.max((s.cohort / max) * 100, 1)}%` }}>
                    <div className="flex items-center justify-center text-xs font-semibold text-white" style={{ width: `${advancedPct}%`, background: s.color }}>
                      {advancedPct > 12 && s.advanced}
                    </div>
                    <div className="flex flex-1 items-center justify-center text-xs font-semibold text-[#475569]">
                      {100 - advancedPct > 12 && dropped}
                    </div>
                  </div>
                  <div className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-64 rounded-lg border bg-popover p-3 text-xs shadow-lg group-hover:block">
                    <p className="font-semibold">{s.label}</p>
                    <p className="mt-1 text-muted-foreground">Cohort: {s.cohort}</p>
                    <p style={{ color: s.color }}>{s.advancedLabel}: {s.advanced} ({pct(s.advanced, s.cohort)}%)</p>
                    <p className="text-muted-foreground">{s.droppedLabel}: {dropped} ({pct(dropped, s.cohort)}%)</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="grid grid-cols-[110px_1fr] gap-3 sm:grid-cols-[180px_1fr]">
          <span />
          <div className="relative h-4 border-t text-[10px] text-muted-foreground">
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <span key={f} className="absolute top-1 -translate-x-1/2" style={{ left: `${f * 100}%` }}>{Math.round(f * max)}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PendingMove { lead: PipelineLead; from: ColumnKey; to: ColumnKey }

function PipelineBoard({ data, canWrite }: { data: PipelineAnalytics; canWrite: boolean }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [reason, setReason] = useState('');
  const [over, setOver] = useState<ColumnKey | null>(null);

  const move = useMutation({
    mutationFn: (m: PendingMove) => api.data(`/leads/${m.lead._id}/move`, 'POST', { status: m.to, reason }),
    onSuccess: (_, m) => {
      toast.success(`${leadName(m.lead)} moved to ${COLUMN_LABELS[m.to]}`);
      setPending(null);
      setReason('');
      qc.invalidateQueries({ queryKey: ['pipeline-analytics'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (lead: PipelineLead) => api.data(`/leads/${lead._id}`, 'DELETE'),
    onSuccess: () => { toast.success('Lead deleted'); qc.invalidateQueries({ queryKey: ['pipeline-analytics'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const request = (lead: PipelineLead, from: ColumnKey, to: ColumnKey) => {
    if (from === to) return;
    setPending({ lead, from, to });
    setReason('');
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-display text-lg font-semibold">Pipeline board</h3>

      {pending && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#1e3a5f]/30 bg-[#1e3a5f]/5 p-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Move lead</p>
            <p className="mt-1 text-sm">
              <span className="font-semibold">{leadName(pending.lead)}</span>: {COLUMN_LABELS[pending.from]} → <StatusPill value={pending.to} />
            </p>
            <Input
              autoFocus
              className="mt-2"
              placeholder="e.g. Met stakeholder / proposal sent"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && reason.trim() && move.mutate(pending)}
            />
            <p className="mt-1 text-xs text-muted-foreground">Reason is required</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPending(null)}>Cancel</Button>
            <Button disabled={!reason.trim() || move.isPending} onClick={() => move.mutate(pending)}>{move.isPending ? 'Moving…' : 'Confirm move'}</Button>
          </div>
        </div>
      )}

      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {data.columns.map((col) => (
          <div
            key={col.key}
            className={cn('flex w-64 shrink-0 flex-col rounded-[20px] border bg-card shadow-card transition-colors', over === col.key && 'border-[#1e3a5f] bg-[#1e3a5f]/5')}
            onDragOver={(e) => { if (canWrite) { e.preventDefault(); setOver(col.key); } }}
            onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
            onDrop={(e) => {
              setOver(null);
              if (!canWrite) return;
              try {
                const { leadId, from } = JSON.parse(e.dataTransfer.getData('application/json')) as { leadId: string; from: ColumnKey };
                const lead = data.columns.find((c) => c.key === from)?.leads.find((l) => l._id === leadId);
                if (lead) request(lead, from, col.key);
              } catch { /* not a lead card */ }
            }}
          >
            <div className="border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.12em]">{COLUMN_LABELS[col.key]}</p>
                <span className="text-xs text-muted-foreground">{col.leads.length}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{inr(col.total)}</p>
            </div>
            <div className="flex max-h-[520px] min-h-24 flex-col gap-2 overflow-y-auto p-3">
              {col.leads.map((lead) => (
                <div
                  key={lead._id}
                  draggable={canWrite}
                  onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ leadId: lead._id, from: col.key }))}
                  className={cn('group rounded-xl border bg-background p-3', canWrite && 'cursor-grab active:cursor-grabbing')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/crm/${lead._id}`} className="min-w-0 hover:underline">
                      <p className="truncate text-sm font-medium">{leadName(lead)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.company || (lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : '—')}
                      </p>
                    </Link>
                    {canWrite && (
                      <button
                        type="button"
                        aria-label={`Delete ${leadName(lead)}`}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                        onClick={() => confirm(`Delete lead "${leadName(lead)}"?`) && remove.mutate(lead)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <StatusPill value={lead.status} />
                    {!!lead.estimatedValue && <span className="text-xs tabular-nums text-muted-foreground">{inr(lead.estimatedValue)}</span>}
                  </div>
                  {canWrite && (
                    <select
                      aria-label="Move to stage"
                      className="mt-2 h-7 w-full rounded border border-input bg-background px-1 text-[11px] text-muted-foreground md:hidden"
                      value={col.key}
                      onChange={(e) => request(lead, col.key, e.target.value as ColumnKey)}
                    >
                      {data.columns.map((c) => <option key={c.key} value={c.key}>{COLUMN_LABELS[c.key]}</option>)}
                    </select>
                  )}
                </div>
              ))}
              {col.leads.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No leads</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const can = useCan();
  const [filters, setFilters] = useState({ range: 'all', owner: '', source: '', categoryId: '' });
  const params = new URLSearchParams(Object.entries(filters).filter(([k, v]) => v && !(k === 'range' && v === 'all')));
  const filtered = params.toString() !== '';

  const { data: categories } = useQuery({ queryKey: ['lead-categories'], queryFn: () => api.data<LeadCategory[]>('/lead-categories') });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pipeline-analytics', params.toString()],
    queryFn: () => api.data<PipelineAnalytics>(`/leads/pipeline/analytics${filtered ? `?${params}` : ''}`),
    placeholderData: (prev) => prev,
  });

  const set = (patch: Partial<typeof filters>) => setFilters({ ...filters, ...patch });

  return (
    <>
      <PageHeader title="Pipeline" description="Sales funnel analytics — how leads advance and where they drop. Converted deals live under Conversions." />

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Period
          <Select className="w-44" value={filters.range} onChange={(e) => set({ range: e.target.value })}>
            {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Owner
          <Select className="w-44" value={filters.owner} onChange={(e) => set({ owner: e.target.value })}>
            <option value="">Everyone</option>
            {data?.owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Source
          <Select className="w-44" value={filters.source} onChange={(e) => set({ source: e.target.value })}>
            <option value="">All sources</option>
            {data?.sources.map((s) => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </Select>
        </label>
        {(categories?.length ?? 0) > 1 && (
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Category
            <Select className="w-44" value={filters.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
              <option value="">All categories</option>
              {categories!.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>
          </label>
        )}
        {filtered && (
          <Button variant="ghost" onClick={() => setFilters({ range: 'all', owner: '', source: '', categoryId: '' })}>Clear</Button>
        )}
      </div>

      {isError ? (
        <PageError onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <PageLoading rows={4} />
      ) : (
        <div className="flex flex-col gap-6">
          <StageCards data={data} />
          <SummaryTiles data={data} />
          <PipelineFunnel data={data} />
          <PipelineBoard data={data} canWrite={can('leads:write')} />
        </div>
      )}
    </>
  );
}
