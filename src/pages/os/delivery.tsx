import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Check, Download, Eye, EyeOff, Pause, Play, Plus, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCan } from '@/lib/permissions';
import { fileToBase64, memberName, useProjectOptions, useTeam } from '@/lib/hooks';
import { useAuthStore } from '@/stores/auth';
import { Breadcrumbs, PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormRow, FormStack, PageGrid } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { ResourcePage, type FieldDef, type Row } from '@/components/shared/resource-page';
import {
  DataTable, KeyValue, ProgressBar, SectionCard, Select, StatCard, StatusPill, Tabs, Textarea,
  fmtDate, fmtDateTime, humanize, inr, personName,
} from '@/components/shared/os-ui';

type Any = Record<string, any>;
const PROJECT_STATUSES = ['planned', 'onboarding', 'in_progress', 'waiting_for_client', 'blocked', 'in_review', 'completed', 'cancelled'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TASK_STATUSES = ['todo', 'in_progress', 'blocked', 'on_hold', 'completed', 'cancelled'];
const MEETING_TYPES = ['kickoff', 'strategy', 'review', 'internal', 'other'];
const onErr = (e: Error) => toast.error(e.message);

// ---------------------------------------------------------------- projects
export function ProjectsPage() {
  const { data: team = [] } = useTeam();
  const { data: conversions = [] } = useQuery({ queryKey: ['conversions'], queryFn: () => api.data<Any[]>('/conversions').catch(() => []) });
  const fields: FieldDef[] = [
    { name: 'name', label: 'Project name', required: true },
    { name: 'conversionUuid', label: 'Client (conversion)', type: 'select', options: conversions.map((c) => ({ value: c.conversionUuid, label: `${c.publicCode} · ${c.vendor?.companyName || ''}` })) },
    { name: 'service', label: 'Service' },
    { name: 'status', label: 'Status', type: 'select', options: PROJECT_STATUSES },
    { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES },
    { name: 'primaryPocUserId', label: 'POC', type: 'select', options: team.map((u) => ({ value: u._id, label: memberName(u) })) },
    { name: 'startDate', label: 'Start date', type: 'date' },
    { name: 'expectedDelivery', label: 'Expected delivery', type: 'date' },
    { name: 'budget', label: 'Contract value (₹)', type: 'number' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'seedMilestones', label: 'Add default milestones (Discovery → Launch)', type: 'checkbox', createOnly: true },
  ];
  return (
    <ResourcePage
      title="Projects"
      description="Delivery projects with milestones, team, updates and billing."
      endpoint="/projects"
      writePermission="projects:write"
      createLabel="New project"
      fields={fields}
      allowDelete
      deleteLabel="Archive"
      filters={[{ name: 'status', label: 'Statuses', options: PROJECT_STATUSES }, { name: 'priority', label: 'Priorities', options: PRIORITIES }]}
      rowHref={(r) => `/projects/${r._id}`}
      columns={[
        { key: 'name', header: 'Project', render: (r) => <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.vendorId?.companyName || r.service || '—'}</p></div> },
        { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
        { key: 'priority', header: 'Priority', render: (r) => <StatusPill value={r.priority} /> },
        { key: 'progress', header: 'Progress', className: 'min-w-[140px]', render: (r) => <ProgressBar value={r.progress} /> },
        { key: 'poc', header: 'POC', render: (r) => personName(r.primaryPocUserId) },
        { key: 'expectedDelivery', header: 'Delivery', render: (r) => fmtDate(r.expectedDelivery) },
      ]}
    />
  );
}

export function ProjectWorkspacePage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const can = useCan();
  const navigate = useNavigate();
  const { data: team = [] } = useTeam();
  const [tab, setTab] = useState<'overview' | 'tasks' | 'updates' | 'files' | 'activity'>('overview');
  const [milestone, setMilestone] = useState({ name: '', weight: '1', dueDate: '' });
  const [update, setUpdate] = useState({ title: '', body: '', visibility: 'internal' });
  const [memberId, setMemberId] = useState('');
  const [taskOpen, setTaskOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['workspace', id], queryFn: () => api.data<Any>(`/projects/${id}/workspace`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['workspace', id] });
  const call = useMutation({
    mutationFn: ({ path, method = 'POST', body }: { path: string; method?: 'POST' | 'PATCH' | 'DELETE'; body?: unknown }) => api.data(`/projects/${id}${path}`, method, body),
    onSuccess: () => refresh(),
    onError: onErr,
  });
  const setStatus = useMutation({
    mutationFn: (status: string) => api.data(`/projects/${id}`, 'PATCH', { status }),
    onSuccess: () => { toast.success('Status updated'); refresh(); },
    onError: onErr,
  });

  if (isError) return <PageError message="Project not found" onRetry={() => refetch()} />;
  if (isLoading || !data) return <PageLoading rows={6} />;
  const { project, milestones = [], members = [], updates = [], tasks = [], meetings = [], documents = [], invoices = [], activity = [], rollup } = data;
  const canWrite = can('projects:write');
  const memberIds = new Set(members.map((m: Any) => String(m.userId?._id)));

  return (
    <>
      <Breadcrumbs items={[{ label: 'Projects', href: '/projects' }, { label: project.name }]} />
      <PageHeader
        title={project.name}
        description={[data.vendor?.companyName, data.conversion?.publicCode, project.service].filter(Boolean).join(' · ') || undefined}
        action={
          <>
            {canWrite ? (
              <Select className="w-44" value={project.status} onChange={(e) => setStatus.mutate(e.target.value)}>
                {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
              </Select>
            ) : <StatusPill value={project.status} />}
            {can('invoices:write') && <Button variant="outline" onClick={() => navigate(`/invoices/new?projectId=${project._id}`)}>New invoice</Button>}
            {can('documents:read') && <Button variant="outline" onClick={() => navigate(`/assets?projectId=${project._id}`)}>Assets</Button>}
            {can('documents:write') && <Button variant="outline" onClick={() => navigate(`/sow-templates?project=${encodeURIComponent(project.name)}&client=${encodeURIComponent(data.vendor?.companyName || '')}&conversionUuid=${project.conversionUuid || ''}`)}>Create SOW</Button>}
          </>
        }
      />
      <PageGrid cols="4">
        <StatCard label="Progress" value={`${project.progress || 0}%`} hint={`${milestones.filter((m: Any) => m.status === 'completed').length}/${milestones.length} milestones`} />
        <StatCard label="Contract" value={inr(rollup.contract)} />
        <StatCard label="Received" value={inr(rollup.received)} tone="success" hint={`Invoiced ${inr(rollup.invoiced)}`} />
        <StatCard label="Outstanding" value={inr(rollup.outstanding)} tone={rollup.outstanding ? 'danger' : 'default'} />
      </PageGrid>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' }, { id: 'tasks', label: 'Tasks', count: tasks.length },
          { id: 'updates', label: 'Updates', count: updates.length }, { id: 'files', label: 'Meetings & files', count: meetings.length + documents.length },
          { id: 'activity', label: 'Activity' },
        ]}
      />

      {tab === 'overview' && (
        <PageGrid cols="2">
          <SectionCard title="Milestones" action={can('milestones:write') && milestones.length === 0 && <Button size="sm" variant="outline" onClick={() => call.mutate({ path: '/milestones/seed' })}>Add defaults</Button>}>
            <ul className="flex flex-col divide-y">
              {milestones.map((m: Any) => (
                <li key={m._id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">Weight {m.weight}{m.dueDate && ` · due ${fmtDate(m.dueDate)}`}{!m.visibleToClient && ' · internal'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {can('milestones:write') ? (
                      <Select className="h-8 w-32 text-xs" value={m.status} onChange={(e) => call.mutate({ path: `/milestones/${m._id}`, method: 'PATCH', body: { status: e.target.value } })}>
                        {['pending', 'in_progress', 'completed'].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                      </Select>
                    ) : <StatusPill value={m.status} />}
                    {can('milestones:write') && (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title={m.visibleToClient ? 'Hide from client' : 'Show to client'} onClick={() => call.mutate({ path: `/milestones/${m._id}`, method: 'PATCH', body: { visibleToClient: !m.visibleToClient } })}>
                          {m.visibleToClient ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-error" onClick={() => call.mutate({ path: `/milestones/${m._id}`, method: 'DELETE' })}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
              {milestones.length === 0 && <li className="py-2 text-sm text-muted-foreground">No milestones yet.</li>}
            </ul>
            {can('milestones:write') && (
              <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row">
                <Input placeholder="Milestone name" value={milestone.name} onChange={(e) => setMilestone({ ...milestone, name: e.target.value })} />
                <Input className="sm:w-20" type="number" min="0.1" step="0.1" title="Weight" value={milestone.weight} onChange={(e) => setMilestone({ ...milestone, weight: e.target.value })} />
                <Input className="sm:w-40" type="date" value={milestone.dueDate} onChange={(e) => setMilestone({ ...milestone, dueDate: e.target.value })} />
                <Button disabled={!milestone.name} onClick={() => { call.mutate({ path: '/milestones', body: { name: milestone.name, weight: Number(milestone.weight) || 1, dueDate: milestone.dueDate || undefined } }); setMilestone({ name: '', weight: '1', dueDate: '' }); }}><Plus className="h-4 w-4" /></Button>
              </div>
            )}
          </SectionCard>

          <div className="flex flex-col gap-4 lg:gap-6">
            <SectionCard title="Details">
              <KeyValue items={[
                ['POC', personName(data.poc)], ['Priority', <StatusPill value={project.priority} />],
                ['Start', fmtDate(project.startDate)], ['Expected delivery', fmtDate(project.expectedDelivery)],
                ['Completed', fmtDate(project.actualCompletion)],
                ['Client', data.vendor ? <Link className="hover:underline" to={`/clients/${data.vendor._id}`}>{data.vendor.companyName}</Link> : null],
              ]} />
              {project.description && <p className="mt-4 whitespace-pre-wrap border-t pt-4 text-sm text-muted-foreground">{project.description}</p>}
            </SectionCard>
            <SectionCard title="Team">
              <ul className="flex flex-col gap-2">
                {members.map((m: Any) => (
                  <li key={m._id} className="flex items-center justify-between text-sm">
                    <span>{personName(m.userId)} {m.roleOnProject === 'poc' && <StatusPill value="poc" tone="purple" className="ml-1" />}</span>
                    {canWrite && m.roleOnProject !== 'poc' && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => call.mutate({ path: `/members/${m.userId?._id}`, method: 'DELETE' })}><X className="h-3.5 w-3.5" /></Button>}
                  </li>
                ))}
              </ul>
              {canWrite && (
                <div className="mt-3 flex gap-2 border-t pt-3">
                  <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                    <option value="">Add teammate…</option>
                    {team.filter((u) => !memberIds.has(u._id)).map((u) => <option key={u._id} value={u._id}>{memberName(u)}</option>)}
                  </Select>
                  <Button disabled={!memberId} onClick={() => { call.mutate({ path: '/members', body: { userId: memberId } }); setMemberId(''); }}>Add</Button>
                </div>
              )}
            </SectionCard>
            <SectionCard title="Invoices" bodyClassName="p-0">
              <DataTable rows={invoices} empty="No invoices for this project."
                onRowClick={(r) => navigate(`/invoices/${r._id}`)}
                columns={[
                  { key: 'invoiceNumber', header: 'Invoice', render: (r) => <span className="font-mono text-xs">{r.invoiceNumber}</span> },
                  { key: 'total', header: 'Total', render: (r) => inr(r.total) },
                  { key: 'displayStatus', header: 'Status', render: (r) => <StatusPill value={r.displayStatus} /> },
                ]} />
            </SectionCard>
          </div>
        </PageGrid>
      )}

      {tab === 'tasks' && (
        <>
          {can('tasks:write') && <div><Button onClick={() => setTaskOpen(true)}><Plus className="mr-2 h-4 w-4" />New task</Button></div>}
          <TaskTable rows={tasks} />
          <TaskFormModal open={taskOpen} onClose={() => { setTaskOpen(false); refresh(); }} projectId={project._id} memberOptions={members.map((m: Any) => m.userId).filter(Boolean)} />
        </>
      )}

      {tab === 'updates' && (
        <PageGrid cols="2">
          {can('project_updates:write') && (
            <SectionCard title="Post an update">
              <FormStack>
                <Input placeholder="Title" value={update.title} onChange={(e) => setUpdate({ ...update, title: e.target.value })} />
                <Textarea placeholder="What changed?" value={update.body} onChange={(e) => setUpdate({ ...update, body: e.target.value })} />
                <Select value={update.visibility} onChange={(e) => setUpdate({ ...update, visibility: e.target.value })}>
                  <option value="internal">Internal only</option>
                  <option value="client_visible">Visible in client portal</option>
                </Select>
                <Button disabled={!update.title} onClick={() => { call.mutate({ path: '/updates', body: update }); setUpdate({ title: '', body: '', visibility: 'internal' }); }}>Post update</Button>
              </FormStack>
            </SectionCard>
          )}
          <SectionCard title="Timeline">
            <ul className="flex flex-col gap-4">
              {updates.map((u: Any) => (
                <li key={u._id} className="border-l-2 pl-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{u.title}</p>
                    <button className="shrink-0" onClick={() => can('project_updates:write') && call.mutate({ path: `/updates/${u._id}`, method: 'PATCH', body: { visibility: u.visibility === 'internal' ? 'client_visible' : 'internal' } })}>
                      <StatusPill value={u.visibility === 'client_visible' ? 'client visible' : 'internal'} tone={u.visibility === 'client_visible' ? 'green' : 'gray'} />
                    </button>
                  </div>
                  {u.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{u.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{u.createdBy} · {fmtDateTime(u.createdAt)}</p>
                </li>
              ))}
              {updates.length === 0 && <li className="text-sm text-muted-foreground">No updates yet.</li>}
            </ul>
          </SectionCard>
        </PageGrid>
      )}

      {tab === 'files' && (
        <PageGrid cols="2">
          <SectionCard title="Meetings" action={<Link to="/meetings" className="text-xs text-muted-foreground hover:text-foreground">All meetings →</Link>}>
            {meetings.length ? meetings.map((m: Any) => (
              <div key={m._id} className="border-b py-2 last:border-0">
                <div className="flex justify-between text-sm"><span className="font-medium">{m.title}</span><span className="text-xs text-muted-foreground">{fmtDateTime(m.startsAt)}</span></div>
                {m.decisions && <p className="text-xs text-muted-foreground">Decisions: {m.decisions}</p>}
              </div>
            )) : <p className="text-sm text-muted-foreground">No meetings logged.</p>}
          </SectionCard>
          <SectionCard title="Documents" action={<Link to="/documents" className="text-xs text-muted-foreground hover:text-foreground">Upload →</Link>}>
            {documents.length ? documents.map((d: Any) => (
              <div key={d._id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                <span className="truncate">{d.title}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => api.download(`/documents/${d._id}/download`, d.fileName || d.title).catch(onErr)}><Download className="h-3.5 w-3.5" /></Button>
              </div>
            )) : <p className="text-sm text-muted-foreground">No documents.</p>}
          </SectionCard>
        </PageGrid>
      )}

      {tab === 'activity' && <ActivityList events={activity} />}
    </>
  );
}

export function ActivityList({ events }: { events: Any[] }) {
  return (
    <SectionCard>
      {events.length ? (
        <ul className="flex flex-col gap-3">
          {events.map((a) => (
            <li key={a._id} className="flex justify-between gap-4 text-sm">
              <span><span className="font-medium">{a.title}</span>{a.detail && <span className="text-muted-foreground"> · {a.detail}</span>}<span className="block text-xs text-muted-foreground">{a.actorName || a.createdBy || 'System'}</span></span>
              <span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">No activity yet.</p>}
    </SectionCard>
  );
}

// ---------------------------------------------------------------- tasks
function TaskTable({ rows }: { rows: Any[] }) {
  const navigate = useNavigate();
  return (
    <DataTable
      rows={rows as Row[]}
      onRowClick={(r) => navigate(`/tasks/${r._id}`)}
      empty="No tasks in this view."
      columns={[
        { key: 'title', header: 'Task', render: (r) => <div><p className="font-medium">{r.title}</p>{r.projectId?.name && <p className="text-xs text-muted-foreground">{r.projectId.name}</p>}</div> },
        { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status === 'pending' ? 'todo' : r.status} /> },
        { key: 'priority', header: 'Priority', render: (r) => <StatusPill value={r.priority} /> },
        { key: 'assignedTo', header: 'Assignee', render: (r) => personName(r.assignedTo) },
        { key: 'dueDate', header: 'Due', render: (r) => <span className={r.dueDate && new Date(r.dueDate) < new Date() && !['completed', 'cancelled'].includes(r.status) ? 'text-error' : ''}>{fmtDate(r.dueDate)}</span> },
      ]}
    />
  );
}

function TaskFormModal({ open, onClose, projectId, memberOptions }: { open: boolean; onClose: () => void; projectId?: string; memberOptions?: Any[] }) {
  const user = useAuthStore((s) => s.user);
  const { data: team = [] } = useTeam();
  const { data: projects = [] } = useProjectOptions();
  const empty = { title: '', description: '', projectId: projectId || '', assignedTo: user?.id || '', priority: 'medium', dueDate: '', ownerSide: 'editco', visibleToClient: false };
  const [form, setForm] = useState<Any>(empty);
  useEffect(() => { if (open) setForm({ ...empty, projectId: projectId || '' }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const people = memberOptions?.length ? memberOptions : team;
  const create = useMutation({
    mutationFn: () => api.data('/tasks', 'POST', {
      ...form,
      projectId: form.projectId || undefined,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
    }),
    onSuccess: () => { toast.success('Task created'); onClose(); },
    onError: onErr,
  });
  return (
    <SimpleModal open={open} onClose={onClose} title="New task">
      <FormStack>
        <FormField><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormField>
        <FormField><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
        <FormRow>
          <FormField><Label>Project</Label>
            <Select value={form.projectId} disabled={!!projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">No project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </FormField>
          <FormField><Label>Assignee *</Label>
            <Select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="">Select…</option>
              {people.map((u: Any) => <option key={u._id} value={u._id}>{memberName(u)}</option>)}
            </Select>
          </FormField>
        </FormRow>
        <FormRow>
          <FormField><Label>Priority</Label>
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{PRIORITIES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}</Select>
          </FormField>
          <FormField><Label>Due</Label><Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></FormField>
        </FormRow>
        <FormRow>
          <FormField><Label>Owner</Label>
            <Select value={form.ownerSide} onChange={(e) => setForm({ ...form, ownerSide: e.target.value })}>
              <option value="editco">Our team</option><option value="client">Client action required</option>
            </Select>
          </FormField>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={form.visibleToClient || form.ownerSide === 'client'} disabled={form.ownerSide === 'client'} onChange={(e) => setForm({ ...form, visibleToClient: e.target.checked })} />
            Visible in client portal
          </label>
        </FormRow>
        <FormActions>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.title || !form.assignedTo || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Creating…' : 'Create task'}</Button>
        </FormActions>
      </FormStack>
    </SimpleModal>
  );
}

const TASK_VIEWS = ['all', 'my', 'today', 'upcoming', 'overdue', 'blocked', 'in_progress', 'completed'] as const;

export function TasksPage() {
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') || 'my') as (typeof TASK_VIEWS)[number];
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const can = useCan();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/tasks', view, search],
    queryFn: () => api.list<Any>(`/tasks?view=${view}&limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  });
  return (
    <>
      <PageHeader title="Tasks" description="Assignments across projects. Assigning a sales / BDA teammate also puts the task on their BDA portal (My Day → Tasks)."
        action={can('tasks:write') && <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New task</Button>} />
      <Tabs value={view} onChange={(v) => setParams({ view: v })} tabs={TASK_VIEWS.map((v) => ({ id: v, label: v === 'my' ? 'My tasks' : humanize(v) }))} />
      <Input className="sm:max-w-xs" placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {isError ? <PageError onRetry={() => refetch()} /> : isLoading ? <PageLoading /> : <TaskTable rows={data?.data || []} />}
      <TaskFormModal open={open} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['/tasks'] }); }} />
    </>
  );
}

function useTicker(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
}

const fmtMs = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function TaskDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const can = useCan();
  const [comment, setComment] = useState('');
  const [dep, setDep] = useState('');
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['task', id], queryFn: () => api.data<Any>(`/tasks/${id}/details`) });
  useTicker(Boolean(data?.openSession));
  const refresh = () => qc.invalidateQueries({ queryKey: ['task', id] });
  const act = useMutation({
    mutationFn: ({ path, method = 'POST', body }: { path: string; method?: 'POST' | 'DELETE'; body?: unknown }) => api.data(`/tasks/${id}${path}`, method, body),
    onSuccess: () => refresh(),
    onError: (e: Error, vars) => {
      if (e.message.startsWith('Blocked by') && can('projects:write') && window.confirm(`${e.message}\n\nStart anyway?`)) {
        act.mutate({ ...vars, body: { ...(vars.body as object), overrideDeps: true } });
      } else toast.error(e.message);
    },
  });
  if (isError) return <PageError message="Task not found" onRetry={() => refetch()} />;
  if (isLoading || !data) return <PageLoading rows={5} />;
  const { task, comments = [], dependencies = [], siblings = [], activity = [], openSession } = data;
  const tracked = (data.sessions || []).reduce((sum: number, s: Any) => sum + (s.endedAt ? s.durationMs || 0 : Date.now() - new Date(s.startedAt).getTime()), 0);
  const status = task.status === 'pending' ? 'todo' : task.status;
  const canWrite = can('tasks:write');
  const depIds = new Set(dependencies.map((d: Any) => String(d.dependsOnTaskId?._id)));

  return (
    <>
      <Breadcrumbs items={[{ label: 'Tasks', href: '/tasks' }, ...(task.projectId ? [{ label: task.projectId.name, href: `/projects/${task.projectId._id}` }] : []), { label: task.title }]} />
      <PageHeader
        title={task.title}
        description={`${personName(task.assignedTo)} · ${task.dueDate ? `due ${fmtDateTime(task.dueDate)}` : 'no due date'}`}
        action={canWrite && (
          <>
            {!['completed', 'cancelled'].includes(status) && (openSession
              ? <Button variant="outline" onClick={() => act.mutate({ path: '/pause' })}><Pause className="mr-2 h-4 w-4" />Pause</Button>
              : <Button variant="outline" onClick={() => act.mutate({ path: '/start', body: {} })}><Play className="mr-2 h-4 w-4" />Start timer</Button>)}
            {!['completed', 'cancelled'].includes(status) && <Button onClick={() => act.mutate({ path: '/status', body: { status: 'completed' } })}><Check className="mr-2 h-4 w-4" />Complete</Button>}
          </>
        )}
      />
      <PageGrid cols="3">
        <StatCard label="Status" value={<StatusPill value={status} className="text-sm" />} />
        <StatCard label="Time tracked" value={<span className="tabular-nums">{fmtMs(tracked)}</span>} hint={openSession ? 'Timer running' : `${data.sessions?.length || 0} sessions`} />
        <StatCard label="Priority" value={<StatusPill value={task.priority} className="text-sm" />} hint={task.ownerSide === 'client' ? 'Client action required' : task.visibleToClient ? 'Visible to client' : 'Internal'} />
      </PageGrid>
      <PageGrid cols="2">
        <div className="flex flex-col gap-4 lg:gap-6">
          <SectionCard title="Details">
            {canWrite && status !== 'completed' && (
              <div className="mb-4 flex items-center gap-2">
                <Label className="shrink-0">Move to</Label>
                <Select value={status} onChange={(e) => act.mutate({ path: '/status', body: { status: e.target.value } })}>
                  {TASK_STATUSES.filter((s) => status !== 'cancelled' || s === 'todo' || s === 'cancelled').map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                </Select>
              </div>
            )}
            <KeyValue items={[['Assignee', personName(task.assignedTo)], ['Project', task.projectId?.name], ['Started', fmtDateTime(task.actualStartTime)], ['Completed', fmtDateTime(task.completedAt)]]} />
            {task.description && <p className="mt-4 whitespace-pre-wrap border-t pt-4 text-sm text-muted-foreground">{task.description}</p>}
          </SectionCard>
          <SectionCard title="Blocked by">
            <ul className="flex flex-col gap-2">
              {dependencies.map((d: Any) => (
                <li key={d._id} className="flex items-center justify-between text-sm">
                  <Link className="hover:underline" to={`/tasks/${d.dependsOnTaskId?._id}`}>{d.dependsOnTaskId?.title}</Link>
                  <span className="flex items-center gap-1"><StatusPill value={d.dependsOnTaskId?.status} />{canWrite && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => act.mutate({ path: `/dependencies/${d._id}`, method: 'DELETE' })}><X className="h-3.5 w-3.5" /></Button>}</span>
                </li>
              ))}
              {dependencies.length === 0 && <li className="text-sm text-muted-foreground">No dependencies.</li>}
            </ul>
            {canWrite && siblings.length > 0 && (
              <div className="mt-3 flex gap-2 border-t pt-3">
                <Select value={dep} onChange={(e) => setDep(e.target.value)}>
                  <option value="">Add a blocking task…</option>
                  {siblings.filter((s: Any) => !depIds.has(String(s._id))).map((s: Any) => <option key={s._id} value={s._id}>{s.title}</option>)}
                </Select>
                <Button disabled={!dep} onClick={() => { act.mutate({ path: '/dependencies', body: { dependsOnTaskId: dep } }); setDep(''); }}>Add</Button>
              </div>
            )}
          </SectionCard>
        </div>
        <SectionCard title="Comments">
          <ul className="flex flex-col gap-3">
            {comments.map((c: Any) => (
              <li key={c._id} className="rounded-md bg-surface-soft/60 p-3">
                <p className="text-xs font-medium">{personName(c.userId)} <span className="font-normal text-muted-foreground">· {fmtDateTime(c.createdAt)}</span></p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{c.message}</p>
              </li>
            ))}
            {comments.length === 0 && <li className="text-sm text-muted-foreground">No comments yet.</li>}
          </ul>
          <div className="mt-4 flex flex-col gap-2 border-t pt-4">
            <Textarea placeholder="Write a comment… mention teammates with @their@email.com" value={comment} onChange={(e) => setComment(e.target.value)} />
            <Button className="self-end" disabled={!comment.trim()} onClick={() => { act.mutate({ path: '/comments', body: { message: comment } }); setComment(''); }}>Comment</Button>
          </div>
        </SectionCard>
      </PageGrid>
      <ActivityList events={activity} />
    </>
  );
}

// ---------------------------------------------------------------- meetings & documents
export function MeetingsPage() {
  const { data: projects = [] } = useProjectOptions();
  return (
    <ResourcePage
      title="Meetings"
      description="Meeting notes, decisions and action items. Action items become follow-up tasks automatically."
      endpoint="/meetings"
      writePermission="meetings:write"
      createLabel="Log meeting"
      allowDelete
      deleteLabel="Archive"
      filters={[{ name: 'meetingType', label: 'Types', options: MEETING_TYPES }]}
      fields={[
        { name: 'projectId', label: 'Project', type: 'select', required: true, options: projects.map((p) => ({ value: p._id, label: p.name })) },
        { name: 'title', label: 'Title', required: true },
        { name: 'startsAt', label: 'Date & time', type: 'datetime', required: true },
        { name: 'meetingType', label: 'Type', type: 'select', options: MEETING_TYPES },
        { name: 'location', label: 'Location / link' },
        { name: 'participants', label: 'Participants' },
        { name: 'discussion', label: 'Discussion', type: 'textarea' },
        { name: 'decisions', label: 'Decisions', type: 'textarea' },
        { name: 'actionItems', label: 'Action items', type: 'textarea', help: 'Creates a follow-up task assigned to you.' },
        { name: 'nextFollowUp', label: 'Next follow-up', type: 'date' },
        { name: 'visibleToClient', label: 'Visible in client portal', type: 'checkbox' },
      ]}
      columns={[
        { key: 'title', header: 'Meeting', render: (r) => <div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.projectId?.name}</p></div> },
        { key: 'meetingType', header: 'Type', render: (r) => <StatusPill value={r.meetingType} /> },
        { key: 'startsAt', header: 'When', render: (r) => fmtDateTime(r.startsAt) },
        { key: 'participants', header: 'Participants', render: (r) => <span className="line-clamp-1">{r.participants || '—'}</span> },
        { key: 'visibleToClient', header: 'Client', render: (r) => (r.visibleToClient ? <StatusPill value="shared" tone="green" /> : '—') },
      ]}
    />
  );
}

export function DocumentsPage() {
  const { data: projects = [] } = useProjectOptions();
  const qc = useQueryClient();
  const can = useCan();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; projectId: string; visibleToClient: boolean; file: File | null }>({ title: '', projectId: '', visibleToClient: false, file: null });
  const upload = useMutation({
    mutationFn: async () => {
      if (form.file && form.file.size > 6 * 1024 * 1024) throw new Error('File must be under 6MB');
      const dataBase64 = form.file ? await fileToBase64(form.file) : undefined;
      return api.data('/documents', 'POST', { title: form.title, projectId: form.projectId || undefined, visibleToClient: form.visibleToClient, fileName: form.file?.name, mimeType: form.file?.type, dataBase64 });
    },
    onSuccess: () => { toast.success('Uploaded'); setOpen(false); qc.invalidateQueries({ queryKey: ['/documents'] }); },
    onError: onErr,
  });
  return (
    <>
      <ResourcePage
        title="Documents"
        description="Project files. Shared files appear in the client portal."
        endpoint="/documents"
        writePermission="documents:write"
        allowCreate={false}
        allowDelete
        deleteLabel="Archive"
        fields={[{ name: 'title', label: 'Title', required: true }, { name: 'visibleToClient', label: 'Visible in client portal', type: 'checkbox' }]}
        headerExtra={can('documents:write') && <Button className="w-full sm:w-auto" onClick={() => { setForm({ title: '', projectId: '', visibleToClient: false, file: null }); setOpen(true); }}><Upload className="mr-2 h-4 w-4" />Upload</Button>}
        rowActions={(r) => r.hasFile && <Button size="icon" variant="ghost" className="h-8 w-8" title="Download" onClick={() => api.download(`/documents/${r._id}/download`, r.fileName || r.title).catch(onErr)}><Download className="h-3.5 w-3.5" /></Button>}
        columns={[
          { key: 'title', header: 'Document', render: (r) => <div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.fileName}</p></div> },
          { key: 'project', header: 'Project', render: (r) => r.projectId?.name || '—' },
          { key: 'size', header: 'Size', render: (r) => (r.size ? `${Math.max(1, Math.round(r.size / 1024))} KB` : '—') },
          { key: 'visibleToClient', header: 'Client', render: (r) => (r.visibleToClient ? <StatusPill value="shared" tone="green" /> : <StatusPill value="internal" />) },
          { key: 'createdAt', header: 'Added', render: (r) => fmtDate(r.createdAt) },
        ]}
      />
      <SimpleModal open={open} onClose={() => setOpen(false)} title="Upload document">
        <FormStack>
          <FormField><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormField>
          <FormField><Label>Project</Label>
            <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">No project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </FormField>
          <FormField><Label>File (max 6MB)</Label><Input type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null, title: form.title || e.target.files?.[0]?.name || '' })} /></FormField>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={form.visibleToClient} onChange={(e) => setForm({ ...form, visibleToClient: e.target.checked })} />Visible in client portal</label>
          <FormActions>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.title || upload.isPending} onClick={() => upload.mutate()}>{upload.isPending ? 'Uploading…' : 'Upload'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}

