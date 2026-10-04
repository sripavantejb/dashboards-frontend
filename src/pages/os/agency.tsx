import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCan } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormRow, FormStack, PageGrid } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { ResourcePage, type Row } from '@/components/shared/resource-page';
import { DataTable, SectionCard, Select, StatusPill, Tabs, Textarea, fmtDate, humanize } from '@/components/shared/os-ui';

type Any = Record<string, any>;
const onErr = (e: Error) => toast.error(e.message);

function printSow(id: string) {
  const token = localStorage.getItem('accessToken');
  fetch(`${api.baseUrl}/sows/${id}/print`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' })
    .then((r) => r.text())
    .then((html) => {
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(html);
      w.document.close();
      w.focus();
    })
    .catch(() => toast.error('Could not open SOW'));
}

function fileToB64(file: File) {
  return new Promise<{ dataBase64: string; mimeType: string; fileName: string; title: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ dataBase64: String(reader.result), mimeType: file.type, fileName: file.name, title: file.name.replace(/\.[^.]+$/, '') });
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export function AssetsPage() {
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const can = useCan();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Any>({ title: '', folder: 'Library', tags: '', notes: '', projectId: params.get('projectId') || '', conversionUuid: params.get('client') || '' });
  const [file, setFile] = useState<File | null>(null);
  const save = useMutation({
    mutationFn: async () => {
      const extra = file ? await fileToB64(file) : { title: '' };
      return api.data('/assets', 'POST', {
        ...extra,
        title: form.title || extra.title || 'Untitled',
        folder: form.folder || 'Library',
        tags: String(form.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        notes: form.notes, projectId: form.projectId || undefined, conversionUuid: form.conversionUuid || undefined,
      });
    },
    onSuccess: () => { toast.success('Asset saved'); setOpen(false); qc.invalidateQueries({ queryKey: ['/assets'] }); },
    onError: onErr,
  });
  return (
    <>
      <ResourcePage
        title="Asset library"
        description="Brand files, proofs and footage. Link a file to a project or client, then share it from the portal."
        endpoint="/assets"
        writePermission="documents:write"
        allowCreate={false}
        emptyText="Upload the first file — creatives pull from here instead of chat threads."
        listQuery={params.get('projectId') ? `projectId=${params.get('projectId')}` : ''}
        headerExtra={can('documents:write') && <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Upload</Button>}
        filters={[{ name: 'kind', label: 'Kinds', options: ['image', 'video', 'document', 'other'] }]}
        fields={[{ name: 'title', label: 'Title' }, { name: 'folder', label: 'Folder' }, { name: 'notes', label: 'Notes', type: 'textarea' }]}
        rowActions={(r) => r.hasFile && (
          <Button size="icon" variant="ghost" className="h-8 w-8" title="Download" onClick={() => api.download(`/assets/${r._id}/download`, r.fileName || r.title)}><Download className="h-3.5 w-3.5" /></Button>
        )}
        columns={[
          { key: 'title', header: 'Asset', render: (r) => <div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{[r.folder, r.fileName].filter(Boolean).join(' · ')}</p></div> },
          { key: 'kind', header: 'Kind', render: (r) => <StatusPill value={r.kind} /> },
          { key: 'tags', header: 'Tags', render: (r) => (r.tags || []).join(', ') || '—' },
        ]}
      />
      <SimpleModal open={open} onClose={() => setOpen(false)} title="Upload asset">
        <FormStack>
          <FormField><Label>File</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></FormField>
          <FormField><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Defaults to file name" /></FormField>
          <FormRow>
            <FormField><Label>Folder</Label><Input value={form.folder} onChange={(e) => setForm({ ...form, folder: e.target.value })} /></FormField>
            <FormField><Label>Tags</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="logo, brand" /></FormField>
          </FormRow>
          <FormField><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}

export function KnowledgePage() {
  const [tab, setTab] = useState<'articles' | 'categories'>('articles');
  const { data: cats } = useQuery({ queryKey: ['/knowledge/categories'], queryFn: () => api.list<Any>('/knowledge/categories?all=true') });
  const catOpts = (cats?.data || []).map((c) => ({ value: c._id, label: c.name }));
  return (
    <>
      <PageHeader title="Knowledge base" description="Internal playbooks. First visit seeds onboarding, sales and delivery stubs you can edit." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'articles', label: 'Articles' }, { id: 'categories', label: 'Categories' }]} />
      {tab === 'articles' ? (
        <ResourcePage
          title="Articles"
          description="Role-gated internally. Write for the people who actually run the work."
          endpoint="/knowledge/articles"
          writePermission="knowledge:write"
          emptyText="Add a category, then write the first article."
          filters={[{ name: 'status', label: 'Statuses', options: ['draft', 'published'] }, { name: 'audience', label: 'Audiences', options: ['all', 'sales', 'delivery', 'ops'] }]}
          fields={[
            { name: 'title', label: 'Title', required: true },
            { name: 'body', label: 'Body', type: 'textarea', required: true },
            { name: 'categoryId', label: 'Category', type: 'select', options: catOpts },
            { name: 'audience', label: 'Audience', type: 'select', options: ['all', 'sales', 'delivery', 'ops'] },
            { name: 'status', label: 'Status', type: 'select', options: ['draft', 'published'] },
          ]}
          columns={[
            { key: 'title', header: 'Article', render: (r) => <span className="font-medium">{r.title}</span> },
            { key: 'audience', header: 'Audience', render: (r) => humanize(r.audience) },
            { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
          ]}
        />
      ) : (
        <ResourcePage
          title="Categories"
          description="Group playbooks the way your team searches."
          endpoint="/knowledge/categories"
          writePermission="knowledge:write"
          emptyText="Categories appear after the first load (defaults are seeded)."
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'description', label: 'Description' },
            { name: 'sortOrder', label: 'Order', type: 'number' },
          ]}
          columns={[
            { key: 'name', header: 'Category', render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'description', header: 'Description', render: (r) => r.description || '—' },
          ]}
        />
      )}
    </>
  );
}

export function ContentCalendarPage() {
  const { data: articles } = useQuery({ queryKey: ['/growth/magazine/articles'], queryFn: () => api.list<Any>('/growth/magazine/articles?limit=80') });
  const artOpts = (articles?.data || []).map((a) => ({ value: a._id, label: a.title }));
  return (
    <ResourcePage
      title="Content calendar"
      description="Plan social, blog and magazine posts. Publishing to networks is still manual — this is the schedule of record."
      endpoint="/content-calendar"
      writePermission="campaigns:write"
      emptyText="Schedule a post. Link a magazine article when you are promoting an issue."
      filters={[
        { name: 'status', label: 'Statuses', options: ['idea', 'draft', 'scheduled', 'published', 'cancelled'] },
        { name: 'channel', label: 'Channels', options: ['instagram', 'linkedin', 'facebook', 'youtube', 'blog', 'magazine', 'email', 'other'] },
      ]}
      fields={[
        { name: 'title', label: 'Title', required: true },
        { name: 'channel', label: 'Channel', type: 'select', options: ['instagram', 'linkedin', 'facebook', 'youtube', 'blog', 'magazine', 'email', 'other'] },
        { name: 'status', label: 'Status', type: 'select', options: ['idea', 'draft', 'scheduled', 'published', 'cancelled'] },
        { name: 'scheduledAt', label: 'Scheduled', type: 'datetime' },
        { name: 'ownerName', label: 'Owner' },
        { name: 'caption', label: 'Caption', type: 'textarea' },
        { name: 'articleId', label: 'Magazine article', type: 'select', options: artOpts },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      columns={[
        { key: 'title', header: 'Post', render: (r) => <span className="font-medium">{r.title}</span> },
        { key: 'channel', header: 'Channel', render: (r) => humanize(r.channel) },
        { key: 'scheduledAt', header: 'When', render: (r) => fmtDate(r.scheduledAt) },
        { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
        { key: 'ownerName', header: 'Owner', render: (r) => r.ownerName || '—' },
      ]}
    />
  );
}

export function LeavePage() {
  const qc = useQueryClient();
  const can = useCan();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'casual', startDate: '', endDate: '', reason: '' });
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ['leave'], queryFn: () => api.data<Any[]>('/leave') });
  const create = useMutation({
    mutationFn: () => api.data('/leave', 'POST', form),
    onSuccess: () => { toast.success('Leave requested'); setOpen(false); qc.invalidateQueries({ queryKey: ['leave'] }); },
    onError: onErr,
  });
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.data(`/leave/${id}/decide`, 'POST', { status }),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['leave'] }); },
    onError: onErr,
  });
  const canReview = can('leaves:*') || can('*');
  if (isError) return <PageError onRetry={() => refetch()} />;
  return (
    <>
      <PageHeader title="Leave" description="Request time off. Managers approve here. Sales attendance can note when someone is away."
        action={can('leaves:write') && <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Request leave</Button>} />
      {isLoading ? <PageLoading /> : (
        <DataTable rows={data as Row[]} empty="No leave requests. Ask for time off here instead of chat."
          columns={[
            { key: 'employeeName', header: 'Person', render: (r) => r.employeeName || '—' },
            { key: 'type', header: 'Type', render: (r) => humanize(r.type) },
            { key: 'dates', header: 'Dates', render: (r) => `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)} (${r.days}d)` },
            { key: 'reason', header: 'Reason', render: (r) => r.reason || '—' },
            { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
            { key: 'x', header: '', className: 'w-px', render: (r) => r.status === 'pending' && canReview && (
              <div className="flex gap-1">
                <Button size="sm" onClick={() => decide.mutate({ id: r._id, status: 'approved' })}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: r._id, status: 'rejected' })}>Reject</Button>
              </div>
            ) },
          ]} />
      )}
      <SimpleModal open={open} onClose={() => setOpen(false)} title="Request leave">
        <FormStack>
          <FormField><Label>Type</Label><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['casual', 'sick', 'earned', 'unpaid', 'other'].map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</Select></FormField>
          <FormRow>
            <FormField><Label>Start</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></FormField>
            <FormField><Label>End</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></FormField>
          </FormRow>
          <FormField><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.startDate || !form.endDate || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Sending…' : 'Submit'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}

export function SowPage() {
  const [tab, setTab] = useState<'documents' | 'templates'>('documents');
  const [params] = useSearchParams();
  const { data: templates } = useQuery({ queryKey: ['/sow-templates'], queryFn: () => api.list<Any>('/sow-templates?all=true') });
  const tplOpts = (templates?.data || []).map((t) => ({ value: t._id, label: t.name }));
  return (
    <>
      <PageHeader title="Statements of work" description="Reusable contracts. Generate from a won deal or project, then print or send." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'documents', label: 'SOWs' }, { id: 'templates', label: 'Templates' }]} />
      {tab === 'documents' ? (
        <ResourcePage
          title="SOWs"
          description="Living contracts tied to a client or deal. Print opens a clean HTML sheet you can save as PDF."
          endpoint="/sows"
          writePermission="documents:write"
          emptyText="Pick a template and generate a SOW from a won deal or conversion hub."
          createLabel="New SOW"
          filters={[{ name: 'status', label: 'Statuses', options: ['draft', 'sent', 'signed', 'void'] }]}
          fields={[
            { name: 'title', label: 'Title', required: true },
            { name: 'templateId', label: 'Template', type: 'select', options: tplOpts, createOnly: true },
            { name: 'clientName', label: 'Client' },
            { name: 'projectName', label: 'Project' },
            { name: 'dealId', label: 'Deal id', placeholder: params.get('dealId') || '' },
            { name: 'body', label: 'Body', type: 'textarea', help: 'Leave blank to copy the template.' },
            { name: 'status', label: 'Status', type: 'select', options: ['draft', 'sent', 'signed', 'void'] },
          ]}
          toPayload={(form) => ({
            title: form.title || `SOW — ${form.clientName || 'Client'}`,
            templateId: form.templateId || undefined,
            clientName: form.clientName || params.get('client') || undefined,
            projectName: form.projectName || params.get('project') || undefined,
            dealId: form.dealId || params.get('dealId') || undefined,
            conversionUuid: params.get('conversionUuid') || undefined,
            body: form.body || undefined,
            status: form.status || 'draft',
          })}
          rowActions={(r) => (
            <Button size="sm" variant="ghost" onClick={() => printSow(r._id)}>Print</Button>
          )}
          columns={[
            { key: 'title', header: 'SOW', render: (r) => <span className="font-medium">{r.title}</span> },
            { key: 'clientName', header: 'Client', render: (r) => r.clientName || '—' },
            { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
          ]}
        />
      ) : (
        <ResourcePage
          title="Templates"
          description="Clause library. A default digital-project template is seeded for new companies."
          endpoint="/sow-templates"
          writePermission="documents:write"
          emptyText="Templates seed on first visit. Edit them to match how you sell."
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'defaultTermDays', label: 'Default term (days)', type: 'number' },
            { name: 'body', label: 'Body', type: 'textarea', required: true },
          ]}
          columns={[
            { key: 'name', header: 'Template', render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'defaultTermDays', header: 'Term', render: (r) => r.defaultTermDays ? `${r.defaultTermDays} days` : '—' },
          ]}
        />
      )}
    </>
  );
}

export function PortalInbox({ conversionUuid }: { conversionUuid: string }) {
  const qc = useQueryClient();
  const can = useCan();
  const { data, isLoading } = useQuery({
    queryKey: ['portal-ops', conversionUuid],
    queryFn: () => api.data<{ comments: Any[]; approvals: Any[]; tickets: Any[] }>(`/portal-ops/${conversionUuid}/inbox`),
    enabled: Boolean(conversionUuid),
  });
  const [note, setNote] = useState('');
  const [appr, setAppr] = useState({ title: '', detail: '', kind: 'proof' });
  const comment = useMutation({
    mutationFn: () => api.data(`/portal-ops/${conversionUuid}/comments`, 'POST', { body: note }),
    onSuccess: () => { setNote(''); qc.invalidateQueries({ queryKey: ['portal-ops', conversionUuid] }); },
    onError: onErr,
  });
  const approval = useMutation({
    mutationFn: () => api.data(`/portal-ops/${conversionUuid}/approvals`, 'POST', appr),
    onSuccess: () => { setAppr({ title: '', detail: '', kind: 'proof' }); qc.invalidateQueries({ queryKey: ['portal-ops', conversionUuid] }); toast.success('Sent for client approval'); },
    onError: onErr,
  });
  const ticket = useMutation({
    mutationFn: (row: Any) => api.data(`/portal-ops/tickets/${row._id}`, 'PATCH', { status: row.status === 'open' ? 'resolved' : 'open', staffReply: row.staffReply }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-ops', conversionUuid] }),
    onError: onErr,
  });
  if (!conversionUuid) return null;
  if (isLoading || !data) return <PageLoading />;
  return (
    <PageGrid cols="3">
      <SectionCard title="Portal messages">
        <div className="flex max-h-64 flex-col gap-2 overflow-auto">
          {data.comments.length ? data.comments.map((c) => (
            <p key={c._id} className="text-sm"><span className="font-medium">{c.authorName || c.authorType}:</span> {c.body}</p>
          )) : <p className="text-sm text-muted-foreground">No messages yet.</p>}
        </div>
        {can('vendors:write') && (
          <FormStack className="mt-3">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reply to the client…" />
            <Button size="sm" disabled={!note.trim() || comment.isPending} onClick={() => comment.mutate()}>Post</Button>
          </FormStack>
        )}
      </SectionCard>
      <SectionCard title="Approvals">
        {data.approvals.length ? data.approvals.map((a) => (
          <div key={a._id} className="flex justify-between gap-2 py-1 text-sm"><span>{a.title}</span><StatusPill value={a.status} /></div>
        )) : <p className="text-sm text-muted-foreground">Ask the client to sign off a proof or SOW.</p>}
        {can('vendors:write') && (
          <FormStack className="mt-3">
            <Input placeholder="Title" value={appr.title} onChange={(e) => setAppr({ ...appr, title: e.target.value })} />
            <Select value={appr.kind} onChange={(e) => setAppr({ ...appr, kind: e.target.value })}>{['proof', 'sow', 'brief', 'other'].map((k) => <option key={k} value={k}>{humanize(k)}</option>)}</Select>
            <Button size="sm" disabled={!appr.title || approval.isPending} onClick={() => approval.mutate()}>Request approval</Button>
          </FormStack>
        )}
      </SectionCard>
      <SectionCard title="Change requests">
        {data.tickets.length ? data.tickets.map((t) => (
          <div key={t._id} className="flex items-start justify-between gap-2 py-1 text-sm">
            <div><p className="font-medium">{t.title}</p><p className="text-xs text-muted-foreground">{t.body}</p></div>
            {can('vendors:write') && <Button size="sm" variant="outline" onClick={() => ticket.mutate(t)}>{t.status === 'open' ? 'Resolve' : t.status}</Button>}
          </div>
        )) : <p className="text-sm text-muted-foreground">Clients file briefs and change requests from the portal.</p>}
      </SectionCard>
    </PageGrid>
  );
}
