import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { Copy, ExternalLink, Link2, Plus, RefreshCw, ShieldOff, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCan } from '@/lib/permissions';
import { PageHeader, Breadcrumbs } from '@/components/layout/page-header';
import { FormActions, FormField, FormRow, FormStack, PageGrid } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { ResourcePage, type Row } from '@/components/shared/resource-page';
import {
  DataTable, KeyValue, SectionCard, Select, StatCard, StatusPill, Textarea, fmtDate, fmtDateTime, inr, toDateInput,
} from '@/components/shared/os-ui';

type Any = Record<string, any>;

// ---------------------------------------------------------------- convert lead
export function ConvertLeadModal({ lead, open, onClose }: { lead: Any; open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<Any>(() => ({
    companyName: lead.company || '', contactPerson: [lead.firstName, lead.lastName].filter(Boolean).join(' '),
    email: lead.email || '', phone: lead.phone || '', conversionValue: lead.estimatedValue || '', services: '',
    expectedStart: '', createProject: true, projectName: lead.company ? `${lead.company} project` : '', notes: '',
  }));
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const { data: dupes } = useQuery({
    queryKey: ['dupes', lead._id, open],
    enabled: open,
    queryFn: () => api.data<{ vendors: Any[] }>('/conversions/preview-duplicates', 'POST', { companyName: form.companyName, email: form.email, phone: form.phone }),
  });
  const convert = useMutation({
    mutationFn: () =>
      api.data<{ publicCode: string }>(`/conversions/convert-lead/${lead._id}`, 'POST', {
        ...form,
        conversionValue: form.conversionValue ? Number(form.conversionValue) : undefined,
        services: String(form.services || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        expectedStart: form.expectedStart || undefined,
        selectedVendorId: selectedVendorId || undefined,
        forceNew: !selectedVendorId,
      }),
    onSuccess: (r) => {
      toast.success(`Converted · ${r.publicCode}`);
      qc.invalidateQueries();
      onClose();
      navigate(`/conversions/${r.publicCode}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <SimpleModal open={open} onClose={onClose} title="Convert lead to client">
      <FormStack>
        {!!dupes?.vendors?.length && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-900/20">
            <p className="font-medium">Possible existing client</p>
            <p className="mb-2 text-xs text-muted-foreground">Link to an existing client instead of creating a duplicate.</p>
            <Select value={selectedVendorId} onChange={(e) => setSelectedVendorId(e.target.value)}>
              <option value="">Create a new client</option>
              {dupes.vendors.map((v) => <option key={v.vendorId} value={v.vendorId}>{v.companyName} {v.publicCode && `(${v.publicCode})`}</option>)}
            </Select>
          </div>
        )}
        <FormRow>
          <FormField><Label>Company *</Label><Input value={form.companyName} onChange={set('companyName')} /></FormField>
          <FormField><Label>Contact person</Label><Input value={form.contactPerson} onChange={set('contactPerson')} /></FormField>
        </FormRow>
        <FormRow>
          <FormField><Label>Email</Label><Input value={form.email} onChange={set('email')} /></FormField>
          <FormField><Label>Phone</Label><Input value={form.phone} onChange={set('phone')} /></FormField>
        </FormRow>
        <FormRow>
          <FormField><Label>Deal value (₹)</Label><Input type="number" value={form.conversionValue} onChange={set('conversionValue')} /></FormField>
          <FormField><Label>Expected start</Label><Input type="date" value={form.expectedStart} onChange={set('expectedStart')} /></FormField>
        </FormRow>
        <FormField><Label>Services</Label><Input placeholder="Website, SEO" value={form.services} onChange={set('services')} /></FormField>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" checked={form.createProject} onChange={(e) => setForm({ ...form, createProject: e.target.checked })} />
          Create a delivery project
        </label>
        {form.createProject && <FormField><Label>Project name</Label><Input value={form.projectName} onChange={set('projectName')} /></FormField>}
        <FormField><Label>Notes</Label><Textarea value={form.notes} onChange={set('notes')} /></FormField>
        <FormActions>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={convert.isPending || !form.companyName} onClick={() => convert.mutate()}>{convert.isPending ? 'Converting…' : 'Convert'}</Button>
        </FormActions>
      </FormStack>
    </SimpleModal>
  );
}

// ---------------------------------------------------------------- conversions list
export function ConversionsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['conversions'], queryFn: () => api.data<Any[]>('/conversions') });
  const [search, setSearch] = useState('');
  const rows = (data || []).filter((c) => !search || `${c.publicCode} ${c.vendor?.companyName}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <PageHeader title="Conversions" description="Every won lead and direct client, with its EC code, value and services." />
      <Input className="sm:max-w-xs" placeholder="Search code or company…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {isError ? <PageError onRetry={() => refetch()} /> : isLoading ? <PageLoading /> : (
        <DataTable
          rows={rows as Row[]}
          onRowClick={(r) => navigate(`/conversions/${r.publicCode}`)}
          empty="No conversions yet. Convert a lead from the Leads page."
          columns={[
            { key: 'publicCode', header: 'Code', render: (r) => <span className="font-mono text-xs font-semibold">{r.publicCode}</span> },
            { key: 'company', header: 'Client', render: (r) => r.vendor?.companyName || '—' },
            { key: 'value', header: 'Value', render: (r) => inr(r.conversionValue) },
            { key: 'services', header: 'Services', render: (r) => (r.services || []).join(', ') || '—' },
            { key: 'origin', header: 'Origin', render: (r) => <StatusPill value={r.origin} /> },
            { key: 'convertedAt', header: 'Converted', render: (r) => fmtDate(r.convertedAt) },
          ]}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------- portal card
export function PortalCard({ conversionUuid, portal, onChange }: { conversionUuid: string; portal?: Any | null; onChange: () => void }) {
  const [url, setUrl] = useState('');
  const generate = useMutation({
    mutationFn: (rotate: boolean) => api.data<{ url: string; path: string }>(`/conversions/${conversionUuid}/portal`, 'POST', { rotate }),
    onSuccess: (r) => { setUrl(`${window.location.origin}${r.path}`); onChange(); toast.success('Portal link ready'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const revoke = useMutation({
    mutationFn: () => api.data(`/conversions/${conversionUuid}/portal`, 'DELETE'),
    onSuccess: () => { setUrl(''); onChange(); toast.success('Portal revoked'); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <SectionCard title="Client portal">
      <FormStack>
        <p className="text-sm text-muted-foreground">
          {portal?.isActive ? `Active · last visit ${portal.lastLoginAt ? fmtDateTime(portal.lastLoginAt) : 'never'}` : 'No portal link generated yet.'}
        </p>
        {url && (
          <div className="flex items-center gap-2">
            <Input readOnly value={url} className="font-mono text-xs" />
            <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success('Copied'); }}><Copy className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => generate.mutate(false)} disabled={generate.isPending}><Link2 className="mr-1.5 h-3.5 w-3.5" />{portal?.isActive ? 'Show link' : 'Generate client portal'}</Button>
          {portal?.isActive && (
            <>
              <Button size="sm" variant="outline" onClick={() => window.confirm('Rotate the link? The old link stops working.') && generate.mutate(true)}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Rotate</Button>
              <Button size="sm" variant="ghost" className="text-error" onClick={() => revoke.mutate()}><ShieldOff className="mr-1.5 h-3.5 w-3.5" />Revoke</Button>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Generating again keeps the same link. Rotate only if the link has leaked.</p>
      </FormStack>
    </SectionCard>
  );
}

function RollupCards({ rollup }: { rollup: Any }) {
  return (
    <PageGrid cols="4">
      <StatCard label="Contract value" value={inr(rollup?.contract)} hint={`${rollup?.projectCount || 0} projects`} />
      <StatCard label="Invoiced" value={inr(rollup?.invoiced)} />
      <StatCard label="Received" value={inr(rollup?.received)} tone="success" hint={`${rollup?.collectedPct || 0}% collected`} />
      <StatCard label="Outstanding" value={inr(rollup?.outstanding)} tone={rollup?.outstanding ? 'danger' : 'default'} />
    </PageGrid>
  );
}

function ClientRecords({ projects, invoices, payments, meetings, documents, activity }: Any) {
  return (
    <>
      <SectionCard title="Projects" bodyClassName="p-0">
        <DataTable rows={projects || []} empty="No projects yet."
          columns={[
            { key: 'name', header: 'Project', render: (r) => <Link className="font-medium hover:underline" to={`/projects/${r._id}`}>{r.name}</Link> },
            { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
            { key: 'progress', header: 'Progress', render: (r) => `${r.progress || 0}%` },
            { key: 'expectedDelivery', header: 'Delivery', render: (r) => fmtDate(r.expectedDelivery) },
          ]} />
      </SectionCard>
      <SectionCard title="Invoices" bodyClassName="p-0">
        <DataTable rows={invoices || []} empty="No invoices yet."
          columns={[
            { key: 'invoiceNumber', header: 'Invoice', render: (r) => <Link className="font-mono text-xs font-semibold hover:underline" to={`/invoices/${r._id}`}>{r.invoiceNumber}</Link> },
            { key: 'total', header: 'Total', render: (r) => inr(r.total) },
            { key: 'outstanding', header: 'Outstanding', render: (r) => inr(r.outstanding) },
            { key: 'displayStatus', header: 'Status', render: (r) => <StatusPill value={r.displayStatus} /> },
          ]} />
      </SectionCard>
      <PageGrid cols="3">
        <SectionCard title="Payments">
          {payments?.length ? payments.slice(0, 8).map((p: Any) => (
            <div key={p._id} className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">{fmtDate(p.paidAt)} · {p.method || '—'}</span><span className="font-medium">{inr(p.amount)}</span></div>
          )) : <p className="text-sm text-muted-foreground">No payments received.</p>}
        </SectionCard>
        <SectionCard title="Meetings">
          {meetings?.length ? meetings.slice(0, 6).map((m: Any) => (
            <div key={m._id} className="flex justify-between py-1 text-sm"><span className="truncate">{m.title}</span><span className="text-xs text-muted-foreground">{fmtDateTime(m.startsAt)}</span></div>
          )) : <p className="text-sm text-muted-foreground">No meetings logged.</p>}
        </SectionCard>
        <SectionCard title="Documents">
          {documents?.length ? documents.slice(0, 8).map((d: Any) => (
            <div key={d._id} className="flex items-center justify-between py-1 text-sm"><span className="truncate">{d.title}</span>{d.visibleToClient && <StatusPill value="shared" tone="green" />}</div>
          )) : <p className="text-sm text-muted-foreground">No documents.</p>}
        </SectionCard>
      </PageGrid>
      <SectionCard title="Activity">
        {activity?.length ? (
          <ul className="flex flex-col gap-2">
            {activity.slice(0, 20).map((a: Any) => (
              <li key={a._id} className="flex justify-between gap-4 text-sm"><span><span className="font-medium">{a.title}</span>{a.detail && <span className="text-muted-foreground"> · {a.detail}</span>}</span><span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(a.createdAt)}</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No activity yet.</p>}
      </SectionCard>
    </>
  );
}

// ---------------------------------------------------------------- conversion hub
export function ConversionHubPage() {
  const { code = '' } = useParams();
  const can = useCan();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['conversion', code], queryFn: () => api.data<Any>(`/conversions/code/${code}`) });
  if (isError) return <PageError message="Conversion not found" onRetry={() => refetch()} />;
  if (isLoading || !data) return <PageLoading rows={6} />;
  const { conversion, vendor, lead } = data;
  return (
    <>
      <Breadcrumbs items={[{ label: 'Conversions', href: '/conversions' }, { label: conversion.publicCode }]} />
      <PageHeader
        title={vendor?.companyName || conversion.publicCode}
        description={`${conversion.publicCode} · converted ${fmtDate(conversion.convertedAt)}`}
        action={
          <>
            {vendor && <Button variant="outline" asChild><Link to={`/clients/${vendor._id}`}>Client record</Link></Button>}
            <Button variant="outline" asChild><a href={`/track/${data.organizationSlug}/${conversion.publicCode}`} target="_blank" rel="noreferrer">Public tracking</a></Button>
          </>
        }
      />
      <RollupCards rollup={data.rollup} />
      <PageGrid cols="2">
        <SectionCard title="Client">
          <KeyValue items={[
            ['Contact', vendor?.contactPerson], ['Email', vendor?.email], ['Phone', vendor?.phone],
            ['Deal value', inr(conversion.conversionValue)], ['Services', (conversion.services || []).join(', ')],
            ['Lead', lead ? <Link className="hover:underline" to={`/crm/${lead._id}`}>{[lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.company}</Link> : null],
          ]} />
        </SectionCard>
        {can('vendors:write') ? <PortalCard conversionUuid={conversion.conversionUuid} portal={data.portal} onChange={() => refetch()} /> : <div />}
      </PageGrid>
      <ClientRecords {...data} />
    </>
  );
}

// ---------------------------------------------------------------- clients
const CLIENT_FIELDS = [
  { name: 'companyName', label: 'Company name', required: true },
  { name: 'contactPerson', label: 'Contact person' },
  { name: 'email', label: 'Email', type: 'email' as const },
  { name: 'phone', label: 'Phone' },
  { name: 'industry', label: 'Industry' },
  { name: 'location', label: 'Location' },
  { name: 'gstNumber', label: 'GST number' },
  { name: 'website', label: 'Website' },
  { name: 'accountOwner', label: 'Account owner' },
  { name: 'activeStatus', label: 'Status', type: 'select' as const, options: ['working_on_project', 'active', 'inactive'] },
  { name: 'notes', label: 'Notes', type: 'textarea' as const },
];

export function ClientsPage() {
  const [direct, setDirect] = useState(false);
  const [form, setForm] = useState<Any>({ companyName: '', contactPerson: '', email: '', phone: '', conversionValue: '', services: '' });
  const navigate = useNavigate();
  const can = useCan();
  const create = useMutation({
    mutationFn: () => api.data<{ vendor: Any; publicCode: string }>('/clients/direct', 'POST', {
      ...form,
      conversionValue: form.conversionValue ? Number(form.conversionValue) : undefined,
      services: String(form.services).split(',').map((s: string) => s.trim()).filter(Boolean),
    }),
    onSuccess: (r) => { toast.success(`Client added · ${r.publicCode}`); setDirect(false); navigate(`/clients/${r.vendor._id}`); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <>
      <ResourcePage
        title="Clients"
        description="Companies you work with. Converting a lead or adding a direct client creates the record."
        endpoint="/clients"
        writePermission="vendors:write"
        allowCreate={false}
        filters={[{ name: 'activeStatus', label: 'Statuses', options: ['working_on_project', 'active', 'inactive'] }]}
        fields={CLIENT_FIELDS}
        rowHref={(r) => `/clients/${r._id}`}
        headerExtra={can('vendors:write') && <Button className="w-full sm:w-auto" onClick={() => setDirect(true)}><Plus className="mr-2 h-4 w-4" />Add direct client</Button>}
        columns={[
          { key: 'companyName', header: 'Company', render: (r) => <span className="font-medium">{r.companyName}</span> },
          { key: 'contactPerson', header: 'Contact', render: (r) => r.contactPerson || '—' },
          { key: 'email', header: 'Email', render: (r) => r.email || '—' },
          { key: 'industry', header: 'Industry', render: (r) => r.industry || '—' },
          { key: 'activeStatus', header: 'Status', render: (r) => <StatusPill value={r.activeStatus} /> },
        ]}
      />
      <SimpleModal open={direct} onClose={() => setDirect(false)} title="Add direct client">
        <FormStack>
          <FormField><Label>Company name *</Label><Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></FormField>
          <FormRow>
            <FormField><Label>Contact person</Label><Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></FormField>
            <FormField><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
          </FormRow>
          <FormRow>
            <FormField><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
            <FormField><Label>Deal value (₹)</Label><Input type="number" value={form.conversionValue} onChange={(e) => setForm({ ...form, conversionValue: e.target.value })} /></FormField>
          </FormRow>
          <FormField><Label>Services</Label><Input placeholder="Website, SEO" value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} /></FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setDirect(false)}>Cancel</Button>
            <Button disabled={!form.companyName || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Adding…' : 'Add client'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}

export function ClientDetailPage() {
  const { id = '' } = useParams();
  const can = useCan();
  const qc = useQueryClient();
  const [pay, setPay] = useState(false);
  const [payment, setPayment] = useState<Any>({ amount: '', paidAt: toDateInput(new Date()), method: 'bank_transfer', reference: '', notes: '' });
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['client', id], queryFn: () => api.data<Any>(`/clients/${id}/overview`) });
  const record = useMutation({
    mutationFn: () => api.data('/payments/client', 'POST', { ...payment, vendorId: id, amount: Number(payment.amount), paidAt: new Date(payment.paidAt).toISOString() }),
    onSuccess: () => { toast.success('Payment recorded'); setPay(false); qc.invalidateQueries({ queryKey: ['client', id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (isError) return <PageError message="Client not found" onRetry={() => refetch()} />;
  if (isLoading || !data) return <PageLoading rows={6} />;
  const { vendor, conversion } = data;
  return (
    <>
      <Breadcrumbs items={[{ label: 'Clients', href: '/clients' }, { label: vendor.companyName }]} />
      <PageHeader
        title={vendor.companyName}
        description={conversion ? `${conversion.publicCode} · client since ${fmtDate(vendor.onboardedAt || vendor.createdAt)}` : undefined}
        action={
          <>
            {conversion && <Button variant="outline" asChild><Link to={`/conversions/${conversion.publicCode}`}>Conversion hub</Link></Button>}
            {can('payments:write') && <Button onClick={() => setPay(true)}><Wallet className="mr-2 h-4 w-4" />Record payment</Button>}
          </>
        }
      />
      <RollupCards rollup={data.rollup} />
      <PageGrid cols="2">
        <SectionCard title="Details">
          <KeyValue items={[
            ['Contact', vendor.contactPerson], ['Email', vendor.email], ['Phone', vendor.phone], ['Industry', vendor.industry],
            ['Location', vendor.location], ['GST', vendor.gstNumber], ['Website', vendor.website], ['Account owner', vendor.accountOwner],
            ['Status', <StatusPill value={vendor.activeStatus} />],
          ]} />
        </SectionCard>
        {conversion && can('vendors:write') ? <PortalCard conversionUuid={conversion.conversionUuid} portal={data.portal} onChange={() => refetch()} /> : <div />}
      </PageGrid>
      <ClientRecords {...data} />
      <SimpleModal open={pay} onClose={() => setPay(false)} title="Record client payment">
        <FormStack>
          <p className="text-sm text-muted-foreground">Creates a receipt invoice against the client's project and updates the contract value.</p>
          <FormRow>
            <FormField><Label>Amount (₹) *</Label><Input type="number" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></FormField>
            <FormField><Label>Date</Label><Input type="date" value={payment.paidAt} onChange={(e) => setPayment({ ...payment, paidAt: e.target.value })} /></FormField>
          </FormRow>
          <FormRow>
            <FormField><Label>Method</Label>
              <Select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
                {['bank_transfer', 'upi', 'cash', 'card', 'cheque', 'other'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </Select>
            </FormField>
            <FormField><Label>Reference</Label><Input value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /></FormField>
          </FormRow>
          <FormActions>
            <Button variant="outline" onClick={() => setPay(false)}>Cancel</Button>
            <Button disabled={!payment.amount || record.isPending} onClick={() => record.mutate()}>{record.isPending ? 'Saving…' : 'Record payment'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}
