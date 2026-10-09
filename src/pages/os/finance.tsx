import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { BellRing, CheckCircle2, Download, Mail, Pencil, Plus, Printer, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCan } from '@/lib/permissions';
import { Breadcrumbs, PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormRow, FormStack, PageGrid, PageToolbar } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { DataTable, SectionCard, Select, StatCard, StatusPill, Tabs, Textarea, fmtDate, humanize, inr, toDateInput } from '@/components/shared/os-ui';
import { cn } from '@/lib/utils';
import { InvoiceSheet, downloadInvoicePdf, invoiceTotals, type CompanyProfile, type InvoiceData, type LineItem } from '@/components/os/invoice-sheet';

type Any = Record<string, any>;
const onErr = (e: Error) => toast.error(e.message);
const INVOICE_STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'];
const METHODS = ['bank_transfer', 'upi', 'cash', 'card', 'cheque', 'other'];

// ---------------------------------------------------------------- invoices list
export function InvoicesPage() {
  const navigate = useNavigate();
  const can = useCan();
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['invoices', status, search],
    queryFn: () => api.data<Any[]>(`/invoices?status=${status}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  });
  const totals = useMemo(() => ({
    total: data.filter((i) => !['draft', 'cancelled'].includes(i.displayStatus)).reduce((s, i) => s + i.total, 0),
    paid: data.reduce((s, i) => s + (i.amountPaid || 0), 0),
    outstanding: data.filter((i) => i.displayStatus !== 'cancelled').reduce((s, i) => s + (i.outstanding || 0), 0),
  }), [data]);
  return (
    <>
      <PageHeader title="Invoices" description="GST invoices with live preview, payments and client sharing."
        action={can('invoices:write') && <Button className="w-full sm:w-auto" onClick={() => navigate('/invoices/new')}><Plus className="mr-2 h-4 w-4" />New invoice</Button>} />
      <PageGrid cols="3">
        <StatCard label="Invoiced" value={inr(totals.total)} />
        <StatCard label="Received" value={inr(totals.paid)} tone="success" />
        <StatCard label="Outstanding" value={inr(totals.outstanding)} tone={totals.outstanding ? 'danger' : 'default'} />
      </PageGrid>
      <PageToolbar>
        <Input className="sm:max-w-xs" placeholder="Invoice number or client…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select className="sm:w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </Select>
      </PageToolbar>
      {isError ? <PageError onRetry={() => refetch()} /> : isLoading ? <PageLoading /> : (
        <DataTable rows={data as any} onRowClick={(r) => navigate(`/invoices/${r._id}`)} empty="No invoices yet."
          columns={[
            { key: 'invoiceNumber', header: 'Invoice', render: (r) => <span className="font-mono text-xs font-semibold">{r.invoiceNumber}</span> },
            { key: 'billToName', header: 'Client', render: (r) => <div><p className="font-medium">{r.billToName || '—'}</p><p className="text-xs text-muted-foreground">{r.projectId?.name}</p></div> },
            { key: 'issueDate', header: 'Issued', render: (r) => fmtDate(r.issueDate) },
            { key: 'dueDate', header: 'Due', render: (r) => fmtDate(r.dueDate) },
            { key: 'total', header: 'Total', className: 'text-right', render: (r) => inr(r.total) },
            { key: 'outstanding', header: 'Outstanding', className: 'text-right', render: (r) => inr(r.outstanding) },
            { key: 'displayStatus', header: 'Status', render: (r) => <StatusPill value={r.displayStatus} /> },
          ]} />
      )}
    </>
  );
}

// ---------------------------------------------------------------- invoice editor
const EMPTY_LINE: LineItem = { description: '', specifications: '', hsnSac: '998314', quantity: 1, uom: 'Nos', unitPrice: 0, discountPercent: 0 };
const DETAIL_KEYS = ['issueDate', 'dueDate', 'state', 'stateCode', 'placeOfSupply', 'buyerRefNo', 'paymentTerms', 'billToName', 'billToAddress', 'billToEmail', 'billToPhone', 'billToGst', 'billToPan', 'billToState', 'billToStateCode', 'shipToName', 'shipToAddress', 'shipToGst', 'shipToState', 'shipToStateCode', 'remarks', 'documentNote'] as const;

function blankInvoice(): InvoiceData & { projectId: string } {
  const due = new Date(Date.now() + 7 * 86_400_000);
  return {
    projectId: '', lineItems: [{ ...EMPTY_LINE }], taxRate: 0.18, overallDiscount: 0, isInterState: false,
    issueDate: toDateInput(new Date()), dueDate: toDateInput(due), state: 'Karnataka', stateCode: '29', placeOfSupply: 'Karnataka', paymentTerms: '100% Advance',
    billToState: 'Karnataka', billToStateCode: '29',
  };
}

export function ScaledPreview({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / 794)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="w-full overflow-hidden rounded-lg border bg-surface-soft/60 p-0">
      <div style={{ width: 794, height: 1123 * scale, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
    </div>
  );
}

export function InvoiceEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const can = useCan();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<InvoiceData & { projectId: string }>(blankInvoice);
  const [editing, setEditing] = useState(isNew);
  const [reason, setReason] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [payment, setPayment] = useState({ amount: '', paidAt: toDateInput(new Date()), method: 'bank_transfer', reference: '', notes: '' });

  const { data: company } = useQuery({ queryKey: ['invoice-company'], queryFn: () => api.data<CompanyProfile>('/invoices/company') });
  const { data: projects = [] } = useQuery({ queryKey: ['invoice-projects'], enabled: can('invoices:write'), queryFn: () => api.data<Any[]>('/invoices/projects') });
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['invoice', id], enabled: !isNew, queryFn: () => api.data<Any>(`/invoices/${id}`) });

  useEffect(() => {
    if (!data?.invoice) return;
    const inv = data.invoice;
    const next: Any = { projectId: String(inv.projectId?._id || inv.projectId || ''), lineItems: inv.lineItems?.length ? inv.lineItems : [{ ...EMPTY_LINE }], taxRate: inv.taxRate ?? 0.18, overallDiscount: inv.overallDiscount || 0, isInterState: Boolean(inv.isInterState), invoiceNumber: inv.invoiceNumber, status: inv.displayStatus };
    for (const k of DETAIL_KEYS) next[k] = k === 'issueDate' || k === 'dueDate' ? toDateInput(inv[k]) : inv[k] ?? '';
    setForm(next as InvoiceData & { projectId: string });
  }, [data]);

  useEffect(() => {
    const pid = params.get('projectId');
    if (isNew && pid && projects.length) pickProject(pid);
  }, [projects]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickProject = (pid: string) => {
    const p = projects.find((x) => x.id === pid);
    setForm((f) => ({
      ...f, projectId: pid,
      ...(p && { billToName: f.billToName || p.billTo.name, billToAddress: f.billToAddress || p.billTo.address, billToEmail: f.billToEmail || p.billTo.email, billToPhone: f.billToPhone || p.billTo.phone, billToGst: f.billToGst || p.billTo.gst }),
    }));
  };

  const payload = () => {
    const body: Any = { projectId: form.projectId, lineItems: form.lineItems, taxRate: Number(form.taxRate), overallDiscount: Number(form.overallDiscount) || 0, isInterState: form.isInterState };
    for (const k of DETAIL_KEYS) {
      const v = (form as Any)[k];
      if (k === 'dueDate') body.dueDate = v ? new Date(v).toISOString() : null;
      else if (k === 'issueDate') body.issueDate = v ? new Date(v).toISOString() : undefined;
      else body[k] = v ?? '';
    }
    return body;
  };

  const save = useMutation({
    mutationFn: (status?: 'draft' | 'issued') =>
      isNew ? api.data<Any>('/invoices', 'POST', { ...payload(), status }) : api.data<Any>(`/invoices/${id}`, 'PATCH', { ...payload(), ...(reason && { reason }) }),
    onSuccess: (inv) => {
      toast.success(isNew ? `Invoice ${inv.invoiceNumber} created` : 'Invoice saved');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      if (isNew) navigate(`/invoices/${inv._id}`, { replace: true });
      else { setEditing(false); setReason(''); refetch(); }
    },
    onError: onErr,
  });
  const action = useMutation({
    mutationFn: ({ path = '', method = 'PATCH', body }: { path?: string; method?: 'POST' | 'PATCH' | 'DELETE'; body?: unknown }) => api.data<Any>(`/invoices/${id}${path}`, method, body),
    onSuccess: (r) => { toast.success(r?.message || 'Done'); refetch(); qc.invalidateQueries({ queryKey: ['invoices'] }); },
    onError: onErr,
  });
  const recordPayment = useMutation({
    mutationFn: () => api.data('/payments', 'POST', { invoiceId: id, amount: Number(payment.amount), paidAt: new Date(payment.paidAt).toISOString(), method: payment.method, reference: payment.reference, notes: payment.notes }),
    onSuccess: () => { toast.success('Payment recorded'); setPayOpen(false); refetch(); },
    onError: onErr,
  });
  const removePayment = useMutation({
    mutationFn: (pid: string) => api.data(`/payments/${pid}`, 'DELETE'),
    onSuccess: () => { toast.success('Payment reversed'); refetch(); },
    onError: onErr,
  });

  if (!isNew && isError) return <PageError message="Invoice not found" onRetry={() => refetch()} />;
  if ((!isNew && (isLoading || !data)) || !company) return <PageLoading rows={6} />;

  const inv = data?.invoice;
  const totals = invoiceTotals(form);
  const originalTotal = inv?.total ?? 0;
  const totalChanged = !isNew && totals.total !== originalTotal;
  const cancelled = inv?.status === 'cancelled';
  const canWrite = can('invoices:write') && !cancelled;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  const setLine = (i: number, patch: Partial<LineItem>) => setForm({ ...form, lineItems: form.lineItems.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });

  return (
    <>
      <Breadcrumbs items={[{ label: 'Invoices', href: '/invoices' }, { label: isNew ? 'New invoice' : inv.invoiceNumber }]} />
      <PageHeader
        title={isNew ? 'New invoice' : inv.invoiceNumber}
        description={isNew ? 'The invoice number is assigned when you save.' : `${inv.billToName || 'Client'} · ${inr(inv.total)} · ${inr(inv.outstanding)} outstanding`}
        action={
          <>
            <Button variant="outline" onClick={() => sheetRef.current && downloadInvoicePdf(sheetRef.current, `${form.invoiceNumber || 'invoice'}.pdf`).catch(onErr)}><Download className="mr-2 h-4 w-4" />PDF</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
            {!isNew && canWrite && !editing && <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>}
            {!isNew && canWrite && <Button variant="outline" onClick={() => action.mutate({ path: '/share', method: 'POST', body: {} })}><Mail className="mr-2 h-4 w-4" />Email client</Button>}
            {!isNew && can('payments:write') && !cancelled && inv.status !== 'draft' && inv.outstanding > 0 && <Button onClick={() => { setPayment({ ...payment, amount: String(inv.outstanding) }); setPayOpen(true); }}><CheckCircle2 className="mr-2 h-4 w-4" />Record payment</Button>}
          </>
        }
      />
      {!isNew && (
        <PageGrid cols="4">
          <StatCard label="Status" value={<StatusPill value={inv.displayStatus} className="text-sm" />} />
          <StatCard label="Total" value={inr(inv.total)} />
          <StatCard label="Received" value={inr(inv.amountPaid)} tone="success" />
          <StatCard label="Outstanding" value={inr(inv.outstanding)} tone={inv.outstanding ? 'danger' : 'default'} />
        </PageGrid>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] print:block">
        <div className="flex flex-col gap-4 lg:gap-6 print:hidden">
          {editing ? (
            <>
              <SectionCard title="Billing">
                <FormStack>
                  <FormField><Label>Project *</Label>
                    <Select value={form.projectId} onChange={(e) => pickProject(e.target.value)} disabled={!isNew}>
                      <option value="">Select project…</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.code && ` · ${p.code}`}</option>)}
                    </Select>
                  </FormField>
                  <FormRow>
                    <FormField><Label>Issue date</Label><Input type="date" value={form.issueDate || ''} onChange={set('issueDate')} /></FormField>
                    <FormField><Label>Due date</Label><Input type="date" value={form.dueDate || ''} onChange={set('dueDate')} /></FormField>
                  </FormRow>
                  <FormRow>
                    <FormField><Label>GST rate</Label>
                      <Select value={String(form.taxRate)} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}>
                        {[0, 0.05, 0.12, 0.18, 0.28].map((r) => <option key={r} value={r}>{Math.round(r * 100)}%</option>)}
                      </Select>
                    </FormField>
                    <FormField><Label>Supply</Label>
                      <Select value={form.isInterState ? 'inter' : 'intra'} onChange={(e) => setForm({ ...form, isInterState: e.target.value === 'inter' })}>
                        <option value="intra">Intra-state (CGST + SGST)</option><option value="inter">Inter-state (IGST)</option>
                      </Select>
                    </FormField>
                  </FormRow>
                  <FormRow>
                    <FormField><Label>Payment terms</Label><Input value={form.paymentTerms || ''} onChange={set('paymentTerms')} /></FormField>
                    <FormField><Label>Buyer ref / PO</Label><Input value={form.buyerRefNo || ''} onChange={set('buyerRefNo')} /></FormField>
                  </FormRow>
                  <FormRow>
                    <FormField><Label>Place of supply</Label><Input value={form.placeOfSupply || ''} onChange={set('placeOfSupply')} /></FormField>
                    <FormField><Label>State code</Label><Input value={form.stateCode || ''} onChange={set('stateCode')} /></FormField>
                  </FormRow>
                </FormStack>
              </SectionCard>

              <SectionCard title="Bill to">
                <FormStack>
                  <FormRow>
                    <FormField><Label>Name</Label><Input value={form.billToName || ''} onChange={set('billToName')} /></FormField>
                    <FormField><Label>GSTIN</Label><Input value={form.billToGst || ''} onChange={set('billToGst')} /></FormField>
                  </FormRow>
                  <FormField><Label>Address</Label><Textarea value={form.billToAddress || ''} onChange={set('billToAddress')} /></FormField>
                  <FormRow>
                    <FormField><Label>Email</Label><Input value={form.billToEmail || ''} onChange={set('billToEmail')} /></FormField>
                    <FormField><Label>Phone</Label><Input value={form.billToPhone || ''} onChange={set('billToPhone')} /></FormField>
                  </FormRow>
                  <FormRow>
                    <FormField><Label>PAN</Label><Input value={form.billToPan || ''} onChange={set('billToPan')} /></FormField>
                    <FormField><Label>State</Label><Input value={form.billToState || ''} onChange={set('billToState')} /></FormField>
                  </FormRow>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">Different ship-to address</summary>
                    <FormStack className="mt-3">
                      <FormRow>
                        <FormField><Label>Ship to name</Label><Input value={form.shipToName || ''} onChange={set('shipToName')} /></FormField>
                        <FormField><Label>Ship to GSTIN</Label><Input value={form.shipToGst || ''} onChange={set('shipToGst')} /></FormField>
                      </FormRow>
                      <FormField><Label>Ship to address</Label><Textarea value={form.shipToAddress || ''} onChange={set('shipToAddress')} /></FormField>
                    </FormStack>
                  </details>
                </FormStack>
              </SectionCard>

              <SectionCard title="Line items" action={<Button size="sm" variant="outline" onClick={() => setForm({ ...form, lineItems: [...form.lineItems, { ...EMPTY_LINE }] })}><Plus className="mr-1 h-3.5 w-3.5" />Add line</Button>}>
                <div className="flex flex-col gap-4">
                  {form.lineItems.map((l, i) => (
                    <div key={i} className="rounded-md border p-3">
                      <div className="flex gap-2">
                        <Input placeholder="Description" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                        <Button size="icon" variant="ghost" className="shrink-0 text-error" disabled={form.lineItems.length === 1} onClick={() => setForm({ ...form, lineItems: form.lineItems.filter((_, idx) => idx !== i) })}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                      <Input className="mt-2" placeholder="Specifications (optional)" value={l.specifications || ''} onChange={(e) => setLine(i, { specifications: e.target.value })} />
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                        <div><Label className="text-xs">HSN/SAC</Label><Input value={l.hsnSac || ''} onChange={(e) => setLine(i, { hsnSac: e.target.value })} /></div>
                        <div><Label className="text-xs">Qty</Label><Input type="number" min="1" value={l.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) })} /></div>
                        <div><Label className="text-xs">UOM</Label><Input value={l.uom || ''} onChange={(e) => setLine(i, { uom: e.target.value })} /></div>
                        <div><Label className="text-xs">Rate (₹)</Label><Input type="number" min="0" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) })} /></div>
                        <div><Label className="text-xs">Disc %</Label><Input type="number" min="0" max="100" value={l.discountPercent || 0} onChange={(e) => setLine(i, { discountPercent: Number(e.target.value) })} /></div>
                      </div>
                    </div>
                  ))}
                  <FormRow>
                    <FormField><Label>Overall discount (₹)</Label><Input type="number" min="0" value={form.overallDiscount || 0} onChange={(e) => setForm({ ...form, overallDiscount: Number(e.target.value) })} /></FormField>
                    <div className="flex flex-col justify-end text-right">
                      <p className="text-xs text-muted-foreground">Taxable {inr(totals.taxable)} · GST {inr(totals.taxAmount)}</p>
                      <p className="font-display text-xl font-semibold">{inr(totals.total)}</p>
                    </div>
                  </FormRow>
                  <FormField><Label>Remarks / scope (printed)</Label><Textarea value={form.remarks || ''} onChange={set('remarks')} /></FormField>
                  <FormField><Label>Internal note (not printed)</Label><Input value={form.documentNote || ''} onChange={set('documentNote')} /></FormField>
                </div>
              </SectionCard>

              {totalChanged && (
                <SectionCard>
                  <FormField><Label>Reason for changing the amount *</Label><Input placeholder={`Total ${inr(originalTotal)} → ${inr(totals.total)}`} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
                </SectionCard>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                {!isNew && <Button variant="outline" onClick={() => { setEditing(false); refetch(); }}>Cancel</Button>}
                {isNew && <Button variant="outline" disabled={save.isPending || !form.projectId} onClick={() => save.mutate('draft')}>Save as draft</Button>}
                <Button disabled={save.isPending || !form.projectId || (totalChanged && !reason.trim())} onClick={() => save.mutate(isNew ? 'issued' : undefined)}>{save.isPending ? 'Saving…' : isNew ? 'Issue invoice' : 'Save changes'}</Button>
              </div>
            </>
          ) : (
            <>
              <SectionCard title="Payments" bodyClassName="p-0">
                <DataTable rows={data?.payments || []} empty="No payments recorded."
                  columns={[
                    { key: 'paidAt', header: 'Date', render: (r) => fmtDate(r.paidAt) },
                    { key: 'method', header: 'Method', render: (r) => humanize(r.method) },
                    { key: 'reference', header: 'Reference', render: (r) => r.reference || '—' },
                    { key: 'amount', header: 'Amount', className: 'text-right', render: (r) => inr(r.amount) },
                    { key: 'x', header: '', className: 'w-px', render: (r) => can('payments:write') && <Button size="icon" variant="ghost" className="h-8 w-8 text-error" title="Reverse payment" onClick={() => window.confirm('Reverse this payment?') && removePayment.mutate(r._id)}><Trash2 className="h-3.5 w-3.5" /></Button> },
                  ]} />
              </SectionCard>
              <SectionCard title="Invoice actions">
                <div className="flex flex-wrap gap-2">
                  {canWrite && inv.status === 'draft' && <Button size="sm" onClick={() => action.mutate({ body: { ...payload(), status: 'issued' } })}>Issue invoice</Button>}
                  {canWrite && <Button size="sm" variant="outline" className="text-error" onClick={() => window.confirm('Cancel this invoice? It cannot be edited afterwards.') && action.mutate({ body: { ...payload(), status: 'cancelled' } })}><XCircle className="mr-1.5 h-3.5 w-3.5" />Cancel invoice</Button>}
                  {inv.projectId?._id && <Button size="sm" variant="ghost" asChild><Link to={`/projects/${inv.projectId._id}`}>Open project</Link></Button>}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Amount in words: {data?.amountInWords}</p>
              </SectionCard>
            </>
          )}
        </div>
        <div className="xl:sticky xl:top-20 xl:self-start">
          <ScaledPreview>
            <InvoiceSheet ref={sheetRef} data={form} company={company} />
          </ScaledPreview>
        </div>
      </div>

      <SimpleModal open={payOpen} onClose={() => setPayOpen(false)} title="Record payment">
        <FormStack>
          <FormRow>
            <FormField><Label>Amount (₹) *</Label><Input type="number" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></FormField>
            <FormField><Label>Date</Label><Input type="date" value={payment.paidAt} onChange={(e) => setPayment({ ...payment, paidAt: e.target.value })} /></FormField>
          </FormRow>
          <FormRow>
            <FormField><Label>Method</Label><Select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>{METHODS.map((m) => <option key={m} value={m}>{humanize(m)}</option>)}</Select></FormField>
            <FormField><Label>Reference</Label><Input value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /></FormField>
          </FormRow>
          <FormField><Label>Notes</Label><Input value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} /></FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button disabled={!payment.amount || recordPayment.isPending} onClick={() => recordPayment.mutate()}>{recordPayment.isPending ? 'Saving…' : 'Record payment'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}

// ---------------------------------------------------------------- payments
export function PaymentsPage() {
  const navigate = useNavigate();
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ['payments'], queryFn: () => api.data<Any[]>('/payments') });
  const total = data.reduce((s, p) => s + (p.amount || 0), 0);
  return (
    <>
      <PageHeader title="Payments" description="Every payment received against an invoice. Record new payments from the invoice or client page." />
      <PageGrid cols="3">
        <StatCard label="Received (all time)" value={inr(total)} tone="success" />
        <StatCard label="Payments" value={data.length} />
        <StatCard label="This month" value={inr(data.filter((p) => new Date(p.paidAt) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).reduce((s, p) => s + p.amount, 0))} />
      </PageGrid>
      {isError ? <PageError onRetry={() => refetch()} /> : isLoading ? <PageLoading /> : (
        <DataTable rows={data as any} onRowClick={(r) => r.invoiceId?._id && navigate(`/invoices/${r.invoiceId._id}`)} empty="No payments yet."
          columns={[
            { key: 'paidAt', header: 'Date', render: (r) => fmtDate(r.paidAt) },
            { key: 'client', header: 'Client', render: (r) => r.vendorId?.companyName || r.invoiceId?.billToName || '—' },
            { key: 'invoice', header: 'Invoice', render: (r) => <span className="font-mono text-xs">{r.invoiceId?.invoiceNumber || '—'}</span> },
            { key: 'method', header: 'Method', render: (r) => humanize(r.method) },
            { key: 'reference', header: 'Reference', render: (r) => r.reference || '—' },
            { key: 'amount', header: 'Amount', className: 'text-right', render: (r) => <span className="font-medium">{inr(r.amount)}</span> },
          ]} />
      )}
    </>
  );
}

// ---------------------------------------------------------------- recurring payments
export function RecurringPaymentsPage() {
  const qc = useQueryClient();
  const can = useCan();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Any | null>(null);
  const [form, setForm] = useState<Any>({});
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ['recurring'], queryFn: () => api.data<Any[]>('/recurring-payments') });
  const refresh = () => qc.invalidateQueries({ queryKey: ['recurring'] });
  const save = useMutation({
    mutationFn: () => {
      const body = { title: form.title, payee: form.payee, amount: Number(form.amount), frequency: form.frequency, nextDueAt: new Date(form.nextDueAt).toISOString(), notes: form.notes, status: form.status };
      return editing ? api.data(`/recurring-payments/${editing._id}`, 'PATCH', body) : api.data('/recurring-payments', 'POST', body);
    },
    onSuccess: () => { toast.success('Saved'); setOpen(false); refresh(); },
    onError: onErr,
  });
  const act = useMutation({
    mutationFn: ({ path, method = 'POST' }: { path: string; method?: 'POST' | 'DELETE' }) => api.data<Any>(`/recurring-payments${path}`, method, method === 'POST' ? {} : undefined),
    onSuccess: (r) => { toast.success(r?.message || 'Done'); refresh(); },
    onError: onErr,
  });
  const openForm = (row: Any | null) => {
    setEditing(row);
    setForm(row ? { ...row, nextDueAt: toDateInput(row.nextDueAt) } : { title: '', payee: '', amount: '', frequency: 'monthly', nextDueAt: toDateInput(new Date()), notes: '', status: 'active' });
    setOpen(true);
  };
  const monthly = data.filter((r) => r.status === 'active').reduce((s, r) => s + r.amount * ({ weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 } as Any)[r.frequency], 0);
  return (
    <>
      <PageHeader title="Recurring payments" description="Subscriptions and retainers you pay. Finance is reminded before each due date."
        action={can('payments:write') && (
          <>
            <Button variant="outline" onClick={() => act.mutate({ path: '/reminders' })}><BellRing className="mr-2 h-4 w-4" />Send reminders</Button>
            <Button onClick={() => openForm(null)}><Plus className="mr-2 h-4 w-4" />Add</Button>
          </>
        )} />
      <PageGrid cols="3">
        <StatCard label="Monthly commitment" value={inr(Math.round(monthly))} />
        <StatCard label="Overdue" value={data.filter((r) => r.dueState === 'overdue').length} tone={data.some((r) => r.dueState === 'overdue') ? 'danger' : 'default'} />
        <StatCard label="Due in 7 days" value={data.filter((r) => r.dueState === 'due_soon').length} />
      </PageGrid>
      {isError ? <PageError onRetry={() => refetch()} /> : isLoading ? <PageLoading /> : (
        <DataTable rows={data as any} empty="No recurring payments yet."
          columns={[
            { key: 'title', header: 'Payment', render: (r) => <div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.payee}</p></div> },
            { key: 'amount', header: 'Amount', render: (r) => inr(r.amount) },
            { key: 'frequency', header: 'Frequency', render: (r) => humanize(r.frequency) },
            { key: 'nextDueAt', header: 'Next due', render: (r) => fmtDate(r.nextDueAt) },
            { key: 'dueState', header: 'State', render: (r) => <StatusPill value={r.dueState} /> },
            { key: 'last', header: 'Last paid', render: (r) => fmtDate(r.lastPaidAt) },
            {
              key: 'x', header: '', className: 'w-px', render: (r) => can('payments:write') && (
                <div className="flex justify-end gap-1">
                  {r.status === 'active' && <Button size="sm" variant="outline" onClick={() => act.mutate({ path: `/${r._id}/mark-paid` })}>Mark paid</Button>}
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openForm(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-error" onClick={() => window.confirm('Remove this recurring payment?') && act.mutate({ path: `/${r._id}`, method: 'DELETE' })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ),
            },
          ]} />
      )}
      <SimpleModal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit recurring payment' : 'New recurring payment'}>
        <FormStack>
          <FormRow>
            <FormField><Label>Title *</Label><Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormField>
            <FormField><Label>Payee</Label><Input value={form.payee || ''} onChange={(e) => setForm({ ...form, payee: e.target.value })} /></FormField>
          </FormRow>
          <FormRow>
            <FormField><Label>Amount (₹) *</Label><Input type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></FormField>
            <FormField><Label>Frequency</Label><Select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>{['weekly', 'monthly', 'quarterly', 'yearly'].map((f) => <option key={f} value={f}>{humanize(f)}</option>)}</Select></FormField>
          </FormRow>
          <FormRow>
            <FormField><Label>Next due *</Label><Input type="date" value={form.nextDueAt || ''} onChange={(e) => setForm({ ...form, nextDueAt: e.target.value })} /></FormField>
            <FormField><Label>Status</Label><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{['active', 'paused', 'ended'].map((f) => <option key={f} value={f}>{humanize(f)}</option>)}</Select></FormField>
          </FormRow>
          <FormField><Label>Notes</Label><Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.title || !form.amount || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}

// ---------------------------------------------------------------- transactions
export function TransactionsPage() {
  const qc = useQueryClient();
  const can = useCan();
  const [filters, setFilters] = useState({ type: '', source: 'all', month: '' });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Any>({});
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['transactions', query], queryFn: () => api.data<{ rows: Any[]; totals: Any }>(`/transactions?${query}`) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['revenue'] });
    qc.invalidateQueries({ queryKey: ['os-dashboard'] });
  };
  const save = useMutation({
    mutationFn: () => api.data('/transactions', 'POST', { ...form, amount: Number(form.amount), date: new Date(form.date).toISOString() }),
    onSuccess: () => { toast.success('Transaction recorded'); setOpen(false); refresh(); },
    onError: onErr,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.data(`/transactions/${id}`, 'DELETE'),
    onSuccess: () => { toast.success('Transaction deleted'); refresh(); },
    onError: onErr,
  });
  return (
    <>
      <PageHeader title="Transactions" description="Income and spending in one ledger. Deleted entries stay on record, struck through, and are left out of the remaining amount."
        action={can('payments:write') && <Button className="w-full sm:w-auto" onClick={() => { setForm({ type: 'expense', title: '', category: '', amount: '', date: toDateInput(new Date()), party: '', paymentMethod: 'upi', reference: '', notes: '' }); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add transaction</Button>} />
      <PageGrid cols="3">
        <StatCard label="Income" value={inr(data?.totals.income)} tone="success" />
        <StatCard label="Spent" value={inr(data?.totals.spent)} tone="danger" />
        <StatCard label="Remaining" value={inr(data?.totals.remaining ?? data?.totals.net)} hint="Calculated from entries that are still active" />
      </PageGrid>
      <PageToolbar>
        <Select className="sm:w-40" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option></Select>
        <Select className="sm:w-48" value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}>
          <option value="all">All sources</option><option value="transactions">Manual transactions</option><option value="manual">Manual revenue</option><option value="invoices">Invoice payments</option>
        </Select>
        <Input className="sm:w-44" type="month" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })} />
      </PageToolbar>
      {isError ? <PageError onRetry={() => refetch()} /> : isLoading ? <PageLoading /> : (
        <DataTable rows={(data?.rows || []) as any} empty="No transactions in this range." rowClassName={(r) => (r.deleted ? 'bg-error/[0.04]' : undefined)}
          columns={[
            { key: 'date', header: 'Date', render: (r) => <span className={cn(r.deleted && 'text-muted-foreground line-through')}>{fmtDate(r.date)}</span> },
            { key: 'title', header: 'Title', render: (r) => (
              <div>
                <p className={cn('font-medium', r.deleted && 'text-muted-foreground line-through')}>{r.title}</p>
                <p className={cn('text-xs text-muted-foreground', r.deleted && 'line-through')}>{r.category || r.party}</p>
                {r.deleted && <p className="mt-1 text-xs font-medium text-error">Deleted{r.deletedBy ? ` by ${r.deletedBy}` : ''}</p>}
              </div>
            ) },
            { key: 'source', header: 'Source', render: (r) => <StatusPill value={r.source} tone="gray" className={r.deleted ? 'line-through opacity-70' : ''} /> },
            { key: 'method', header: 'Method', render: (r) => <span className={cn(r.deleted && 'text-muted-foreground line-through')}>{humanize(r.method) || '—'}</span> },
            { key: 'type', header: 'Type', render: (r) => (
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill value={r.type} className={r.deleted ? 'line-through opacity-60' : ''} />
                {r.deleted && <StatusPill value="deleted" />}
              </div>
            ) },
            { key: 'amount', header: 'Amount', className: 'text-right', render: (r) => <span className={cn(r.deleted ? 'text-muted-foreground line-through' : r.type === 'expense' ? 'text-error' : 'text-success')}>{r.type === 'expense' ? '−' : '+'}{inr(r.amount)}</span> },
            { key: 'remaining', header: 'Remaining', className: 'text-right', render: (r) => (r.deleted || r.remaining == null ? <span className="text-muted-foreground">—</span> : <span className="font-medium tabular-nums">{inr(r.remaining)}</span>) },
            { key: 'x', header: '', className: 'w-px', render: (r) => r.source === 'transactions' && !r.deleted && can('payments:write') ? (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-error" disabled={remove.isPending} onClick={() => window.confirm('Delete this transaction? It stays in the ledger as deleted and is left out of the remaining amount.') && remove.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            ) : null },
          ]} />
      )}
      <SimpleModal open={open} onClose={() => setOpen(false)} title="Add transaction">
        <FormStack>
          <FormRow>
            <FormField><Label>Type</Label><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="expense">Expense</option><option value="income">Income</option></Select></FormField>
            <FormField><Label>Date *</Label><Input type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} /></FormField>
          </FormRow>
          <FormField><Label>Title *</Label><Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormField>
          <FormRow>
            <FormField><Label>Amount (₹) *</Label><Input type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></FormField>
            <FormField><Label>Category</Label><Input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} /></FormField>
          </FormRow>
          <FormRow>
            <FormField><Label>Party</Label><Input value={form.party || ''} onChange={(e) => setForm({ ...form, party: e.target.value })} /></FormField>
            <FormField><Label>Method</Label><Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>{['upi', 'bank_transfer', 'cash', 'card', 'cheque', 'other'].map((m) => <option key={m} value={m}>{humanize(m)}</option>)}</Select></FormField>
          </FormRow>
          <FormField><Label>Reference</Label><Input value={form.reference || ''} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></FormField>
          <FormField><Label>Notes</Label><Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.title || !form.amount || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}

// ---------------------------------------------------------------- revenue
export function RevenuePage() {
  const qc = useQueryClient();
  const can = useCan();
  const navigate = useNavigate();
  const [source, setSource] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Any | null>(null);
  const [form, setForm] = useState<Any>({});
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['revenue'], queryFn: () => api.data<{ rows: Any[]; totals: Any; projects: { id: string; label: string }[] }>('/revenue') });
  const refresh = () => qc.invalidateQueries({ queryKey: ['revenue'] });
  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, amount: Number(form.amount), receivedAt: new Date(form.receivedAt).toISOString(), projectId: form.projectId || undefined };
      return editing ? api.data<Any>(`/revenue/manual/${editing.id}`, 'PATCH', body) : api.data<Any>('/revenue/manual', 'POST', body);
    },
    onSuccess: (r) => { toast.success(r?.message || 'Saved'); setOpen(false); refresh(); },
    onError: onErr,
  });
  const remove = useMutation({ mutationFn: (rid: string) => api.data(`/revenue/manual/${rid}`, 'DELETE'), onSuccess: () => { toast.success('Deleted'); refresh(); }, onError: onErr });
  const openForm = (row: Any | null) => {
    setEditing(row);
    const raw = row?.raw || {};
    setForm(row ? { source: raw.source, description: raw.description || '', amount: raw.amount, receivedAt: toDateInput(raw.receivedAt), projectId: raw.projectId || '', paymentMethod: raw.paymentMethod || '', reference: raw.reference || '', notes: raw.notes || '' }
      : { source: '', description: '', amount: '', receivedAt: toDateInput(new Date()), projectId: '', paymentMethod: '', reference: '', notes: '' });
    setOpen(true);
  };
  const t = data?.totals || {};
  const rows = (data?.rows || []).filter((r) => source === 'all' || r.source === source);
  return (
    <>
      <PageHeader title="Revenue" description="Money in from invoices, Sales CRM won deals, manual entries and other income, less spending."
        action={can('payments:write') && <Button className="w-full sm:w-auto" onClick={() => openForm(null)}><Plus className="mr-2 h-4 w-4" />Add manual revenue</Button>} />
      <PageGrid cols="4">
        <StatCard label="Total revenue" value={inr(t.grandTotal)} tone="success" />
        <StatCard label="Invoices" value={inr(t.osTotal)} hint={`Sales CRM ${inr(t.salesTotal)}`} />
        <StatCard label="Manual + income" value={inr((t.manualTotal || 0) + (t.incomeTotal || 0))} />
        <StatCard label="Net profit" value={inr(t.netProfit)} hint={`Spent ${inr(t.spentTotal)}`} tone={t.netProfit < 0 ? 'danger' : 'default'} />
      </PageGrid>
      <Tabs value={source} onChange={setSource} tabs={['all', 'Editco OS', 'Sales CRM', 'Manual', 'Income', 'Spent'].map((s) => ({ id: s, label: s === 'all' ? 'All' : s === 'Editco OS' ? 'Invoices' : s }))} />
      {isError ? <PageError onRetry={() => refetch()} /> : isLoading ? <PageLoading /> : (
        <DataTable rows={rows as any} onRowClick={(r) => r.href && navigate(r.href)} empty="No revenue recorded."
          columns={[
            { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
            { key: 'label', header: 'Entry', render: (r) => <div><p className="font-medium">{r.label}</p><p className="text-xs text-muted-foreground">{r.detail}</p></div> },
            { key: 'source', header: 'Source', render: (r) => <StatusPill value={r.source} tone={r.source === 'Spent' ? 'red' : 'gray'} /> },
            { key: 'addedBy', header: 'Added by', render: (r) => r.addedBy },
            { key: 'amount', header: 'Amount', className: 'text-right', render: (r) => <span className={r.source === 'Spent' ? 'text-error' : ''}>{inr(r.amount)}</span> },
            {
              key: 'x', header: '', className: 'w-px', render: (r) => r.manual && can('payments:write') && (
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openForm(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-error" onClick={() => window.confirm('Delete this revenue entry?') && remove.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ),
            },
          ]} />
      )}
      <SimpleModal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit revenue entry' : 'Add manual revenue'}>
        <FormStack>
          <FormRow>
            <FormField><Label>Source *</Label><Input placeholder="e.g. Consulting" value={form.source || ''} onChange={(e) => setForm({ ...form, source: e.target.value })} /></FormField>
            <FormField><Label>Amount (₹) *</Label><Input type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></FormField>
          </FormRow>
          <FormRow>
            <FormField><Label>Received on *</Label><Input type="date" value={form.receivedAt || ''} onChange={(e) => setForm({ ...form, receivedAt: e.target.value })} /></FormField>
            <FormField><Label>Project</Label><Select value={form.projectId || ''} onChange={(e) => setForm({ ...form, projectId: e.target.value })}><option value="">None</option>{data?.projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select></FormField>
          </FormRow>
          <FormRow>
            <FormField><Label>Payment method</Label><Input value={form.paymentMethod || ''} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} /></FormField>
            <FormField><Label>Reference</Label><Input value={form.reference || ''} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></FormField>
          </FormRow>
          <FormField><Label>Description</Label><Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
          <FormField><Label>Notes</Label><Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.source || !form.amount || !form.receivedAt || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}

// ---------------------------------------------------------------- outstanding
export function OutstandingPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['outstanding'], queryFn: () => api.data<{ rows: Any[]; total: number; overdue: number; aging: { label: string; amount: number }[] }>('/revenue/outstanding') });
  if (isError) return <PageError onRetry={() => refetch()} />;
  if (isLoading || !data) return <PageLoading />;
  return (
    <>
      <PageHeader title="Outstanding" description="Unpaid balances on issued invoices, with aging from the due date." />
      <PageGrid cols="4">
        <StatCard label="Total outstanding" value={inr(data.total)} />
        <StatCard label="Overdue" value={inr(data.overdue)} tone={data.overdue ? 'danger' : 'default'} />
        {data.aging.slice(0, 2).map((a) => <StatCard key={a.label} label={a.label} value={inr(a.amount)} />)}
      </PageGrid>
      <DataTable rows={data.rows as any} onRowClick={(r) => navigate(`/invoices/${r._id}`)} empty="Nothing outstanding."
        columns={[
          { key: 'invoiceNumber', header: 'Invoice', render: (r) => <span className="font-mono text-xs font-semibold">{r.invoiceNumber}</span> },
          { key: 'billToName', header: 'Client', render: (r) => <div><p className="font-medium">{r.billToName || '—'}</p><p className="text-xs text-muted-foreground">{r.projectId?.name}</p></div> },
          { key: 'dueDate', header: 'Due', render: (r) => fmtDate(r.dueDate) },
          { key: 'ageDays', header: 'Age', render: (r) => (r.ageDays === null ? '—' : r.ageDays < 0 ? `in ${-r.ageDays}d` : `${r.ageDays}d`) },
          { key: 'total', header: 'Total', className: 'text-right', render: (r) => inr(r.total) },
          { key: 'outstanding', header: 'Outstanding', className: 'text-right', render: (r) => <span className="font-medium">{inr(r.outstanding)}</span> },
          { key: 'displayStatus', header: 'Status', render: (r) => <StatusPill value={r.displayStatus} /> },
        ]} />
    </>
  );
}
