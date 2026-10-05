import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatBytes, formatNumber } from '@/lib/utils';

export interface DatabaseUsage {
  mode: 'dedicated' | 'shared';
  connection: string;
  dbName: string;
  users: number;
  documents: number;
  dataSize: number;
  database: { storageSize: number; indexSize: number; collections: number } | null;
  collections: { name: string; documents: number; dataSize: number }[];
  measuredAt: string;
}

const humanizeCollection = (name: string) => name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function DatabaseUsagePanel({ organizationId }: { organizationId: string }) {
  const [showAll, setShowAll] = useState(false);
  const [fresh, setFresh] = useState(0);
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-org-database-usage', organizationId, fresh],
    queryFn: () => api.data<DatabaseUsage>(`/admin/organizations/${organizationId}/database/usage${fresh ? '?fresh=1' : ''}`),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Measuring MongoDB usage…</p>;
  if (error || !data) return <p className="text-sm text-error">{(error as Error)?.message || 'Could not measure usage'}</p>;

  const top = showAll ? data.collections : data.collections.slice(0, 8);
  const max = Math.max(1, ...data.collections.map((c) => c.dataSize));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">MongoDB usage</p>
          <p className="text-xs text-muted-foreground">
            Shared platform database · updated {new Date(data.measuredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={isFetching} onClick={() => setFresh(Date.now())}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Documents" value={formatNumber(data.documents)} hint={`${data.collections.length} collections in use`} />
        <Stat label="Data size" value={formatBytes(data.dataSize)} hint="estimated" />
        <Stat label="Logins" value={formatNumber(data.users)} hint="users in platform database" />
        <Stat label="Database" value={data.dbName} hint="single shared database" />
      </div>

      <dl className="grid gap-1 rounded-md border bg-surface-soft p-3 text-xs sm:grid-cols-[120px_1fr]">
        <dt className="text-muted-foreground">Database URL</dt>
        <dd className="truncate font-mono" title={data.connection}>{data.connection || '—'}</dd>
        <dt className="text-muted-foreground">Database name</dt>
        <dd className="font-mono">{data.dbName}</dd>
      </dl>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-surface-soft/60 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Collection</th>
              <th className="px-3 py-2 font-medium text-right">Docs</th>
              <th className="px-3 py-2 font-medium text-right">Size</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">Share</th>
            </tr>
          </thead>
          <tbody>
            {top.map((c) => (
              <tr key={c.name} className="border-b last:border-0">
                <td className="px-3 py-2 font-medium">{humanizeCollection(c.name)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(c.documents)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatBytes(c.dataSize)}</td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (c.dataSize / max) * 100)}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.collections.length > 8 && (
          <button type="button" className="w-full border-t px-3 py-2 text-xs text-muted-foreground hover:bg-surface-soft" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show less' : `Show all ${data.collections.length} collections`}
          </button>
        )}
      </div>
    </div>
  );
}

export function CompanyDatabaseCard({ organizationId }: { organizationId: string; slug?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 lg:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Database className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">Company database</p>
              <Badge variant="outline">Shared database</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              All companies use one shared platform MongoDB. Dedicated per-company databases are disabled so seeds, admin, and production always see the same data.
            </p>
          </div>
        </div>
        <DatabaseUsagePanel organizationId={organizationId} />
      </CardContent>
    </Card>
  );
}
