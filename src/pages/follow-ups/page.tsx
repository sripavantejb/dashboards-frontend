import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, AlertTriangle, CheckCircle, Phone, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { FormField, FormRow, FormStack, PageGrid } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/utils';
import type { FollowUp, Lead } from '@/types';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  phone: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  missed: 'bg-red-100 text-red-700',
  escalated: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function FollowUpsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leadId: '', type: 'phone', title: '', scheduledAt: '' });

  const { data: upcomingData } = useQuery({
    queryKey: ['follow-ups-upcoming'],
    queryFn: () => api.get<FollowUp[]>('/follow-ups/upcoming'),
  });

  const { data: missedData } = useQuery({
    queryKey: ['follow-ups-missed'],
    queryFn: () => api.get<FollowUp[]>('/follow-ups/missed'),
  });

  const { data: allData } = useQuery({
    queryKey: ['follow-ups'],
    queryFn: () => api.get<FollowUp[]>('/follow-ups'),
  });

  const { data: leadsData } = useQuery({
    queryKey: ['leads-select'],
    queryFn: () => api.get<Lead[]>('/leads?limit=50'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/follow-ups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups-upcoming'] });
      setShowForm(false);
      setForm({ leadId: '', type: 'phone', title: '', scheduledAt: '' });
      toast.success('Follow-up scheduled');
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/follow-ups/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups-upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups-missed'] });
      toast.success('Follow-up completed');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/follow-ups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups-upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups-missed'] });
      toast.success('Follow-up cancelled');
    },
  });

  const upcoming = upcomingData?.data || [];
  const missed = missedData?.data || [];
  const all = allData?.data || [];
  const leads = leadsData?.data || [];

  const getLeadName = (leadId: FollowUp['leadId']) => {
    if (typeof leadId === 'object' && leadId) return `${leadId.firstName} ${leadId.lastName || ''}`;
    return '—';
  };

  return (
    <>
      <PageHeader
        title="Follow-ups"
        description="Schedule and track phone, email, WhatsApp, and meeting follow-ups"
        action={<Button className="w-full sm:w-auto" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" /> Schedule</Button>}
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
                <Label>Type</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {['phone', 'whatsapp', 'email', 'meeting', 'visit', 'demo', 'proposal', 'renewal', 'payment_reminder'].map((t) => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </FormField>
              <FormField>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Follow-up title" />
              </FormField>
              <FormField>
                <Label>Scheduled At</Label>
                <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: new Date(e.target.value).toISOString() })} />
              </FormField>
            </FormRow>
            <Button className="w-full sm:w-auto" onClick={() => createMutation.mutate(form)} disabled={!form.leadId || !form.title || !form.scheduledAt}>Schedule Follow-up</Button>
          </CardContent>
        </Card>
      )}

      {missed.length > 0 && (
        <Card className="border-error/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-error">
              <AlertTriangle className="h-4 w-4" /> Missed Follow-ups ({missed.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {missed.map((fu) => (
              <div key={fu._id} className="flex flex-col gap-3 rounded-lg border border-error/20 p-3 sm:flex-row sm:items-center sm:justify-between lg:p-4">
                <div>
                  <p className="text-sm font-medium">{fu.title}</p>
                  <p className="text-xs text-muted-foreground">{getLeadName(fu.leadId)} · {formatDate(fu.scheduledAt)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => completeMutation.mutate(fu._id)}>Complete</Button>
                <Button size="sm" variant="ghost" className="text-error" onClick={() => cancelMutation.mutate(fu._id)}>Cancel</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <PageGrid cols="2">
        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming (7 days)</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No upcoming follow-ups</p>
            ) : upcoming.map((fu) => (
              <div key={fu._id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between lg:p-4">
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">{TYPE_ICONS[fu.type] || <Calendar className="h-4 w-4" />}</div>
                  <div>
                    <p className="text-sm font-medium">{fu.title}</p>
                    <p className="text-xs text-muted-foreground">{getLeadName(fu.leadId)} · {formatDate(fu.scheduledAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[fu.status]}>{fu.status}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => completeMutation.mutate(fu._id)}>
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">All Follow-ups</CardTitle></CardHeader>
          <CardContent className="flex max-h-[400px] flex-col gap-2 overflow-y-auto">
            {all.map((fu) => (
              <div key={fu._id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between lg:p-4">
                <div>
                  <p className="text-sm font-medium">{fu.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{fu.type} · {getLeadName(fu.leadId)} · {formatDate(fu.scheduledAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[fu.status]}>{fu.status}</Badge>
                  {fu.status === 'scheduled' && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => completeMutation.mutate(fu._id)}><CheckCircle className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-error" onClick={() => cancelMutation.mutate(fu._id)}>×</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </PageGrid>
    </>
  );
}
