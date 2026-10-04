import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { Bell, Copy, Eye, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Breadcrumbs, PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormRow, FormStack, PageGrid, PageToolbar } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { ResourcePage, type FieldDef } from '@/components/shared/resource-page';
import { DataTable, KeyValue, SectionCard, Select, StatCard, StatusPill, Tabs, Textarea, fmtDate, fmtDateTime, humanize, inr, toDateInput } from '@/components/shared/os-ui';
import { ActivityList } from './delivery';

type Any = Record<string, any>;
const onErr = (e: Error) => toast.error(e.message);
const TRACKER_STATUSES = ['not_yet_started', 'started', 'in_progress', 'blocked', 'recursive', 'completed', 'not_needed'];
const TRACKER_PRIORITIES = ['urgent', 'high', 'medium', 'low'];

// ---------------------------------------------------------------- master tracker
export function TrackerPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState({ kind: '', status: 'open', mine: false, search: '' });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Any>({});
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['tracker'], queryFn: () => api.data<Any>('/tracker') });
  const refresh = () => qc.invalidateQueries({ queryKey: ['tracker'] });
  const patch = useMutation({
    mutationFn: ({ id, field, value, values }: { id: string; field: string; value?: string; values?: string[] }) => api.data(`/tracker/${id}`, 'PATCH', { field, value, values }),
    onSuccess: () => refresh(),
    onError: onErr,
  });
  const act = useMutation({
    mutationFn: ({ path, method = 'POST', body }: { path: string; method?: 'POST' | 'DELETE'; body?: unknown }) => api.data<Any>(`/tracker${path}`, method, body ?? (method === 'POST' ? {} : undefined)),
    onSuccess: (r) => { toast.success(r?.message || 'Done'); refresh(); },
    onError: onErr,
  });
  const create = useMutation({
    mutationFn: () => api.data('/tracker', 'POST', { ...form, deadline: form.kind === 'deadline' ? form.deadline || undefined : undefined }),
    onSuccess: () => { toast.success('Row added'); setOpen(false); refresh(); },
    onError: onErr,
  });

  const team: Any[] = data?.team || [];
  const nameOf = (id: string) => team.find((m) => m.id === id)?.name || '—';
  const rows = useMemo(() => (data?.rows || []).filter((r: Any) => {
    if (filter.kind && r.kind !== filter.kind) return false;
    if (filter.status === 'open' && ['completed', 'not_needed'].includes(r.status)) return false;
    if (filter.status && filter.status !== 'open' && filter.status !== 'all' && r.status !== filter.status) return false;
    if (filter.mine && r.poc !== user?.id && !(r.dependency || []).includes(user?.id)) return false;
    if (filter.search && !`${r.projectName} ${r.taskName} ${r.remarks}`.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  }), [data, filter, user]);

  if (isError) return <PageError onRetry={() => refetch()} />;
  if (isLoading || !data) return <PageLoading rows={6} />;
  const checkedIn = (data.checkIns || []).filter((c: Any) => c.checkedInAt).length;

  return (
    <>
      <PageHeader title="Master Tracker" description="Daily and deadline work across the team. Everyone involved is notified when a row changes."
        action={
          <>
            <Button variant="outline" onClick={() => act.mutate({ path: '/reminders', body: { slot: 'morning' } })}><Send className="mr-2 h-4 w-4" />Morning reminders</Button>
            <Button variant="outline" onClick={() => act.mutate({ path: '/reminders', body: { slot: 'deadline' } })}><Bell className="mr-2 h-4 w-4" />Deadline reminders</Button>
            <Button onClick={() => { setForm({ date: toDateInput(new Date()), projectName: '', taskName: '', poc: user?.id || '', dependency: [], status: 'not_yet_started', priority: 'medium', kind: 'deadline', deadline: '', remarks: '' }); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add row</Button>
          </>
        } />
      <PageGrid cols="4">
        <StatCard label="Open rows" value={(data.rows || []).filter((r: Any) => !['completed', 'not_needed'].includes(r.status)).length} />
        <StatCard label="Blocked" value={(data.rows || []).filter((r: Any) => r.status === 'blocked').length} tone="danger" />
        <StatCard label="Mine" value={(data.rows || []).filter((r: Any) => r.poc === user?.id && !['completed', 'not_needed'].includes(r.status)).length} />
        <StatCard label="Checked in today" value={`${checkedIn}/${team.length}`} hint={data.myCheckInAt ? `You: ${fmtDateTime(data.myCheckInAt)}` : undefined} />
      </PageGrid>
      <PageToolbar>
        <Input className="sm:max-w-xs" placeholder="Search project or task…" value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} />
        <Select className="sm:w-44" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
          <option value="open">Open</option><option value="all">All</option>
          {TRACKER_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </Select>
        <Select className="sm:w-40" value={filter.kind} onChange={(e) => setFilter({ ...filter, kind: e.target.value })}>
          <option value="">All kinds</option><option value="deadline">Deadline</option><option value="daily">Daily</option>
        </Select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={filter.mine} onChange={(e) => setFilter({ ...filter, mine: e.target.checked })} />Only mine</label>
      </PageToolbar>
      <DataTable rows={rows} empty="No rows match these filters."
        columns={[
          { key: 'date', header: 'Date', render: (r) => <span className="whitespace-nowrap text-xs">{fmtDate(r.date)}</span> },
          { key: 'task', header: 'Project · Task', className: 'min-w-[200px]', render: (r) => <div><p className="font-medium">{r.taskName}</p><p className="text-xs text-muted-foreground">{r.projectName} · {humanize(r.kind)}{r.deadline && ` · due ${fmtDateTime(r.deadline)}`}</p></div> },
          {
            key: 'poc', header: 'POC', render: (r) => (
              <Select className="h-8 w-36 text-xs" value={r.poc || ''} onChange={(e) => patch.mutate({ id: r._id, field: 'poc', value: e.target.value })}>
                <option value="">—</option>{team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            ),
          },
          { key: 'dependency', header: 'Depends on', render: (r) => <span className="text-xs">{(r.dependency || []).map(nameOf).join(', ') || '—'}</span> },
          {
            key: 'status', header: 'Status', render: (r) => (
              <Select className="h-8 w-40 text-xs" value={r.status} onChange={(e) => patch.mutate({ id: r._id, field: 'status', value: e.target.value })}>
                {TRACKER_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
              </Select>
            ),
          },
          {
            key: 'priority', header: 'Priority', render: (r) => (
              <Select className="h-8 w-28 text-xs" value={r.priority} onChange={(e) => patch.mutate({ id: r._id, field: 'priority', value: e.target.value })}>
                {TRACKER_PRIORITIES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
              </Select>
            ),
          },
          {
            key: 'remarks', header: 'Remarks', className: 'min-w-[180px]', render: (r) => (
              <Input className="h-8 text-xs" defaultValue={r.remarks} onBlur={(e) => e.target.value !== r.remarks && patch.mutate({ id: r._id, field: 'remarks', value: e.target.value })} />
            ),
          },
          {
            key: 'x', header: '', className: 'w-px', render: (r) => (
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" title="Remind POC" onClick={() => act.mutate({ path: `/${r._id}/remind` })}><Bell className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-error" title="Delete" onClick={() => window.confirm('Delete this row?') && act.mutate({ path: `/${r._id}`, method: 'DELETE' })}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ),
          },
        ]} />
      <SimpleModal open={open} onClose={() => setOpen(false)} title="Add tracker row">
        <FormStack>
          <FormRow>
            <FormField><Label>Project *</Label>
              <Input list="tracker-projects" value={form.projectName || ''} onChange={(e) => setForm({ ...form, projectName: e.target.value })} />
              <datalist id="tracker-projects">{(data.projectNames || []).map((n: string) => <option key={n} value={n} />)}</datalist>
            </FormField>
            <FormField><Label>Task *</Label><Input value={form.taskName || ''} onChange={(e) => setForm({ ...form, taskName: e.target.value })} /></FormField>
          </FormRow>
          <FormRow>
            <FormField><Label>Date *</Label><Input type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} /></FormField>
            <FormField><Label>Kind</Label><Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="deadline">Deadline task</option><option value="daily">Daily task</option></Select></FormField>
          </FormRow>
          {form.kind === 'deadline' && <FormField><Label>Deadline (IST)</Label><Input type="datetime-local" value={form.deadline || ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></FormField>}
          <FormRow>
            <FormField><Label>POC</Label><Select value={form.poc} onChange={(e) => setForm({ ...form, poc: e.target.value })}><option value="">—</option>{team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></FormField>
            <FormField><Label>Priority</Label><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{TRACKER_PRIORITIES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}</Select></FormField>
          </FormRow>
          <FormField><Label>Depends on</Label>
            <div className="flex flex-wrap gap-2">
              {team.filter((m) => m.id !== form.poc).map((m) => {
                const on = (form.dependency || []).includes(m.id);
                return (
                  <button key={m.id} type="button" onClick={() => setForm({ ...form, dependency: on ? form.dependency.filter((d: string) => d !== m.id) : [...(form.dependency || []), m.id] })}
                    className={`rounded-full border px-2.5 py-1 text-xs ${on ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{m.name}</button>
                );
              })}
            </div>
          </FormField>
          <FormField><Label>Remarks</Label><Textarea value={form.remarks || ''} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.projectName || !form.taskName || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Adding…' : 'Add row'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}

// ---------------------------------------------------------------- projects vault
const VAULT_FIELDS: FieldDef[] = [
  { name: 'name', label: 'Project name', required: true },
  { name: 'productionUrl', label: 'Production URL', required: true, placeholder: 'https://' },
  { name: 'localUrl', label: 'Local / staging URL' },
  { name: 'loginEmail', label: 'Demo login email', type: 'email' },
  { name: 'password', label: 'Demo password', type: 'password', help: 'Stored encrypted. Leave blank to keep the current password.' },
  { name: 'category', label: 'Category' },
  { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'archived'] },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'targetIndustry', label: 'Target industry' },
  { name: 'idealCustomer', label: 'Ideal customer', type: 'textarea' },
  { name: 'sellingPoints', label: 'Selling points', type: 'textarea' },
  { name: 'commonObjections', label: 'Common objections', type: 'textarea' },
  { name: 'bestPitchAngle', label: 'Best pitch angle', type: 'textarea' },
  { name: 'pricingNotes', label: 'Pricing notes', type: 'textarea' },
  { name: 'competitors', label: 'Competitors' },
  { name: 'demoNotes', label: 'Demo notes', type: 'textarea' },
];

async function reveal(path: string) {
  try {
    const r = await api.data<{ password: string }>(path, 'POST', {});
    await navigator.clipboard.writeText(r.password || '');
    toast.success(r.password ? 'Password copied to clipboard' : 'No password stored');
  } catch (e) {
    onErr(e as Error);
  }
}

export function VaultPage() {
  return (
    <ResourcePage
      title="Projects Vault"
      description="Demo projects the sales team can pitch, with talking points, templates and pitch history."
      endpoint="/vault"
      writePermission="vault:write"
      createLabel="Add project"
      fields={VAULT_FIELDS}
      allowDelete
      deleteLabel="Archive"
      filters={[{ name: 'status', label: 'Statuses', options: ['active', 'inactive', 'archived'] }]}
      rowHref={(r) => `/projects-vault/${r._id}`}
      rowActions={(r) => r.hasPassword && <Button size="icon" variant="ghost" className="h-8 w-8" title="Copy password" onClick={() => reveal(`/vault/${r._id}/reveal`)}><Eye className="h-3.5 w-3.5" /></Button>}
      columns={[
        { key: 'name', header: 'Project', render: (r) => <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.category || r.targetIndustry || '—'}</p></div> },
        { key: 'productionUrl', header: 'URL', render: (r) => <a className="text-xs hover:underline" href={r.productionUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{r.productionUrl}</a> },
        { key: 'loginEmail', header: 'Login', render: (r) => r.loginEmail || '—' },
        { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  );
}

const MESSAGE_TYPES = ['whatsapp_cold', 'email', 'follow_up', 'linkedin', 'general_pitch'];
const PITCH_STATUSES = ['pitched', 'interested', 'follow_up', 'demo', 'negotiation', 'working', 'won', 'lost'];

export function VaultDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'messages' | 'pitches' | 'activity'>('overview');
  const [messages, setMessages] = useState<Record<string, { subject: string; body: string }>>({});
  const [pitch, setPitch] = useState({ leadId: '', notes: '' });
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['vault', id], queryFn: () => api.data<Any>(`/vault/${id}/details`) });
  const { data: leads } = useQuery({ queryKey: ['lead-options'], queryFn: () => api.list<Any>('/leads?limit=200').then((r) => r.data).catch(() => []) });
  useEffect(() => {
    if (!data) return;
    const m: Record<string, { subject: string; body: string }> = {};
    for (const t of MESSAGE_TYPES) {
      const found = data.messages?.find((x: Any) => x.type === t);
      m[t] = { subject: found?.subject || '', body: found?.body || '' };
    }
    setMessages(m);
  }, [data]);
  const refresh = () => qc.invalidateQueries({ queryKey: ['vault', id] });
  const saveMessages = useMutation({ mutationFn: () => api.data(`/vault/${id}/messages`, 'PUT', { messages }), onSuccess: () => { toast.success('Templates saved'); refresh(); }, onError: onErr });
  const addPitch = useMutation({ mutationFn: () => api.data(`/vault/${id}/pitches`, 'POST', pitch), onSuccess: () => { toast.success('Pitch logged'); setPitch({ leadId: '', notes: '' }); refresh(); }, onError: onErr });
  const updatePitch = useMutation({ mutationFn: ({ pid, status }: { pid: string; status: string }) => api.data(`/vault/pitches/${pid}`, 'PATCH', { status }), onSuccess: () => refresh(), onError: onErr });
  if (isError) return <PageError message="Vault project not found" onRetry={() => refetch()} />;
  if (isLoading || !data) return <PageLoading rows={5} />;
  const p = data.project;
  const a = data.analytics || {};
  return (
    <>
      <Breadcrumbs items={[{ label: 'Projects Vault', href: '/projects-vault' }, { label: p.name }]} />
      <PageHeader title={p.name} description={p.description || p.productionUrl}
        action={
          <>
            <Button variant="outline" asChild><a href={p.productionUrl} target="_blank" rel="noreferrer">Open site</a></Button>
            {p.hasPassword && <Button variant="outline" onClick={() => reveal(`/vault/${id}/reveal`)}><Copy className="mr-2 h-4 w-4" />Copy password</Button>}
          </>
        } />
      <PageGrid cols="4">
        <StatCard label="People pitched" value={a.peoplePitched ?? 0} />
        <StatCard label="Interested" value={a.interested ?? 0} />
        <StatCard label="Won" value={a.won ?? 0} tone="success" />
        <StatCard label="Conversion" value={`${a.conversionRate ?? 0}%`} />
      </PageGrid>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Pitch guide' }, { id: 'messages', label: 'Templates' }, { id: 'pitches', label: 'Pitches', count: data.pitches?.length }, { id: 'activity', label: 'Activity' }]} />
      {tab === 'overview' && (
        <SectionCard>
          <KeyValue items={[
            ['Login email', p.loginEmail], ['Category', p.category], ['Target industry', p.targetIndustry], ['Competitors', p.competitors],
            ['Ideal customer', p.idealCustomer], ['Best pitch angle', p.bestPitchAngle], ['Selling points', p.sellingPoints], ['Common objections', p.commonObjections],
            ['Pricing notes', p.pricingNotes], ['Demo notes', p.demoNotes],
          ]} />
        </SectionCard>
      )}
      {tab === 'messages' && (
        <PageGrid cols="2">
          {MESSAGE_TYPES.map((t) => (
            <SectionCard key={t} title={humanize(t)} action={<Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(messages[t]?.body || ''); toast.success('Copied'); }}><Copy className="h-3.5 w-3.5" /></Button>}>
              <FormStack>
                {t === 'email' && <Input placeholder="Subject" value={messages[t]?.subject || ''} onChange={(e) => setMessages({ ...messages, [t]: { ...messages[t], subject: e.target.value } })} />}
                <Textarea className="min-h-[140px]" value={messages[t]?.body || ''} onChange={(e) => setMessages({ ...messages, [t]: { ...messages[t], body: e.target.value } })} />
              </FormStack>
            </SectionCard>
          ))}
          <div className="flex items-end justify-end"><Button onClick={() => saveMessages.mutate()} disabled={saveMessages.isPending}>Save templates</Button></div>
        </PageGrid>
      )}
      {tab === 'pitches' && (
        <>
          <SectionCard title="Log a pitch">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={pitch.leadId} onChange={(e) => setPitch({ ...pitch, leadId: e.target.value })}>
                <option value="">Select lead…</option>
                {(leads || []).map((l: Any) => <option key={l._id} value={l._id}>{[l.firstName, l.lastName].filter(Boolean).join(' ')}{l.company && ` · ${l.company}`}</option>)}
              </Select>
              <Input placeholder="Notes" value={pitch.notes} onChange={(e) => setPitch({ ...pitch, notes: e.target.value })} />
              <Button disabled={!pitch.leadId || addPitch.isPending} onClick={() => addPitch.mutate()}>Log pitch</Button>
            </div>
          </SectionCard>
          <DataTable rows={data.pitches || []} empty="No pitches yet."
            columns={[
              { key: 'lead', header: 'Lead', render: (r) => r.leadName || r.leadId?.company || [r.leadId?.firstName, r.leadId?.lastName].filter(Boolean).join(' ') || '—' },
              { key: 'pitchedBy', header: 'By', render: (r) => r.pitchedBy },
              { key: 'pitchedAt', header: 'When', render: (r) => fmtDate(r.pitchedAt) },
              { key: 'attemptCount', header: 'Attempts', render: (r) => r.attemptCount },
              { key: 'status', header: 'Status', render: (r) => <Select className="h-8 w-36 text-xs" value={r.status} onChange={(e) => updatePitch.mutate({ pid: r._id, status: e.target.value })}>{PITCH_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select> },
            ]} />
        </>
      )}
      {tab === 'activity' && <ActivityList events={data.activity || []} />}
    </>
  );
}

export function CredentialsPage() {
  return (
    <ResourcePage
      title="Credentials"
      description="Shared logins for tools and products. Passwords are encrypted and only revealed on request."
      endpoint="/credentials"
      writePermission="vault:credentials"
      createLabel="Add credential"
      allowDelete
      fields={[
        { name: 'productName', label: 'Product', required: true },
        { name: 'category', label: 'Category' },
        { name: 'url', label: 'URL' },
        { name: 'username', label: 'Username' },
        { name: 'password', label: 'Password', type: 'password', help: 'Leave blank to keep the current password.' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      rowActions={(r) => r.hasPassword && <Button size="icon" variant="ghost" className="h-8 w-8" title="Copy password" onClick={() => reveal(`/credentials/${r._id}/reveal`)}><Eye className="h-3.5 w-3.5" /></Button>}
      columns={[
        { key: 'productName', header: 'Product', render: (r) => <span className="font-medium">{r.productName}</span> },
        { key: 'category', header: 'Category', render: (r) => r.category || '—' },
        { key: 'url', header: 'URL', render: (r) => (r.url ? <a className="text-xs hover:underline" href={r.url} target="_blank" rel="noreferrer">{r.url}</a> : '—') },
        { key: 'username', header: 'Username', render: (r) => r.username || '—' },
        { key: 'password', header: 'Password', render: (r) => (r.hasPassword ? '••••••••' : '—') },
      ]}
    />
  );
}

// ---------------------------------------------------------------- activity & analytics
export function ActivityPage() {
  const navigate = useNavigate();
  const [entityType, setEntityType] = useState('');
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ['activity', entityType], queryFn: () => api.data<Any[]>(`/os/activity?limit=200${entityType ? `&entityType=${entityType}` : ''}`) });
  return (
    <>
      <PageHeader title="Activity" description="An audit trail of everything that changed across clients, delivery, finance, and BDA / Sales CRM." />
      <Select className="sm:w-48" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
        <option value="">All activity</option>
        {['project', 'task', 'milestone', 'invoice', 'payment', 'vendor', 'conversion', 'meeting', 'document', 'portal', 'sales_lead', 'sales_deal', 'sales_call', 'sales_followup', 'sales_meeting', 'sales_task', 'sales'].map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
      </Select>
      {isError ? <PageError onRetry={() => refetch()} /> : isLoading ? <PageLoading /> : (
        <DataTable rows={data as any} onRowClick={(r) => r.publicCode && navigate(`/conversions/${r.publicCode}`)} empty="No activity yet."
          columns={[
            { key: 'createdAt', header: 'When', render: (r) => <span className="whitespace-nowrap text-xs">{fmtDateTime(r.createdAt)}</span> },
            { key: 'title', header: 'Event', render: (r) => <div><p className="font-medium">{r.title}</p>{r.detail && <p className="text-xs text-muted-foreground">{r.detail}</p>}</div> },
            { key: 'entityType', header: 'Type', render: (r) => <StatusPill value={r.entityType} tone="gray" /> },
            { key: 'publicCode', header: 'Client', render: (r) => (r.publicCode ? <span className="font-mono text-xs">{r.publicCode}</span> : '—') },
            { key: 'actor', header: 'By', render: (r) => r.actor },
          ]} />
      )}
    </>
  );
}

function Bars({ items }: { items: { label: string; value: number; display?: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-2">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-3 text-sm">
          <span className="w-36 shrink-0 truncate text-muted-foreground">{i.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${(i.value / max) * 100}%` }} /></div>
          <span className="w-24 text-right tabular-nums">{i.display ?? i.value}</span>
        </div>
      ))}
      {items.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
    </div>
  );
}

export function AnalyticsPage() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['analytics'], queryFn: () => api.data<Any>('/os/analytics') });
  if (isError) return <PageError onRetry={() => refetch()} />;
  if (isLoading || !data) return <PageLoading />;
  return (
    <>
      <PageHeader title="Analytics" description="Conversion, collections and where your leads come from." />
      <PageGrid cols="4">
        <StatCard label="Lead → client conversion" value={`${data.conversionRate}%`} />
        <StatCard label="Invoiced" value={inr(data.invoiced)} />
        <StatCard label="Received" value={inr(data.received)} tone="success" />
        <StatCard label="Overdue invoices" value={data.overdueCount} tone={data.overdueCount ? 'danger' : 'default'} />
      </PageGrid>
      <PageGrid cols="3">
        <SectionCard title="Receivables aging"><Bars items={data.aging.map((a: Any) => ({ label: a.label, value: a.amount, display: inr(a.amount) }))} /></SectionCard>
        <SectionCard title={`Lead sectors · top: ${data.topSector}`}><Bars items={data.sectors.slice(0, 8).map((s: Any) => ({ label: s.sector, value: s.count }))} /></SectionCard>
        <SectionCard title="Lead sources"><Bars items={data.sources.slice(0, 8).map((s: Any) => ({ label: humanize(s.source), value: s.count }))} /></SectionCard>
      </PageGrid>
    </>
  );
}

export function ServicesPage() {
  return (
    <ResourcePage title="Services" description="The services you sell. Used on conversions and projects." endpoint="/services" writePermission="settings:write" createLabel="Add service" allowDelete
      fields={[{ name: 'name', label: 'Name', required: true }, { name: 'isActive', label: 'Active', type: 'checkbox' }]}
      columns={[{ key: 'name', header: 'Service', render: (r) => <span className="font-medium">{r.name}</span> }, { key: 'slug', header: 'Key', render: (r) => <span className="font-mono text-xs">{r.slug}</span> }, { key: 'isActive', header: 'Status', render: (r) => <StatusPill value={r.isActive ? 'active' : 'inactive'} /> }]} />
  );
}

export function IndustriesPage() {
  return (
    <ResourcePage title="Industries" description="Industry catalog used to group leads into sectors for analytics." endpoint="/industries" writePermission="settings:write" createLabel="Add industry" allowDelete
      fields={[{ name: 'name', label: 'Name', required: true }, { name: 'sector', label: 'Sector' }, { name: 'isActive', label: 'Active', type: 'checkbox' }]}
      columns={[{ key: 'name', header: 'Industry', render: (r) => <span className="font-medium">{r.name}</span> }, { key: 'sector', header: 'Sector', render: (r) => r.sector || '—' }, { key: 'isActive', header: 'Status', render: (r) => <StatusPill value={r.isActive ? 'active' : 'inactive'} /> }]} />
  );
}
