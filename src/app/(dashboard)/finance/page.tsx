'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CheckCircle2, Clock, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
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
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import type { FinanceOverview, ProjectFinanceDetail, ProjectFinanceSummary } from '@/types';

type DetailTab = 'budget' | 'revenue' | 'spendings';
type ModalType = 'budget' | 'revenue-credit' | 'revenue-debit' | 'spending' | null;

const EXPENSE_CATEGORIES = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'software', label: 'Software & Tools' },
  { value: 'office', label: 'Office' },
  { value: 'travel', label: 'Travel' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'other', label: 'Other' },
];

function getTodayLocal() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getNowLocal() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ProjectSummaryCard({
  project,
  selected,
  onSelect,
}: {
  project: ProjectFinanceSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  const receivedPct = project.budget > 0 ? Math.round((project.budgetReceived / project.budget) * 100) : 0;

  return (
    <Card
      className={cn('cursor-pointer transition-all hover:shadow-md', selected && 'ring-2 ring-primary')}
      onClick={onSelect}
    >
      <CardContent className="p-4 lg:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{project.projectName}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{project.status}</p>
          </div>
          <ChevronRight className={cn('h-4 w-4 text-muted-foreground shrink-0', selected && 'text-primary')} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="font-medium">{formatCurrency(project.budget)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Received</p>
            <p className="font-medium text-green-700">{formatCurrency(project.budgetReceived)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="font-medium text-orange-600">{formatCurrency(project.budgetPending)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net</p>
            <p className={cn('font-medium', project.netProfit >= 0 ? 'text-green-700' : 'text-red-600')}>
              {formatCurrency(project.netProfit)}
            </p>
          </div>
        </div>
        {project.budget > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Budget received</span>
              <span>{receivedPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-green-600 rounded-full" style={{ width: `${Math.min(receivedPct, 100)}%` }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FinancePage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('budget');
  const [modal, setModal] = useState<ModalType>(null);
  const queryClient = useQueryClient();

  const [budgetForm, setBudgetForm] = useState({
    label: '',
    amount: 0,
    status: 'pending' as 'received' | 'pending',
    dueDate: '',
    notes: '',
  });
  const [revenueForm, setRevenueForm] = useState({
    description: '',
    amount: 0,
    recordedAt: getNowLocal(),
  });
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

  const { data: overviewData, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance-overview'],
    queryFn: () => api.get<FinanceOverview>('/finance/overview'),
  });

  const overview = overviewData?.data;
  const projects = overview?.projects || [];
  const activeProjectId = selectedProjectId || projects[0]?.projectId || null;

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['finance-project', activeProjectId],
    queryFn: () => api.get<ProjectFinanceDetail>(`/finance/projects/${activeProjectId}`),
    enabled: !!activeProjectId,
  });

  const detail = detailData?.data;
  const activeProject = projects.find((p) => p.projectId === activeProjectId);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
    if (activeProjectId) {
      queryClient.invalidateQueries({ queryKey: ['finance-project', activeProjectId] });
    }
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
  };

  const createBudget = useMutation({
    mutationFn: () =>
      api.post('/finance/budget-payments', {
        projectId: activeProjectId,
        ...budgetForm,
        dueDate: budgetForm.dueDate || undefined,
      }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Budget payment added');
        invalidate();
        setModal(null);
        setBudgetForm({ label: '', amount: 0, status: 'pending', dueDate: '', notes: '' });
      }
    },
  });

  const updateBudget = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'received' | 'pending' }) =>
      api.patch(`/finance/budget-payments/${id}`, { status }),
    onSuccess: () => {
      toast.success('Budget status updated');
      invalidate();
    },
  });

  const deleteBudget = useMutation({
    mutationFn: (id: string) => api.delete(`/finance/budget-payments/${id}`),
    onSuccess: () => {
      toast.success('Budget payment removed');
      invalidate();
    },
  });

  const createRevenue = useMutation({
    mutationFn: (type: 'credit' | 'debit') =>
      api.post('/finance/revenue-entries', {
        projectId: activeProjectId,
        type,
        amount: revenueForm.amount,
        description: revenueForm.description,
        recordedAt: new Date(revenueForm.recordedAt).toISOString(),
      }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Revenue entry recorded');
        invalidate();
        setModal(null);
        setRevenueForm({ description: '', amount: 0, recordedAt: getNowLocal() });
      }
    },
  });

  const deleteRevenue = useMutation({
    mutationFn: (id: string) => api.delete(`/finance/revenue-entries/${id}`),
    onSuccess: () => {
      toast.success('Revenue entry removed');
      invalidate();
    },
  });

  const createSpending = useMutation({
    mutationFn: () =>
      api.post('/expenses', {
        ...spendingForm,
        projectId: activeProjectId,
        spentAt: new Date(spendingForm.spentAt).toISOString(),
      }),
    onSuccess: () => {
      toast.success('Spending added');
      invalidate();
      setModal(null);
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

  const deleteSpending = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      toast.success('Spending removed');
      invalidate();
    },
  });

  const totals = overview?.totals;

  if (isLoading) return <PageLoading rows={6} />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <>
      <PageHeader
        title="Finance"
        description="Project budgets, revenue, and spendings"
        action={
          activeProjectId ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setModal('budget')}>
                <Plus className="h-4 w-4 mr-1" /> Budget
              </Button>
              <Button size="sm" variant="outline" onClick={() => setModal('revenue-credit')}>
                <TrendingUp className="h-4 w-4 mr-1" /> Add Revenue
              </Button>
              <Button size="sm" variant="outline" onClick={() => setModal('revenue-debit')}>
                <TrendingDown className="h-4 w-4 mr-1" /> Subtract
              </Button>
              <Button size="sm" onClick={() => setModal('spending')}>
                <Plus className="h-4 w-4 mr-1" /> Spending
              </Button>
            </div>
          ) : undefined
        }
      />

      {totals && (
        <PageGrid cols="4">
          <Card>
            <CardContent className="pt-5 lg:pt-6">
              <p className="text-xs text-muted-foreground">Budget Received</p>
              <p className="mt-1 text-2xl font-semibold text-green-700">{formatCurrency(totals.budgetReceived)}</p>
              <p className="text-xs text-muted-foreground mt-1">of {formatCurrency(totals.budget)} total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 lg:pt-6">
              <p className="text-xs text-muted-foreground">Budget Pending</p>
              <p className="mt-1 text-2xl font-semibold text-orange-600">{formatCurrency(totals.budgetPending)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 lg:pt-6">
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="mt-1 text-2xl font-semibold text-green-700">{formatCurrency(totals.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">Spendings: {formatCurrency(totals.totalSpent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 lg:pt-6">
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <p className={cn('mt-1 text-2xl font-semibold', totals.netProfit >= 0 ? 'text-green-700' : 'text-red-600')}>
                {formatCurrency(totals.netProfit)}
              </p>
            </CardContent>
          </Card>
        </PageGrid>
      )}

      {projects.length === 0 ? (
        <EmptyState message="No projects yet. Create a project first to track budgets and revenue." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr] mt-6">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-muted-foreground">Projects</p>
            {projects.map((p) => (
              <ProjectSummaryCard
                key={p.projectId}
                project={p}
                selected={p.projectId === activeProjectId}
                onSelect={() => setSelectedProjectId(p.projectId)}
              />
            ))}
          </div>

          <div>
            {activeProject && (
              <>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">{activeProject.projectName}</h2>
                  <p className="text-sm text-muted-foreground">
                    Budget {formatCurrency(activeProject.budget)} · Received {formatCurrency(activeProject.budgetReceived)} · Pending {formatCurrency(activeProject.budgetPending)}
                  </p>
                </div>

                <div className="flex gap-2 mb-4 flex-wrap">
                  {(['budget', 'revenue', 'spendings'] as DetailTab[]).map((tab) => (
                    <Button
                      key={tab}
                      variant={detailTab === tab ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDetailTab(tab)}
                      className="capitalize"
                    >
                      {tab}
                      {tab === 'budget' && detail ? ` (${detail.budgetPayments.length})` : ''}
                      {tab === 'revenue' && detail ? ` (${detail.revenueEntries.length})` : ''}
                      {tab === 'spendings' && detail ? ` (${detail.expenses.length})` : ''}
                    </Button>
                  ))}
                </div>

                {detailLoading ? (
                  <PageLoading rows={3} />
                ) : !detail ? (
                  <EmptyState message="Could not load project finance details." />
                ) : detailTab === 'budget' ? (
                  detail.budgetPayments.length === 0 ? (
                    <EmptyState message="No budget payments yet." />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {detail.budgetPayments.map((bp) => (
                        <Card key={bp._id}>
                          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{bp.label}</p>
                                <Badge className={bp.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                                  {bp.status === 'received' ? (
                                    <><CheckCircle2 className="h-3 w-3 mr-1 inline" />Received</>
                                  ) : (
                                    <><Clock className="h-3 w-3 mr-1 inline" />Not received</>
                                  )}
                                </Badge>
                              </div>
                              <p className="text-sm font-semibold text-green-700 mt-1">{formatCurrency(bp.amount)}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Created {formatDateTime(bp.createdAt)}
                                {bp.receivedAt && ` · Received ${formatDateTime(bp.receivedAt)}`}
                                {bp.dueDate && ` · Due ${formatDate(bp.dueDate)}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {bp.status === 'pending' && (
                                <Button size="sm" onClick={() => updateBudget.mutate({ id: bp._id, status: 'received' })}>
                                  Mark Received
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="text-error" onClick={() => deleteBudget.mutate(bp._id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )
                ) : detailTab === 'revenue' ? (
                  detail.revenueEntries.length === 0 ? (
                    <EmptyState message="No revenue entries yet." />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {detail.revenueEntries.map((entry) => (
                        <Card key={entry._id}>
                          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge className={entry.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                  {entry.type === 'credit' ? '+ Added' : '− Subtracted'}
                                </Badge>
                                <p className="font-medium">{entry.description}</p>
                              </div>
                              <p className={cn('text-sm font-semibold mt-1', entry.type === 'credit' ? 'text-green-700' : 'text-red-600')}>
                                {entry.type === 'credit' ? '+' : '-'}{formatCurrency(entry.amount)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Recorded {formatDateTime(entry.recordedAt)} · Logged {formatDateTime(entry.createdAt)}
                              </p>
                            </div>
                            <Button size="sm" variant="ghost" className="text-error" onClick={() => deleteRevenue.mutate(entry._id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )
                ) : detail.expenses.length === 0 ? (
                  <EmptyState message="No spendings for this project yet." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {detail.expenses.map((exp) => (
                      <Card key={exp._id}>
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{exp.title}</p>
                              <Badge variant="outline" className="capitalize">{exp.category}</Badge>
                              <Badge className={exp.status === 'paid' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}>
                                {exp.status}
                              </Badge>
                            </div>
                            <p className="text-sm font-semibold text-red-600 mt-1">-{formatCurrency(exp.amount)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Spent {formatDate(exp.spentAt)} · Added {formatDateTime(exp.createdAt)}
                              {exp.vendor && ` · ${exp.vendor}`}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" className="text-error" onClick={() => deleteSpending.mutate(exp._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <SimpleModal open={modal === 'budget'} onClose={() => setModal(null)} title="Add Budget Payment">
        <FormStack>
          <FormField>
            <Label>Label / Milestone *</Label>
            <Input value={budgetForm.label} onChange={(e) => setBudgetForm({ ...budgetForm, label: e.target.value })} placeholder="e.g. Advance payment, Final milestone" />
          </FormField>
          <FormRow>
            <FormField>
              <Label>Amount (₹) *</Label>
              <Input type="number" min={0} value={budgetForm.amount || ''} onChange={(e) => setBudgetForm({ ...budgetForm, amount: Number(e.target.value) })} />
            </FormField>
            <FormField>
              <Label>Status</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={budgetForm.status}
                onChange={(e) => setBudgetForm({ ...budgetForm, status: e.target.value as 'received' | 'pending' })}
              >
                <option value="pending">Not received</option>
                <option value="received">Received</option>
              </select>
            </FormField>
          </FormRow>
          <FormField>
            <Label>Due date</Label>
            <Input type="date" value={budgetForm.dueDate} onChange={(e) => setBudgetForm({ ...budgetForm, dueDate: e.target.value })} />
          </FormField>
          <FormField>
            <Label>Notes</Label>
            <Input value={budgetForm.notes} onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })} />
          </FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            <Button disabled={!budgetForm.label || !budgetForm.amount || createBudget.isPending} onClick={() => createBudget.mutate()}>Add</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>

      <SimpleModal
        open={modal === 'revenue-credit' || modal === 'revenue-debit'}
        onClose={() => setModal(null)}
        title={modal === 'revenue-debit' ? 'Subtract Revenue' : 'Add Revenue'}
      >
        <FormStack>
          <FormField>
            <Label>Description *</Label>
            <Input value={revenueForm.description} onChange={(e) => setRevenueForm({ ...revenueForm, description: e.target.value })} placeholder="e.g. Client payment, Refund adjustment" />
          </FormField>
          <FormRow>
            <FormField>
              <Label>Amount (₹) *</Label>
              <Input type="number" min={0} value={revenueForm.amount || ''} onChange={(e) => setRevenueForm({ ...revenueForm, amount: Number(e.target.value) })} />
            </FormField>
            <FormField>
              <Label>Date & time</Label>
              <Input type="datetime-local" value={revenueForm.recordedAt} onChange={(e) => setRevenueForm({ ...revenueForm, recordedAt: e.target.value })} />
            </FormField>
          </FormRow>
          <FormActions>
            <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            <Button
              disabled={!revenueForm.description || !revenueForm.amount || createRevenue.isPending}
              onClick={() => createRevenue.mutate(modal === 'revenue-debit' ? 'debit' : 'credit')}
            >
              {modal === 'revenue-debit' ? 'Subtract' : 'Add'}
            </Button>
          </FormActions>
        </FormStack>
      </SimpleModal>

      <SimpleModal open={modal === 'spending'} onClose={() => setModal(null)} title="Add Project Spending">
        <FormStack>
          <FormField>
            <Label>Title *</Label>
            <Input value={spendingForm.title} onChange={(e) => setSpendingForm({ ...spendingForm, title: e.target.value })} />
          </FormField>
          <FormRow>
            <FormField>
              <Label>Amount (₹) *</Label>
              <Input type="number" min={0} value={spendingForm.amount || ''} onChange={(e) => setSpendingForm({ ...spendingForm, amount: Number(e.target.value) })} />
            </FormField>
            <FormField>
              <Label>Date</Label>
              <Input type="date" value={spendingForm.spentAt} onChange={(e) => setSpendingForm({ ...spendingForm, spentAt: e.target.value })} />
            </FormField>
          </FormRow>
          <FormRow>
            <FormField>
              <Label>Category</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={spendingForm.category} onChange={(e) => setSpendingForm({ ...spendingForm, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </FormField>
            <FormField>
              <Label>Status</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={spendingForm.status} onChange={(e) => setSpendingForm({ ...spendingForm, status: e.target.value as 'paid' | 'pending' })}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </FormField>
          </FormRow>
          <FormField>
            <Label>Vendor</Label>
            <Input value={spendingForm.vendor} onChange={(e) => setSpendingForm({ ...spendingForm, vendor: e.target.value })} />
          </FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            <Button disabled={!spendingForm.title || !spendingForm.amount || createSpending.isPending} onClick={() => createSpending.mutate()}>Add Spending</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}
