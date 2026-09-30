import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, PlugZap, RefreshCw, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormActions, FormField, FormRow, FormStack } from '@/components/layout/page-layout';
import { SimpleModal } from '@/components/shared/simple-modal';
import { formatDate } from '@/lib/utils';

interface DatabaseInfo {
  enabled: boolean;
  dbName: string;
  hint: string;
  status: 'unconfigured' | 'connected' | 'error';
  lastCheckedAt: string | null;
  lastError: string;
  runtime: 'shared' | 'connected' | 'disconnected';
}

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'outline' | 'destructive' }> = {
  connected: { label: 'Connected', variant: 'success' },
  error: { label: 'Error', variant: 'destructive' },
  unconfigured: { label: 'Shared database', variant: 'outline' },
};

export function CompanyDatabaseCard({ organizationId, slug }: { organizationId: string; slug?: string }) {
  const qc = useQueryClient();
  const key = ['admin-org-database', organizationId];
  const base = `/admin/organizations/${organizationId}/database`;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ uri: '', dbName: '' });
  const [tested, setTested] = useState<string>('');

  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api.data<DatabaseInfo>(base) });
  const refresh = (d: DatabaseInfo) => qc.setQueryData(key, d);
  const onErr = (e: Error) => toast.error(e.message);

  const test = useMutation({
    mutationFn: () => api.data<{ latencyMs: number; dbName: string; hint: string }>(`${base}/test`, 'POST', form),
    onSuccess: (r) => { setTested(`Reached ${r.dbName} in ${r.latencyMs} ms (${r.hint})`); toast.success('Connection works'); },
    onError: (e: Error) => { setTested(''); onErr(e); },
  });
  const save = useMutation({
    mutationFn: () => api.data<DatabaseInfo>(base, 'PUT', form),
    onSuccess: (d) => { refresh(d); setOpen(false); setForm({ uri: '', dbName: '' }); setTested(''); toast.success('Company database connected'); },
    onError: onErr,
  });
  const check = useMutation({
    mutationFn: () => api.data<DatabaseInfo>(`${base}/check`, 'POST', {}),
    onSuccess: (d) => { refresh(d); toast[d.status === 'connected' ? 'success' : 'error'](d.status === 'connected' ? 'Database reachable' : 'Database unreachable'); },
    onError: onErr,
  });
  const detach = useMutation({
    mutationFn: () => api.data<DatabaseInfo>(base, 'DELETE'),
    onSuccess: (d) => { refresh(d); toast.success('Company now uses the shared database'); },
    onError: onErr,
  });

  const badge = STATUS_BADGE[data?.status || 'unconfigured'];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 lg:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Database className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">Company database</p>
              {!isLoading && <Badge variant={badge.variant}>{badge.label}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              Logins, users and company settings always stay in the platform database. Business data (leads, clients, projects, invoices…) is stored in
              {data?.enabled ? ' this company\'s own MongoDB database.' : ' the shared platform database until you connect a dedicated one.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data?.enabled && <Button size="sm" variant="outline" disabled={check.isPending} onClick={() => check.mutate()}><RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${check.isPending ? 'animate-spin' : ''}`} />Check</Button>}
            <Button size="sm" onClick={() => { setForm({ uri: '', dbName: data?.dbName || slug || '' }); setTested(''); setOpen(true); }}>
              <PlugZap className="mr-1.5 h-3.5 w-3.5" />{data?.enabled ? 'Change' : 'Connect database'}
            </Button>
            {data?.enabled && (
              <Button size="sm" variant="ghost" className="text-error" disabled={detach.isPending}
                onClick={() => confirm('Disconnect this database? The company will read and write the shared platform database again. Data already in the dedicated database is not copied back.') && detach.mutate()}>
                <Unplug className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {data?.enabled && (
          <dl className="grid gap-3 rounded-md border bg-surface-soft p-4 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-muted-foreground">Connection</dt><dd className="truncate font-mono text-xs">{data.hint || '—'}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Database</dt><dd className="font-mono text-xs">{data.dbName}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Last checked</dt><dd>{data.lastCheckedAt ? formatDate(data.lastCheckedAt) : '—'}{data.runtime === 'connected' && <span className="ml-2 text-xs text-success">● live</span>}</dd></div>
            {data.lastError && <div className="sm:col-span-3"><dt className="text-xs text-muted-foreground">Last error</dt><dd className="text-xs text-error">{data.lastError}</dd></div>}
          </dl>
        )}
      </CardContent>

      <SimpleModal open={open} onClose={() => setOpen(false)} title={data?.enabled ? 'Change company database' : 'Connect company database'}>
        <FormStack>
          <p className="text-sm text-muted-foreground">
            The connection string is encrypted at rest and never shown again — only a masked hint is kept. Switching databases does not migrate existing data.
          </p>
          <FormField>
            <Label>MongoDB connection string *</Label>
            <Input type="password" autoComplete="off" placeholder="mongodb+srv://<user>:<password>@<cluster>/" value={form.uri} onChange={(e) => { setForm({ ...form, uri: e.target.value }); setTested(''); }} />
          </FormField>
          <FormRow>
            <FormField>
              <Label>Database name</Label>
              <Input placeholder={slug || 'company_db'} value={form.dbName} onChange={(e) => { setForm({ ...form, dbName: e.target.value }); setTested(''); }} />
            </FormField>
          </FormRow>
          {tested && <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">{tested}</p>}
          <FormActions>
            <Button variant="outline" disabled={!form.uri || test.isPending} onClick={() => test.mutate()}>{test.isPending ? 'Testing…' : 'Test connection'}</Button>
            <Button disabled={!form.uri || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Connecting…' : 'Save & connect'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </Card>
  );
}
