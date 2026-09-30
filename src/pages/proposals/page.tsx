import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormRow, FormStack, ListRow } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Proposal, Lead } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
};

export default function ProposalsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    leadId: '',
    title: '',
    description: '',
    items: [{ description: '', quantity: 1, rate: 0 }],
  });

  const { data } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => api.get<Proposal[]>('/proposals'),
  });

  const { data: leadsData } = useQuery({
    queryKey: ['leads-select'],
    queryFn: () => api.get<Lead[]>('/leads?limit=50'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/proposals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setShowForm(false);
      toast.success('Proposal created');
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/proposals/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal sent');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/proposals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal deleted');
    },
  });

  const proposals = data?.data || [];
  const leads = leadsData?.data || [];

  const getLeadName = (leadId: Proposal['leadId']) => {
    if (typeof leadId === 'object' && leadId) return `${leadId.firstName} ${leadId.lastName || ''} — ${leadId.company || ''}`;
    return '—';
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, rate: 0 }] });

  const updateItem = (index: number, field: string, value: string | number) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: value };
    setForm({ ...form, items });
  };

  const subtotal = form.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);

  return (
    <>
      <PageHeader
        title="Proposals"
        description="Create, send, and track sales proposals"
        action={<Button className="w-full sm:w-auto" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" /> New Proposal</Button>}
      />

      {showForm && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-5 lg:pt-6">
            <FormRow>
              <FormField>
                <Label>Lead</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })}>
                  <option value="">Select lead...</option>
                  {leads.map((l) => <option key={l._id} value={l._id}>{l.firstName} {l.lastName} — {l.company}</option>)}
                </select>
              </FormField>
              <FormField>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Proposal title" />
              </FormField>
            </FormRow>

            <FormField>
              <Label>Line Items</Label>
              <div className="flex flex-col gap-2">
              {form.items.map((item, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input className="flex-1" placeholder="Description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} />
                  <div className="flex gap-2">
                    <Input className="w-20" type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} />
                    <Input className="w-28" type="number" placeholder="Rate" value={item.rate} onChange={(e) => updateItem(i, 'rate', Number(e.target.value))} />
                    <span className="flex items-center text-sm font-medium w-24">{formatCurrency(item.quantity * item.rate)}</span>
                  </div>
                </div>
              ))}
              </div>
              <Button variant="outline" size="sm" onClick={addItem}>Add Item</Button>
            </FormField>

            <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Subtotal: {formatCurrency(subtotal)}</p>
                <p className="text-sm text-muted-foreground">GST (18%): {formatCurrency(subtotal * 0.18)}</p>
                <p className="font-semibold">Total: {formatCurrency(subtotal * 1.18)}</p>
              </div>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.leadId || !form.title}>Create Proposal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {proposals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No proposals yet</p>
            </CardContent>
          </Card>
        ) : proposals.map((proposal) => (
          <Card key={proposal._id}>
            <CardContent className="p-0">
              <ListRow>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{proposal.title}</h3>
                  <Badge className={STATUS_COLORS[proposal.status]}>{proposal.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{getLeadName(proposal.leadId)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(proposal.createdAt)} · {proposal.items.length} items</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-display text-lg font-semibold">{formatCurrency(proposal.total)}</p>
                {proposal.status === 'draft' && (
                  <Button size="sm" onClick={() => sendMutation.mutate(proposal._id)}>
                    <Send className="h-3 w-3 mr-1" /> Send
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-error" onClick={() => deleteMutation.mutate(proposal._id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              </ListRow>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
