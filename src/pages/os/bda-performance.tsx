import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { PageGrid } from '@/components/layout/page-layout';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { SectionCard, StatCard, StatusPill, fmtDateTime, humanize } from '@/components/shared/os-ui';
import { Button } from '@/components/ui/button';

type Board = {
  date: string;
  hourKey: string;
  totals: { bdas: number; contacting: number; callsToday: number; openLeads: number };
  rows: Array<{
    employeeId: string;
    name: string;
    employeeCode: string;
    checkInStatus: string;
    callsToday: number;
    contactedLastHour: number;
    callsLastHour: number;
    openLeads: number;
    followUpsDue: number;
    openDeals: number;
    pipeline: Record<string, number>;
    lastActivity: string;
  }>;
  hourly: Array<{ title: string; detail: string; actorName: string; createdAt: string }>;
  checkins: Array<{
    id: string;
    name: string;
    hourKey: string;
    contacted: number;
    calls: number;
    remarks: string;
    reason: string;
    createdAt: string;
  }>;
};

type LeadAudit = {
  checked: number;
  windowDays: number;
  model: string;
  modelReviewed: number;
  totals: { mock: number; suspicious: number };
  bdas: Array<{
    employeeId: string;
    name: string;
    employeeCode: string;
    checked: number;
    mock: number;
    suspicious: number;
    leads: Array<{
      id: string;
      contactPerson: string;
      company: string;
      phone: string;
      email: string;
      city: string;
      source: string;
      createdAt: string;
      verdict: 'mock' | 'suspicious';
      reasons: string[];
    }>;
  }>;
};

export function BdaPerformancePage() {
  const q = useQuery({
    queryKey: ['sales', '/team-board'],
    queryFn: () => api.data<Board>('/sales-crm/team-board'),
    refetchInterval: 60_000,
  });
  const audit = useQuery({
    queryKey: ['sales', '/lead-audit'],
    queryFn: () => api.data<LeadAudit>('/sales-crm/lead-audit'),
    staleTime: 5 * 60_000,
  });

  if (q.isError) return <PageError onRetry={() => q.refetch()} />;
  if (q.isLoading || !q.data) return <PageLoading />;
  const d = q.data;

  return (
    <>
      <PageHeader
        title="BDA performance"
        description={`Side-by-side snapshot for ${d.date}. Last hour is ${d.hourKey.replace('T', ' ')} IST.`}
      />
      <PageGrid cols="4">
        <StatCard label="BDAs" value={d.totals.bdas} />
        <StatCard label="Contacting today" value={d.totals.contacting} />
        <StatCard label="Calls today" value={d.totals.callsToday} />
        <StatCard label="Open leads" value={d.totals.openLeads} />
      </PageGrid>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {d.rows.map((row) => (
          <SectionCard key={row.employeeId} title={row.name} action={<span className="font-mono text-[11px] text-muted-foreground">{row.employeeCode}</span>}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <StatusPill value={row.checkInStatus} />
              <span className="text-xs text-muted-foreground">{row.lastActivity || 'No recent activity'}</span>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border px-3 py-2"><dt className="text-[11px] uppercase text-muted-foreground">Contacted · last hour</dt><dd className="text-lg font-semibold tabular-nums">{row.contactedLastHour}</dd></div>
              <div className="rounded-md border px-3 py-2"><dt className="text-[11px] uppercase text-muted-foreground">Calls · last hour</dt><dd className="text-lg font-semibold tabular-nums">{row.callsLastHour}</dd></div>
              <div className="rounded-md border px-3 py-2"><dt className="text-[11px] uppercase text-muted-foreground">Calls today</dt><dd className="font-medium tabular-nums">{row.callsToday}</dd></div>
              <div className="rounded-md border px-3 py-2"><dt className="text-[11px] uppercase text-muted-foreground">Open leads</dt><dd className="font-medium tabular-nums">{row.openLeads}</dd></div>
              <div className="rounded-md border px-3 py-2"><dt className="text-[11px] uppercase text-muted-foreground">Follow-ups due</dt><dd className="font-medium tabular-nums">{row.followUpsDue}</dd></div>
              <div className="rounded-md border px-3 py-2"><dt className="text-[11px] uppercase text-muted-foreground">Open deals</dt><dd className="font-medium tabular-nums">{row.openDeals}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Pipeline: {Object.entries(row.pipeline || {}).filter(([, n]) => n).map(([k, n]) => `${humanize(k)} ${n}`).join(' · ') || '—'}
            </p>
          </SectionCard>
        ))}
      </div>

      <SectionCard
        title="Lead quality"
        action={<Button size="sm" variant="outline" disabled={audit.isFetching} onClick={() => audit.refetch()}>{audit.isFetching ? 'Checking…' : 'Check again'}</Button>}
      >
        {audit.isLoading ? <p className="text-sm text-muted-foreground">Checking mobiles, names, and whether the details look made up…</p> : null}
        {audit.isError ? <p className="text-sm text-destructive">Lead check failed. Try again.</p> : null}
        {audit.data ? (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              Checked {audit.data.checked} leads from the last {audit.data.windowDays} days.
              {' '}{audit.data.totals.mock} look like mock leads, {audit.data.totals.suspicious} need a second look.
              {audit.data.model ? ` Model ${audit.data.model} reviewed ${audit.data.modelReviewed} doubtful leads.` : ' Model key is not set, so only phone and placeholder rules ran.'}
            </p>
            {audit.data.totals.mock + audit.data.totals.suspicious === 0 ? (
              <p className="text-sm text-muted-foreground">No mock or incomplete leads in this window.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {audit.data.bdas.filter((b) => b.mock || b.suspicious).map((bda) => (
                  <div key={bda.employeeId || bda.name} className="rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="font-medium">{bda.name}</p>
                      <p className="text-xs text-muted-foreground">{bda.mock} mock · {bda.suspicious} to review · {bda.checked} checked</p>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {bda.leads.map((lead) => (
                        <li key={lead.id} className="border-t pt-2">
                          <p className="font-medium">{lead.contactPerson || 'No name'}{lead.company ? ` · ${lead.company}` : ''}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.phone || 'No mobile'}{lead.email ? ` · ${lead.email}` : ''}{lead.city ? ` · ${lead.city}` : ''} · {humanize(lead.verdict)}
                          </p>
                          <p className="text-xs">{lead.reasons.join(' · ')}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </SectionCard>

      <PageGrid cols="2">
        <SectionCard title="Hourly updates">
          {d.hourly.length === 0 ? <p className="text-sm text-muted-foreground">Nothing logged in the last hour.</p> : (
            <ul className="divide-y text-sm">
              {d.hourly.map((e, i) => (
                <li key={`${e.createdAt}-${i}`} className="py-2">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.actorName} · {fmtDateTime(e.createdAt)}{e.detail ? ` · ${e.detail}` : ''}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Sashi hourly remarks">
          {d.checkins.length === 0 ? <p className="text-sm text-muted-foreground">No hourly remarks yet.</p> : (
            <ul className="divide-y text-sm">
              {d.checkins.map((c) => (
                <li key={c.id} className="py-2">
                  <p className="font-medium">{c.name} · {c.contacted} contacted · {c.calls} calls</p>
                  <p className="text-xs text-muted-foreground">{c.hourKey.replace('T', ' ')} · {fmtDateTime(c.createdAt)}</p>
                  <p className="mt-1">{c.remarks}</p>
                  <p className="text-xs text-muted-foreground">Why: {c.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </PageGrid>
    </>
  );
}
