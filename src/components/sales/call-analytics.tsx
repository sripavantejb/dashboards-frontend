import { PageGrid } from '@/components/layout/page-layout';
import { SectionCard, StatCard } from '@/components/shared/os-ui';
import { formatCallDuration } from '@/lib/calling';

export interface CallAnalyticsData {
  totalCalls: number;
  connectedCalls: number;
  noAnswerCalls: number;
  totalDurationSeconds: number | null;
  interestedLeads: number;
  followUpsCreated: number;
  byEmployee: { employeeId: string; name: string; calls: number }[];
}

export function CallAnalytics({ data }: { data?: CallAnalyticsData | null }) {
  if (!data) return null;
  const duration = data.totalDurationSeconds == null ? '—' : formatCallDuration(data.totalDurationSeconds);
  return (
    <>
      <PageGrid cols="3">
        <StatCard label="Total calls today" value={data.totalCalls} />
        <StatCard label="Connected calls" value={data.connectedCalls} hint="Someone answered" />
        <StatCard label="No-answer calls" value={data.noAnswerCalls} />
        <StatCard label="Total call duration" value={duration} hint="Timed in the CRM, not by the carrier" />
        <StatCard label="Interested leads" value={data.interestedLeads} tone="success" />
        <StatCard label="Follow-ups created" value={data.followUpsCreated} />
      </PageGrid>
      {data.byEmployee.length > 0 && (
        <SectionCard title="Calls by employee">
          <ul className="divide-y">
            {data.byEmployee.map((row) => (
              <li key={row.employeeId} className="flex items-center justify-between py-2 text-sm">
                <span>{row.name}</span>
                <span className="tabular-nums text-muted-foreground">{row.calls}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </>
  );
}
