'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormRow, FormStack, PageGrid } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageError, PageLoading, EmptyState } from '@/components/shared/page-states';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Invoice, Expense } from '@/types';

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const EXPENSE_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-red-100 text-red-700',
  pending: 'bg-orange-100 text-orange-700',
};

const EXPENSE_CATEGORIES = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'software', label: 'Software & Tools' },
  { value: 'office', label: 'Office' },
  { value: 'travel', label: 'Travel' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Credit Card', 'Cheque'];

function getTodayLocal() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function FinancePage() {
  const [tab, setTab] = useState<'invoices' | 'spendings'>('invoices');
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showNewSpending, setShowNewSpending] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ description: '', quantity: 1, rate: 0 });
  const [spendingForm, setSpendingForm] = useState({
    title: '',
    amount: 0,
    category: 'other',
    vendor: '',
    paymentMethod: 'UPI',
    status: 'paid' as 'paid' | 'pending',
    spentAt: getTodayLocal(),
    notes: '',
  });
  const queryClient = useQueryClient();

  const { data: invoiceData, isLoading: invoicesLoading, isError: invoicesError, refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get<Invoice[]>('/invoices?limit=50'),
  });

  const { data: expenseData, isLoading: expensesLoading, isError: expensesError, refetch: refetchExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api.get<Expense[]>('/expenses?limit=50'),
  });

  const createInvoice = useMutation({
    mutationFn: () => api.post('/invoices', {
      items: [{ description: invoiceForm.description, quantity: invoiceForm.quantity, rate: invoiceForm.rate }],
      status: 'draft',
    }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Invoice created');
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        setShowNewInvoice(false);
        setInvoiceForm({ description: '', quantity: 1, rate: 0 });
      }
    },
  });

  const createSpending = useMutation({
    mutationFn: () => api.post('/expenses', {
      ...spendingForm,
      spentAt: new Date(spendingForm.spentAt).toISOString(),
    }),
    onSuccess: () => {
      toast.success('Spending added');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setShowNewSpending(false);
      setSpendingForm({
        title: '',
        amount: 0,
        category: 'other',
        vendor: '',
        paymentMethod: 'UPI',
        status: 'paid',
        spentAt: getTodayLocal(),
        notes: '',
      });
    },
  });

  const updateInvoice = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/invoices/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice updated');
    },
  });

  const updateSpending = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/expenses/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Spending updated');
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted');
    },
  });

  const deleteSpending = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Spending deleted');
    },
  });

  const invoices = invoiceData?.data || [];
  const expenses = expenseData?.data || [];

  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalPending = invoices.filter((i) => ['sent', 'draft'].includes(i.status)).reduce((s, i) => s + i.total, 0);
  const totalSpendings = expenses.filter((e) => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
  const pendingSpendings = expenses.filter((e) => e.status === 'pending').reduce((s, e) => s + e.amount, 0);
  const netProfit = totalPaid - totalSpendings;

  const isLoading = tab === 'invoices' ? invoicesLoading : expensesLoading;
  const isError = tab === 'invoices' ? invoicesError : expensesError;
  const refetch = tab === 'invoices' ? refetchInvoices : refetchExpenses;

  return (
    <>
      <PageHeader
        title="Finance"
        description="Invoices, spendings, and revenue tracking"
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {tab === 'invoices' ? (
              <Button className="w-full sm:w-auto" onClick={() => setShowNewInvoice(true)}>
                <Plus className="h-4 w-4 mr-2" /> New Invoice
              </Button>
            ) : (
              <Button className="w-full sm:w-auto" onClick={() => setShowNewSpending(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Spending
              </Button>
            )}
          </div>
        }
      />

      <PageGrid cols="4">
        <Card><CardContent className="pt-5 lg:pt-6"><p className="text-xs text-muted-foreground">Paid Revenue</p><p className="mt-1 text-2xl font-semibold text-green-700">{formatCurrency(totalPaid)}</p></CardContent></Card>
        <Card><CardContent className="pt-5 lg:pt-6"><p className="text-xs text-muted-foreground">Total Spendings</p><p className="mt-1 text-2xl font-semibold text-red-600">{formatCurrency(totalSpendings)}</p></CardContent></Card>
        <Card><CardContent className="pt-5 lg:pt-6"><p className="text-xs text-muted-foreground">Net Profit</p><p className={cn('mt-1 text-2xl font-semibold', netProfit >= 0 ? 'text-green-700' : 'text-red-600')}>{formatCurrency(netProfit)}</p></CardContent></Card>
        <Card><CardContent className="pt-5 lg:pt-6"><p className="text-xs text-muted-foreground">Pending</p><p className="mt-1 text-sm font-semibold">Invoices: {formatCurrency(totalPending)}</p><p className="text-sm font-semibold text-orange-600">Spendings: {formatCurrency(pendingSpendings)}</p></CardContent></Card>
      </PageGrid>

      <div className="flex gap-2 mb-4">
        <Button
          variant={tab === 'invoices' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('invoices')}
        >
          Invoices ({invoices.length})
        </Button>
        <Button
          variant={tab === 'spendings' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('spendings')}
        >
          Spendings ({expenses.length})
        </Button>
      </div>

      {isLoading ? (
        <PageLoading rows={4} />
      ) : isError ? (
        <PageError onRetry={() => refetch()} />
      ) : tab === 'invoices' ? (
        invoices.length === 0 ? (
          <EmptyState message="No invoices yet." />
        ) : (
          <div className="flex flex-col gap-3">
            {invoices.map((inv) => (
              <Card key={inv._id}>
                <CardContent className="flex flex-col gap-3 p-4 lg:p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{inv.invoiceNumber}</p>
                      <Badge className={INVOICE_STATUS_COLORS[inv.status] || ''}>{inv.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{inv.items.map((i) => i.description).join(', ')}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(inv.paidAt || inv.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-green-700">{formatCurrency(inv.total)}</p>
                    {inv.status === 'draft' && <Button size="sm" variant="outline" onClick={() => updateInvoice.mutate({ id: inv._id, status: 'sent' })}>Send</Button>}
                    {inv.status === 'sent' && <Button size="sm" onClick={() => updateInvoice.mutate({ id: inv._id, status: 'paid' })}>Mark Paid</Button>}
                    <Button size="sm" variant="ghost" className="text-error" onClick={() => deleteInvoice.mutate(inv._id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : expenses.length === 0 ? (
        <EmptyState message="No spendings recorded yet. Add your first expense." />
      ) : (
        <div className="flex flex-col gap-3">
          {expenses.map((exp) => (
            <Card key={exp._id}>
              <CardContent className="flex flex-col gap-3 p-4 lg:p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{exp.title}</p>
                    <Badge className={EXPENSE_STATUS_COLORS[exp.status] || ''}>{exp.status}</Badge>
                    <Badge variant="outline" className="capitalize">{exp.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {exp.referenceNumber}
                    {exp.vendor && ` · ${exp.vendor}`}
                    {exp.paymentMethod && ` · ${exp.paymentMethod}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(exp.spentAt)}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-red-600">-{formatCurrency(exp.amount)}</p>
                  {exp.status === 'pending' && (
                    <Button size="sm" onClick={() => updateSpending.mutate({ id: exp._id, status: 'paid' })}>Mark Paid</Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-error" onClick={() => deleteSpending.mutate(exp._id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SimpleModal open={showNewInvoice} onClose={() => setShowNewInvoice(false)} title="New Invoice">
        <FormStack>
          <FormField><Label>Description *</Label><Input value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} /></FormField>
          <FormRow>
            <FormField><Label>Quantity</Label><Input type="number" min={1} value={invoiceForm.quantity} onChange={(e) => setInvoiceForm({ ...invoiceForm, quantity: Number(e.target.value) })} /></FormField>
            <FormField><Label>Rate (₹)</Label><Input type="number" min={0} value={invoiceForm.rate} onChange={(e) => setInvoiceForm({ ...invoiceForm, rate: Number(e.target.value) })} /></FormField>
          </FormRow>
          <p className="text-sm text-muted-foreground">Total: {formatCurrency(invoiceForm.quantity * invoiceForm.rate * 1.18)} (incl. 18% GST)</p>
          <FormActions>
            <Button variant="outline" onClick={() => setShowNewInvoice(false)}>Cancel</Button>
            <Button disabled={!invoiceForm.description || createInvoice.isPending} onClick={() => createInvoice.mutate()}>Create</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>

      <SimpleModal open={showNewSpending} onClose={() => setShowNewSpending(false)} title="Add Spending">
        <FormStack>
          <FormField>
            <Label>Title / Description *</Label>
            <Input
              value={spendingForm.title}
              onChange={(e) => setSpendingForm({ ...spendingForm, title: e.target.value })}
              placeholder="e.g. Google Ads, Office rent, Freelancer payment"
            />
          </FormField>
          <FormRow>
            <FormField>
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                min={0}
                value={spendingForm.amount || ''}
                onChange={(e) => setSpendingForm({ ...spendingForm, amount: Number(e.target.value) })}
              />
            </FormField>
            <FormField>
              <Label>Date</Label>
              <Input
                type="date"
                value={spendingForm.spentAt}
                onChange={(e) => setSpendingForm({ ...spendingForm, spentAt: e.target.value })}
              />
            </FormField>
          </FormRow>
          <FormRow>
            <FormField>
              <Label>Category</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={spendingForm.category}
                onChange={(e) => setSpendingForm({ ...spendingForm, category: e.target.value })}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </FormField>
            <FormField>
              <Label>Status</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={spendingForm.status}
                onChange={(e) => setSpendingForm({ ...spendingForm, status: e.target.value as 'paid' | 'pending' })}
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </FormField>
          </FormRow>
          <FormRow>
            <FormField>
              <Label>Vendor / Payee</Label>
              <Input
                value={spendingForm.vendor}
                onChange={(e) => setSpendingForm({ ...spendingForm, vendor: e.target.value })}
                placeholder="Who was paid"
              />
            </FormField>
            <FormField>
              <Label>Payment Method</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={spendingForm.paymentMethod}
                onChange={(e) => setSpendingForm({ ...spendingForm, paymentMethod: e.target.value })}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </FormField>
          </FormRow>
          <FormField>
            <Label>Notes</Label>
            <Input
              value={spendingForm.notes}
              onChange={(e) => setSpendingForm({ ...spendingForm, notes: e.target.value })}
              placeholder="Optional notes"
            />
          </FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setShowNewSpending(false)}>Cancel</Button>
            <Button
              disabled={!spendingForm.title || !spendingForm.amount || createSpending.isPending}
              onClick={() => createSpending.mutate()}
            >
              Add Spending
            </Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}
