import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { ArrowUpRight, CheckCircle2, Copy, ExternalLink, Flag, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCan } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth';
import { PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormRow, FormStack, PageGrid } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { ResourcePage } from '@/components/shared/resource-page';
import { DataTable, Select, StatCard, StatusPill, Tabs, Textarea, fmtDate, humanize, inr } from '@/components/shared/os-ui';

type Any = Record<string, any>;
const onErr = (e: Error) => toast.error(e.message);
const REFERRAL_STAGES = ['submitted', 'contacted', 'qualified_call', 'proposal_sent', 'won', 'lost'];
const PROJECT_TYPES = [
  { value: 'website', label: 'Website only' },
  { value: 'website_crm', label: 'Website + CRM/Automation' },
  { value: 'ai_growth', label: 'AI Calling Agent / Full Growth System' },
];

function PublicLink({ path, label }: { path: string; label: string }) {
  const org = useAuthStore((s) => s.organization);
  const url = `${window.location.origin}${path.replace(':org', org?.slug || '')}`;
  return (
    <Button variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success(`${label} link copied`); }}>
      <Copy className="mr-2 h-4 w-4" />{label}
    </Button>
  );
}

// ---------------------------------------------------------------- referrals
export function ReferralsPage() {
  const qc = useQueryClient();
  const can = useCan();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'referrals' | 'referrers'>('referrals');
  const [stageFor, setStageFor] = useState<Any | null>(null);
  const [stage, setStage] = useState<Any>({});
  const move = useMutation({
    mutationFn: () => api.data(`/growth/referrals/${stageFor!._id}/stage`, 'POST', { ...stage, projectValue: stage.projectValue ? Number(stage.projectValue) : undefined }),
    onSuccess: () => { toast.success('Stage updated'); setStageFor(null); qc.invalidateQueries({ queryKey: ['/growth/referrals'] }); },
    onError: onErr,
  });
  const promote = useMutation({
    mutationFn: (id: string) => api.data<Any>(`/growth/referrals/${id}/promote`, 'POST', {}),
    onSuccess: (r) => { toast.success('Added to leads'); qc.invalidateQueries({ queryKey: ['/growth/referrals'] }); if (r?.leadId || r?._id) navigate(`/crm/${r.leadId || r._id}`); },
    onError: onErr,
  });

  const header = (
    <>
      <PublicLink path="/refer/:org" label="Referral page" />
    </>
  );

  return (
    <>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'referrals', label: 'Referrals' }, { id: 'referrers', label: 'Referrers' }]} />
      {tab === 'referrals' ? (
        <ResourcePage
          key="referrals"
          title="Refer & Earn"
          description="Introductions from referral partners. Move them through the pipeline; winning one queues the partner's reward."
          endpoint="/growth/referrals"
          writePermission="growth:write"
          allowCreate={false}
          headerExtra={header}
          filters={[{ name: 'stage', label: 'Stages', options: REFERRAL_STAGES }, { name: 'rewardStatus', label: 'Rewards', options: ['not_applicable', 'pending', 'paid'] }]}
          fields={[
            { name: 'referredName', label: 'Name', required: true },
            { name: 'referredBusiness', label: 'Business' },
            { name: 'referredEmail', label: 'Email' },
            { name: 'referredPhone', label: 'Phone' },
            { name: 'referredNeeds', label: 'Needs', type: 'textarea' },
            { name: 'adminInternalNotes', label: 'Internal notes', type: 'textarea' },
          ]}
          rowActions={(r) => (
            <>
              {can('growth:write') && <Button size="sm" variant="outline" onClick={() => { setStageFor(r); setStage({ stage: r.stage, projectType: r.projectType || '', projectValue: r.projectValue || '', lostReason: '', note: '' }); }}>Move</Button>}
              {can('leads:write') && !r.leadId && <Button size="icon" variant="ghost" className="h-8 w-8" title="Add to leads" onClick={() => promote.mutate(r._id)}><ArrowUpRight className="h-3.5 w-3.5" /></Button>}
            </>
          )}
          columns={[
            { key: 'referredName', header: 'Referral', render: (r) => <div><p className="font-medium">{r.referredName} {r.flaggedDuplicate && <Flag className="inline h-3 w-3 text-amber-600" aria-label="Possible duplicate" />}</p><p className="text-xs text-muted-foreground">{r.referredBusiness || r.referredEmail || '—'}</p></div> },
            { key: 'referrer', header: 'Referred by', render: (r) => <div><p>{r.referrerId?.fullName || '—'}</p><p className="font-mono text-[10px] text-muted-foreground">{r.referrerId?.referralCode}</p></div> },
            { key: 'stage', header: 'Stage', render: (r) => <StatusPill value={r.stage} /> },
            { key: 'reward', header: 'Reward', render: (r) => (r.rewardAmount ? <span>{inr(r.rewardAmount)} <StatusPill value={r.rewardStatus} /></span> : '—') },
            { key: 'createdAt', header: 'Submitted', render: (r) => fmtDate(r.createdAt) },
          ]}
        />
      ) : (
        <ResourcePage
          key="referrers"
          title="Referrers"
          description="Referral partners and their unique codes."
          endpoint="/growth/referrers"
          writePermission="growth:write"
          createLabel="Add referrer"
          headerExtra={header}
          filters={[{ name: 'tier', label: 'Tiers', options: ['standard', 'growth_partner', 'elite_partner'] }]}
          fields={[
            { name: 'fullName', label: 'Full name', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true, createOnly: true },
            { name: 'phone', label: 'Phone' },
            { name: 'tier', label: 'Tier', type: 'select', options: ['standard', 'growth_partner', 'elite_partner'] },
            { name: 'isPublicPartner', label: 'Public partner', type: 'checkbox' },
          ]}
          columns={[
            { key: 'fullName', header: 'Referrer', render: (r) => <div><p className="font-medium">{r.fullName}</p><p className="text-xs text-muted-foreground">{r.email}</p></div> },
            { key: 'referralCode', header: 'Code', render: (r) => <span className="font-mono text-xs font-semibold">{r.referralCode}</span> },
            { key: 'tier', header: 'Tier', render: (r) => <StatusPill value={r.tier} tone="purple" /> },
            { key: 'successfulReferralCount', header: 'Won', render: (r) => r.successfulReferralCount || 0 },
            { key: 'earned', header: 'Earned / paid', render: (r) => `${inr(r.totalRewardEarned)} / ${inr(r.totalRewardPaid)}` },
          ]}
        />
      )}
      <SimpleModal open={!!stageFor} onClose={() => setStageFor(null)} title={`Move ${stageFor?.referredName || ''}`}>
        <FormStack>
          <FormField><Label>Stage</Label><Select value={stage.stage} onChange={(e) => setStage({ ...stage, stage: e.target.value })}>{REFERRAL_STAGES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select></FormField>
          {stage.stage === 'won' && (
            <FormRow>
              <FormField><Label>Project type</Label><Select value={stage.projectType} onChange={(e) => setStage({ ...stage, projectType: e.target.value })}><option value="">Select…</option>{PROJECT_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select></FormField>
              <FormField><Label>Project value (₹)</Label><Input type="number" value={stage.projectValue} onChange={(e) => setStage({ ...stage, projectValue: e.target.value })} /></FormField>
            </FormRow>
          )}
          {stage.stage === 'lost' && <FormField><Label>Reason</Label><Select value={stage.lostReason} onChange={(e) => setStage({ ...stage, lostReason: e.target.value })}><option value="">Select…</option>{['timing', 'budget', 'went_elsewhere', 'not_a_fit', 'no_response', 'other'].map((r) => <option key={r} value={r}>{humanize(r)}</option>)}</Select></FormField>}
          <FormField><Label>Note</Label><Textarea value={stage.note} onChange={(e) => setStage({ ...stage, note: e.target.value })} /></FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setStageFor(null)}>Cancel</Button>
            <Button disabled={move.isPending} onClick={() => move.mutate()}>{move.isPending ? 'Saving…' : 'Update stage'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}

export function RewardsPage() {
  const qc = useQueryClient();
  const can = useCan();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['rewards'], queryFn: () => api.data<{ rows: Any[]; totals: Any }>('/growth/referrals/rewards/queue') });
  const pay = useMutation({ mutationFn: (id: string) => api.data(`/growth/referrals/${id}/reward-paid`, 'POST', {}), onSuccess: () => { toast.success('Marked as paid'); qc.invalidateQueries({ queryKey: ['rewards'] }); }, onError: onErr });
  if (isError) return <PageError onRetry={() => refetch()} />;
  if (isLoading || !data) return <PageLoading />;
  return (
    <>
      <PageHeader title="Rewards" description="Partner rewards earned on won referrals. Pay out and mark them here." />
      <PageGrid cols="3">
        <StatCard label="Pending payout" value={inr(data.totals.pending)} hint={`${data.totals.pendingCount} rewards`} tone={data.totals.pending ? 'danger' : 'default'} />
        <StatCard label="Paid out" value={inr(data.totals.paid)} tone="success" />
        <StatCard label="Total" value={inr(data.totals.pending + data.totals.paid)} />
      </PageGrid>
      <DataTable rows={data.rows as any} empty="No rewards yet."
        columns={[
          { key: 'referrer', header: 'Partner', render: (r) => <div><p className="font-medium">{r.referrerId?.fullName}</p><p className="text-xs text-muted-foreground">{r.referrerId?.email} · {r.referrerId?.phone}</p></div> },
          { key: 'referredName', header: 'Referral', render: (r) => r.referredBusiness || r.referredName },
          { key: 'projectValue', header: 'Deal', render: (r) => inr(r.projectValue) },
          { key: 'rewardAmount', header: 'Reward', render: (r) => <span className="font-medium">{inr(r.rewardAmount)}</span> },
          { key: 'rewardStatus', header: 'Status', render: (r) => <StatusPill value={r.rewardStatus} /> },
          { key: 'x', header: '', className: 'w-px', render: (r) => r.rewardStatus === 'pending' && can('growth:write') && <Button size="sm" onClick={() => pay.mutate(r._id)}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Mark paid</Button> },
        ]} />
    </>
  );
}

// ---------------------------------------------------------------- jobs
interface FormFieldDef { id: string; type: string; label: string; required?: boolean; placeholder?: string; options?: { value: string; label: string }[] }

export function JobsPage() {
  const qc = useQueryClient();
  const can = useCan();
  const navigate = useNavigate();
  const org = useAuthStore((s) => s.organization);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Any | null>(null);
  const [form, setForm] = useState<Any>({});
  const save = useMutation({
    mutationFn: () => {
      const { _id, slug, createdAt, updatedAt, organizationId, publishedAt, __v, createdBy, updatedBy, recordStatus, ...body } = form;
      void _id; void slug; void createdAt; void updatedAt; void organizationId; void publishedAt; void __v; void createdBy; void updatedBy; void recordStatus;
      return editing ? api.data(`/growth/jobs/${editing._id}`, 'PATCH', body) : api.data('/growth/jobs', 'POST', body);
    },
    onSuccess: () => { toast.success('Job saved'); setOpen(false); qc.invalidateQueries({ queryKey: ['/growth/jobs'] }); },
    onError: onErr,
  });
  const openForm = (row: Any | null) => {
    setEditing(row);
    setForm(row ? { ...row } : { title: '', department: '', location: '', employmentType: 'full_time', summary: '', description: '', requirements: '', benefits: '', status: 'draft', formFields: [] });
    setOpen(true);
  };
  const fields: FormFieldDef[] = form.formFields || [];
  const setField = (i: number, patch: Partial<FormFieldDef>) => setForm({ ...form, formFields: fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });
  return (
    <>
      <ResourcePage
        title="Jobs"
        description="Openings published on your public careers page, each with its own application form."
        endpoint="/growth/jobs"
        writePermission="growth:write"
        allowCreate={false}
        allowEdit={false}
        allowDelete
        deleteLabel="Archive"
        headerExtra={
          <>
            <PublicLink path="/careers/:org" label="Careers page" />
            {can('growth:write') && <Button onClick={() => openForm(null)}><Plus className="mr-2 h-4 w-4" />New job</Button>}
          </>
        }
        filters={[{ name: 'status', label: 'Statuses', options: ['draft', 'published', 'closed'] }]}
        rowActions={(r) => (
          <>
            <Button size="sm" variant="ghost" onClick={() => navigate(`/growth/applications?jobId=${r._id}`)}>Applications</Button>
            {r.status === 'published' && <Button size="icon" variant="ghost" className="h-8 w-8" asChild><a href={`/careers/${org?.slug}/${r.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>}
            {can('growth:write') && <Button size="sm" variant="outline" onClick={() => openForm(r)}>Edit</Button>}
          </>
        )}
        columns={[
          { key: 'title', header: 'Role', render: (r) => <div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{[r.department, r.location].filter(Boolean).join(' · ')}</p></div> },
          { key: 'employmentType', header: 'Type', render: (r) => humanize(r.employmentType) },
          { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
          { key: 'publishedAt', header: 'Published', render: (r) => fmtDate(r.publishedAt) },
        ]}
      />
      <SimpleModal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit job' : 'New job'}>
        <FormStack>
          <FormField><Label>Title *</Label><Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormField>
          <FormRow>
            <FormField><Label>Department</Label><Input value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} /></FormField>
            <FormField><Label>Location</Label><Input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} /></FormField>
          </FormRow>
          <FormRow>
            <FormField><Label>Type</Label><Select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>{['full_time', 'part_time', 'contract', 'internship', 'freelance'].map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</Select></FormField>
            <FormField><Label>Status</Label><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{['draft', 'published', 'closed'].map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</Select></FormField>
          </FormRow>
          <FormField><Label>Summary</Label><Input value={form.summary || ''} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></FormField>
          <FormField><Label>Description</Label><Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
          <FormField><Label>Requirements</Label><Textarea value={form.requirements || ''} onChange={(e) => setForm({ ...form, requirements: e.target.value })} /></FormField>
          <FormField><Label>Benefits</Label><Textarea value={form.benefits || ''} onChange={(e) => setForm({ ...form, benefits: e.target.value })} /></FormField>
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Application form questions</p>
              <Button size="sm" variant="outline" onClick={() => setForm({ ...form, formFields: [...fields, { id: `q${Date.now().toString(36)}`, type: 'text', label: '', required: false }] })}><Plus className="mr-1 h-3.5 w-3.5" />Question</Button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Name, email and phone are always asked.</p>
            <div className="flex flex-col gap-2">
              {fields.map((f, i) => (
                <div key={f.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input placeholder="Question" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
                  <Select className="sm:w-32" value={f.type} onChange={(e) => setField(i, { type: e.target.value })}>{['text', 'textarea', 'url', 'number', 'select'].map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</Select>
                  {f.type === 'select' && <Input className="sm:w-44" placeholder="Options, comma separated" value={(f.options || []).map((o) => o.label).join(', ')} onChange={(e) => setField(i, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean).map((s) => ({ value: s, label: s })) })} />}
                  <label className="flex shrink-0 items-center gap-1 text-xs"><input type="checkbox" checked={Boolean(f.required)} onChange={(e) => setField(i, { required: e.target.checked })} />Required</label>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-error" onClick={() => setForm({ ...form, formFields: fields.filter((_, idx) => idx !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          </div>
          <FormActions>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.title || fields.some((f) => !f.label) || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save job'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}

export function ApplicationsPage() {
  const params = new URLSearchParams(window.location.search);
  const [viewing, setViewing] = useState<Any | null>(null);
  return (
    <>
      <ResourcePage
        title="Applications"
        description="Candidates who applied from the careers page."
        endpoint="/growth/applications"
        listQuery={params.get('jobId') ? `jobId=${params.get('jobId')}` : ''}
        writePermission="growth:write"
        allowCreate={false}
        filters={[{ name: 'status', label: 'Statuses', options: ['new', 'reviewing', 'shortlisted', 'rejected', 'hired'] }]}
        fields={[
          { name: 'status', label: 'Status', type: 'select', options: ['new', 'reviewing', 'shortlisted', 'rejected', 'hired'] },
          { name: 'adminNotes', label: 'Notes', type: 'textarea' },
        ]}
        rowActions={(r) => <Button size="sm" variant="ghost" onClick={() => setViewing(r)}>View</Button>}
        columns={[
          { key: 'applicantName', header: 'Applicant', render: (r) => <div><p className="font-medium">{r.applicantName}</p><p className="text-xs text-muted-foreground">{[r.applicantEmail, r.applicantPhone].filter(Boolean).join(' · ')}</p></div> },
          { key: 'jobTitle', header: 'Role', render: (r) => r.jobTitle },
          { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
          { key: 'createdAt', header: 'Applied', render: (r) => fmtDate(r.createdAt) },
        ]}
      />
      <SimpleModal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.applicantName || ''}>
        <FormStack>
          <p className="text-sm text-muted-foreground">{viewing?.jobTitle} · {[viewing?.applicantEmail, viewing?.applicantPhone].filter(Boolean).join(' · ')}</p>
          {(viewing?.answers || []).map((a: Any) => (
            <div key={a.fieldId || a.label}><p className="text-xs text-muted-foreground">{a.label}</p><p className="whitespace-pre-wrap text-sm">{String(a.value ?? '—')}</p></div>
          ))}
          {!viewing?.answers?.length && <p className="text-sm text-muted-foreground">No extra answers.</p>}
          {viewing?.adminNotes && <div className="border-t pt-3"><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{viewing.adminNotes}</p></div>}
        </FormStack>
      </SimpleModal>
    </>
  );
}

const EGA_FIELD_TYPES = ['text', 'email', 'select', 'multiselect', 'scale', 'textarea'] as const;

export function EgaPage() {
  const qc = useQueryClient();
  const can = useCan();
  const [tab, setTab] = useState<'applications' | 'form' | 'scoring'>('applications');
  const { data: form, isLoading } = useQuery({ queryKey: ['ega-form'], queryFn: () => api.data<Any>('/growth/ega/form') });
  const [draft, setDraft] = useState<Any | null>(null);
  const fields: Any[] = (draft || form)?.fields || [];
  const working = draft || form;
  const setField = (i: number, patch: Any) => {
    const src = draft || form;
    if (!src) return;
    setDraft({ ...src, fields: (src.fields || []).map((f: Any, idx: number) => (idx === i ? { ...f, ...patch } : f)) });
  };
  const startEdit = () => setDraft(form ? { ...form, fields: (form.fields || []).map((f: Any) => ({ ...f })) } : null);
  const save = useMutation({
    mutationFn: () => {
      const src = draft || form;
      if (!src) throw new Error('Form not loaded');
      return api.data('/growth/ega/form', 'PUT', { title: src.title, subtitle: src.subtitle, published: src.published, fields: src.fields });
    },
    onSuccess: () => { toast.success('Form published to /ega'); qc.invalidateQueries({ queryKey: ['ega-form'] }); },
    onError: onErr,
  });

  return (
    <>
      <Tabs value={tab} onChange={(t) => { setTab(t); if (t !== 'applications' && form && !draft) startEdit(); }} tabs={[
        { id: 'applications', label: 'Applications' }, { id: 'form', label: 'Edit form' }, { id: 'scoring', label: 'Scoring' },
      ]} />
      {tab === 'applications' && (
        <ResourcePage
          title="EGA applications"
          description="Applicants ranked by the live form’s scoring. Change questions in Edit form — the public page updates immediately."
          endpoint="/growth/ega"
          writePermission="growth:write"
          allowCreate={false}
          emptyText="No applications yet. Share the public EGA form to collect them."
          headerExtra={<PublicLink path="/ega/:org" label="EGA form" />}
          filters={[{ name: 'status', label: 'Statuses', options: ['pending', 'shortlisted', 'selected', 'lookback', 'rejected'] }]}
          fields={[
            { name: 'status', label: 'Status', type: 'select', options: ['pending', 'shortlisted', 'selected', 'lookback', 'rejected'] },
            { name: 'adminNotes', label: 'Notes', type: 'textarea' },
          ]}
          columns={[
            { key: 'fullName', header: 'Applicant', render: (r) => <div><p className="font-medium">{r.fullName}</p><p className="text-xs text-muted-foreground">{[r.email, r.phone].filter(Boolean).join(' · ')}</p></div> },
            { key: 'college', header: 'College / city', render: (r) => [r.college, r.city].filter(Boolean).join(' · ') || '—' },
            { key: 'score', header: 'Score', render: (r) => <span className="font-semibold tabular-nums">{r.score ?? 0}</span> },
            { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
            { key: 'createdAt', header: 'Applied', render: (r) => fmtDate(r.createdAt) },
          ]}
        />
      )}
      {tab !== 'applications' && isLoading && <PageLoading />}
      {tab === 'form' && working && (
        <>
          <PageHeader title="Edit EGA form" description="These questions drive the public /ega page. No deploy needed."
            action={can('growth:write') && <Button disabled={save.isPending || fields.some((f) => !f.label)} onClick={() => { if (!draft) startEdit(); save.mutate(); }}>{save.isPending ? 'Saving…' : 'Save form'}</Button>} />
          <FormStack>
            <FormRow>
              <FormField><Label>Title</Label><Input value={working.title || ''} onChange={(e) => setDraft({ ...working, title: e.target.value })} /></FormField>
              <FormField><Label>Published</Label>
                <Select value={working.published ? 'yes' : 'no'} onChange={(e) => setDraft({ ...working, published: e.target.value === 'yes' })}>
                  <option value="yes">Live on public page</option><option value="no">Hidden</option>
                </Select>
              </FormField>
            </FormRow>
            <FormField><Label>Subtitle</Label><Input value={working.subtitle || ''} onChange={(e) => setDraft({ ...working, subtitle: e.target.value })} /></FormField>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setDraft({ ...working, fields: [...fields, { id: `q${Date.now().toString(36)}`, type: 'text', label: '', section: 'About you', required: false }] })}><Plus className="mr-1 h-3.5 w-3.5" />Question</Button>
            </div>
            {fields.map((f, i) => (
              <div key={f.id} className="rounded-md border p-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input placeholder="Question" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
                  <Select className="sm:w-36" value={f.type} onChange={(e) => setField(i, { type: e.target.value })}>{EGA_FIELD_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</Select>
                  <Input className="sm:w-40" placeholder="Section" value={f.section || ''} onChange={(e) => setField(i, { section: e.target.value })} />
                  <label className="flex shrink-0 items-center gap-1 text-xs"><input type="checkbox" checked={Boolean(f.required)} onChange={(e) => setField(i, { required: e.target.checked })} />Required</label>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-error" onClick={() => setDraft({ ...working, fields: fields.filter((_, idx) => idx !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                {['select', 'multiselect'].includes(f.type) && (
                  <Input className="mt-2" placeholder="Options, comma separated" value={(f.options || []).map((o: Any) => o.label).join(', ')}
                    onChange={(e) => setField(i, { options: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean).map((s: string) => ({ value: s, label: s })) })} />
                )}
              </div>
            ))}
          </FormStack>
        </>
      )}
      {tab === 'scoring' && working && (
        <>
          <PageHeader title="Scoring" description="Points per answer. Totals cap at 100. Leave blank for unscored questions."
            action={can('growth:write') && <Button disabled={save.isPending} onClick={() => { if (!draft) startEdit(); save.mutate(); }}>{save.isPending ? 'Saving…' : 'Save scoring'}</Button>} />
          {fields.map((f: Any, i: number) => (
            <div key={f.id} className="grid gap-2 border-b py-3 sm:grid-cols-[1fr_200px_120px]">
              <p className="text-sm font-medium">{f.label}<span className="ml-2 text-xs text-muted-foreground">{f.section}</span></p>
              <Input placeholder="Yes:8, No:0" value={f.scoreMap ? Object.entries(f.scoreMap).map(([k, v]) => `${k}:${v}`).join(', ') : ''}
                onChange={(e) => {
                  const scoreMap: Record<string, number> = {};
                  e.target.value.split(',').forEach((part) => {
                    const [k, v] = part.split(':').map((s) => s.trim());
                    if (k && v && !Number.isNaN(Number(v))) scoreMap[k] = Number(v);
                  });
                  setField(i, { scoreMap: Object.keys(scoreMap).length ? scoreMap : undefined });
                }} />
              <Input type="number" placeholder="Max" value={f.maxScore ?? ''} onChange={(e) => setField(i, { maxScore: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
          ))}
        </>
      )}
    </>
  );
}

export function NewsletterPage() {
  const qc = useQueryClient();
  const can = useCan();
  const org = useAuthStore((s) => s.organization);
  const [tab, setTab] = useState<'subscribers' | 'campaigns' | 'templates'>('campaigns');
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['newsletter'], queryFn: () => api.data<{ rows: Any[]; total: number; subscribed: number }>('/growth/newsletter') });
  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: () => api.data<Any[]>('/growth/newsletter/campaigns') });
  const { data: articles } = useQuery({ queryKey: ['/growth/magazine/articles'], queryFn: () => api.list<Any>('/growth/magazine/articles?limit=50') });
  const [compose, setCompose] = useState(false);
  const [camp, setCamp] = useState<Any>({ subject: '', body: '', articleId: '' });
  const toggle = useMutation({ mutationFn: (r: Any) => api.data(`/growth/newsletter/${r._id}`, 'PATCH', { status: r.status === 'subscribed' ? 'unsubscribed' : 'subscribed' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['newsletter'] }), onError: onErr });
  const createCamp = useMutation({
    mutationFn: () => api.data('/growth/newsletter/campaigns', 'POST', { subject: camp.subject, body: camp.body, articleId: camp.articleId || undefined }),
    onSuccess: () => { toast.success('Draft saved'); setCompose(false); qc.invalidateQueries({ queryKey: ['campaigns'] }); },
    onError: onErr,
  });
  const send = useMutation({
    mutationFn: (id: string) => api.data<Any>(`/growth/newsletter/campaigns/${id}/send`, 'POST', {}),
    onSuccess: (r: Any) => { toast.success(r.skippedSmtp ? 'Marked sent (SMTP not configured)' : `Sent to ${r.deliveredCount} subscribers`); qc.invalidateQueries({ queryKey: ['campaigns'] }); },
    onError: onErr,
  });
  const exportCsv = () => {
    const rows = (data?.rows || []).filter((r) => r.status === 'subscribed');
    const csv = ['email,source,subscribed_at', ...rows.map((r) => `${r.email},${r.source || ''},${r.createdAt}`)].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'newsletter-subscribers.csv';
    a.click();
  };
  return (
    <>
      <PageHeader title="Newsletter" description="Email campaigns to subscribers. Magazine lives next door — promote an article from a campaign."
        action={<><PublicLink path="/newsletter/:org" label="Subscribe page" /><PublicLink path="/magazine/:org" label="Magazine" /></>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'campaigns', label: 'Campaigns' }, { id: 'subscribers', label: 'Subscribers' }, { id: 'templates', label: 'Templates' }]} />
      {tab === 'campaigns' && (
        <>
          <div className="flex justify-end">{can('growth:write') && <Button onClick={() => { setCamp({ subject: '', body: '', articleId: '' }); setCompose(true); }}><Plus className="mr-2 h-4 w-4" />Compose</Button>}</div>
          <DataTable rows={campaigns as any} empty="No campaigns yet. Compose one and send to everyone who subscribed."
            columns={[
              { key: 'subject', header: 'Subject', render: (r) => <span className="font-medium">{r.subject}</span> },
              { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
              { key: 'recipientCount', header: 'Audience', render: (r) => r.recipientCount || '—' },
              { key: 'sentAt', header: 'Sent', render: (r) => r.sentAt ? fmtDate(r.sentAt) : '—' },
              { key: 'x', header: '', className: 'w-px', render: (r) => r.status === 'draft' && can('growth:write') && <Button size="sm" onClick={() => send.mutate(r._id)} disabled={send.isPending}>Send</Button> },
            ]} />
        </>
      )}
      {tab === 'subscribers' && (
        isError ? <PageError onRetry={() => refetch()} /> : isLoading || !data ? <PageLoading /> : (
          <>
            <PageGrid cols="2">
              <StatCard label="Subscribed" value={data.subscribed} tone="success" />
              <StatCard label="Total signups" value={data.total} />
            </PageGrid>
            <div className="flex justify-end"><Button variant="outline" onClick={exportCsv}>Export CSV</Button></div>
            <DataTable rows={data.rows as any} empty="No subscribers yet. Embed the subscribe page or magazine CTA."
              columns={[
                { key: 'email', header: 'Email', render: (r) => <span className="font-medium">{r.email}</span> },
                { key: 'source', header: 'Source', render: (r) => r.source || '—' },
                { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status === 'subscribed' ? 'active' : 'inactive'} /> },
                { key: 'createdAt', header: 'Joined', render: (r) => fmtDate(r.createdAt) },
                { key: 'x', header: '', className: 'w-px', render: (r) => can('growth:write') && <Button size="sm" variant="ghost" onClick={() => toggle.mutate(r)}>{r.status === 'subscribed' ? 'Unsubscribe' : 'Resubscribe'}</Button> },
              ]} />
          </>
        )
      )}
      {tab === 'templates' && (
        <ResourcePage
          title="Email templates"
          description="Reusable subject and body snippets for campaigns."
          endpoint="/growth/newsletter/templates"
          writePermission="growth:write"
          emptyText="Save a template, then copy it into Compose."
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'subject', label: 'Subject' },
            { name: 'body', label: 'Body', type: 'textarea' },
          ]}
          columns={[
            { key: 'name', header: 'Template', render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'subject', header: 'Subject', render: (r) => r.subject || '—' },
          ]}
        />
      )}
      <SimpleModal open={compose} onClose={() => setCompose(false)} title="Compose campaign">
        <FormStack>
          <FormField><Label>Subject *</Label><Input value={camp.subject} onChange={(e) => setCamp({ ...camp, subject: e.target.value })} /></FormField>
          <FormField><Label>Body *</Label><Textarea value={camp.body} onChange={(e) => setCamp({ ...camp, body: e.target.value })} /></FormField>
          <FormField><Label>Promote magazine article</Label>
            <Select value={camp.articleId} onChange={(e) => setCamp({ ...camp, articleId: e.target.value })}>
              <option value="">None</option>
              {(articles?.data || []).map((a) => <option key={a._id} value={a._id}>{a.title}</option>)}
            </Select>
          </FormField>
          <p className="text-xs text-muted-foreground">Sends to all subscribed addresses via SMTP when configured. {org?.slug ? `Public magazine: /magazine/${org.slug}` : ''}</p>
          <FormActions>
            <Button variant="outline" onClick={() => setCompose(false)}>Cancel</Button>
            <Button disabled={!camp.subject || !camp.body || createCamp.isPending} onClick={() => createCamp.mutate()}>{createCamp.isPending ? 'Saving…' : 'Save draft'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}

export function MagazinePage() {
  const [tab, setTab] = useState<'articles' | 'issues'>('articles');
  const { data: issues } = useQuery({ queryKey: ['/growth/magazine/issues'], queryFn: () => api.list<Any>('/growth/magazine/issues?all=true') });
  const issueOpts = (issues?.data || []).map((i) => ({ value: i._id, label: i.title }));
  return (
    <>
      <PageHeader title="Magazine" description="The public newspaper. Publish an article, then promote it from Newsletter → Campaigns."
        action={<PublicLink path="/magazine/:org" label="Magazine home" />} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'articles', label: 'Articles' }, { id: 'issues', label: 'Issues' }]} />
      {tab === 'articles' ? (
        <ResourcePage
          title="Articles"
          description="Stories on your public magazine. Set status to published to go live."
          endpoint="/growth/magazine/articles"
          writePermission="growth:write"
          emptyText="Write the first piece — it appears at /magazine for this company."
          createLabel="New article"
          filters={[{ name: 'status', label: 'Statuses', options: ['draft', 'published'] }]}
          fields={[
            { name: 'title', label: 'Title', required: true },
            { name: 'excerpt', label: 'Excerpt', type: 'textarea' },
            { name: 'body', label: 'Body', type: 'textarea', required: true },
            { name: 'cover', label: 'Cover image URL' },
            { name: 'tags', label: 'Tags (comma separated)', help: 'Stored as a list' },
            { name: 'issueId', label: 'Issue', type: 'select', options: issueOpts },
            { name: 'status', label: 'Status', type: 'select', options: ['draft', 'published'] },
          ]}
          toPayload={(form) => ({
            ...form,
            tags: String(form.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean),
            issueId: form.issueId || undefined,
          })}
          columns={[
            { key: 'title', header: 'Article', render: (r) => <div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.excerpt || r.slug}</p></div> },
            { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
            { key: 'publishedAt', header: 'Published', render: (r) => fmtDate(r.publishedAt) },
          ]}
        />
      ) : (
        <ResourcePage
          title="Issues"
          description="Optional editions to group articles (like a print issue)."
          endpoint="/growth/magazine/issues"
          writePermission="growth:write"
          emptyText="Issues are optional. Publish articles without one if you prefer a running feed."
          createLabel="New issue"
          filters={[{ name: 'status', label: 'Statuses', options: ['draft', 'published'] }]}
          fields={[
            { name: 'title', label: 'Title', required: true },
            { name: 'summary', label: 'Summary', type: 'textarea' },
            { name: 'cover', label: 'Cover image URL' },
            { name: 'status', label: 'Status', type: 'select', options: ['draft', 'published'] },
          ]}
          columns={[
            { key: 'title', header: 'Issue', render: (r) => <span className="font-medium">{r.title}</span> },
            { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
            { key: 'publishedAt', header: 'Published', render: (r) => fmtDate(r.publishedAt) },
          ]}
        />
      )}
    </>
  );
}
