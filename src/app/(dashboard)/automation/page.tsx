'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormStack, PageGrid } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageError, PageLoading } from '@/components/shared/page-states';

interface AutomationRule {
  _id: string;
  name: string;
  trigger: string;
  action: string;
  status: 'active' | 'draft';
}

export default function AutomationPage() {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', trigger: '', action: '', status: 'draft' as const });
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['automation'],
    queryFn: () => api.get<AutomationRule[]>('/automation'),
  });

  const createRule = useMutation({
    mutationFn: () => api.post('/automation', form),
    onSuccess: () => { toast.success('Rule created'); queryClient.invalidateQueries({ queryKey: ['automation'] }); setShowNew(false); },
  });

  const updateRule = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) => api.patch(`/automation/${id}`, updates),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['automation'] }); toast.success('Rule updated'); },
  });

  const deleteRule = useMutation({
    mutationFn: (id: string) => api.delete(`/automation/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['automation'] }); toast.success('Rule deleted'); },
  });

  const rules = data?.data || [];

  return (
    <>
      <PageHeader title="Automation" description="Workflow rules and automated actions"
        action={<Button className="w-full sm:w-auto" onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" /> New Rule</Button>}
      />

      {isLoading ? <PageLoading rows={3} /> : isError ? <PageError onRetry={() => refetch()} /> : (
        <PageGrid cols="2">
          {rules.length === 0 ? (
            <Card className="md:col-span-2"><CardContent className="py-12 text-center text-muted-foreground">No automation rules yet. Create your first rule.</CardContent></Card>
          ) : rules.map((rule) => (
            <Card key={rule._id}>
              <CardHeader className="flex flex-row items-start gap-3 pb-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-soft"><Zap className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{rule.name}</CardTitle>
                    <select className="h-7 rounded border border-input bg-background px-1 text-xs" value={rule.status}
                      onChange={(e) => updateRule.mutate({ id: rule._id, updates: { status: e.target.value } })}>
                      <option value="active">active</option>
                      <option value="draft">draft</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <div><span className="text-muted-foreground">Trigger: </span>{rule.trigger}</div>
                <div><span className="text-muted-foreground">Action: </span>{rule.action}</div>
                <Button size="sm" variant="ghost" className="text-error mt-2" onClick={() => deleteRule.mutate(rule._id)}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
              </CardContent>
            </Card>
          ))}
        </PageGrid>
      )}

      <SimpleModal open={showNew} onClose={() => setShowNew(false)} title="New Automation Rule">
        <FormStack>
          <FormField><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
          <FormField><Label>Trigger *</Label><Input value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} placeholder="e.g. Lead created" /></FormField>
          <FormField><Label>Action *</Label><Input value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} placeholder="e.g. Send notification" /></FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button disabled={!form.name || !form.trigger || !form.action || createRule.isPending} onClick={() => createRule.mutate()}>Create</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}
