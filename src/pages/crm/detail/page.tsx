import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, UserCheck } from 'lucide-react';
import { useCan } from '@/lib/permissions';
import { ConvertLeadModal } from '@/pages/os/clients';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, formatDate, formatCurrency } from '@/lib/utils';
import type { Lead } from '@/types';
import { Link, useNavigate, useParams } from 'react-router';

export default function LeadDetailPage() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activityTitle, setActivityTitle] = useState('');
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);
  const can = useCan();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', company: '', status: '', notes: '', score: 0 });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => api.get<Lead>(`/leads/${id}`),
  });

  const { data: actData, refetch: refetchActivities } = useQuery({
    queryKey: ['lead-activities', id],
    queryFn: () => api.get<Array<{ _id: string; type: string; title: string; createdAt: string }>>(`/leads/${id}/activities`),
    enabled: !!data?.success,
  });

  const lead = data?.data;
  const activities = actData?.data || [];

  const updateLead = useMutation({
    mutationFn: (updates: Record<string, unknown>) => api.patch(`/leads/${id}`, updates),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Lead updated');
        queryClient.invalidateQueries({ queryKey: ['lead', id] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['pipeline'] });
        setEditing(false);
      } else toast.error(res.error?.message || 'Update failed');
    },
  });

  const addActivity = useMutation({
    mutationFn: (title: string) => api.post(`/leads/${id}/activities`, { type: 'note', title }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Activity added');
        setActivityTitle('');
        refetchActivities();
      }
    },
  });

  const deleteLead = useMutation({
    mutationFn: () => api.delete(`/leads/${id}`),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Lead archived');
        navigate('/crm');
      }
    },
  });

  const startEdit = () => {
    if (!lead) return;
    setForm({
      firstName: lead.firstName,
      lastName: lead.lastName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      status: lead.status,
      notes: lead.notes || '',
      score: lead.score,
    });
    setEditing(true);
  };

  if (isLoading) return <><PageHeader title="Lead Details" /><PageLoading /></>;
  if (isError || !lead) return <PageError onRetry={() => refetch()} />;

  const categoryName = typeof lead.categoryId === 'object' ? lead.categoryId?.name : undefined;

  return (
    <>
      <PageHeader
        title={`${lead.firstName} ${lead.lastName || ''}`}
        description={lead.company || 'Lead details'}
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/crm"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button></Link>
            {!editing && <Button variant="outline" onClick={startEdit}>Edit</Button>}
            {can('conversions:write') && (lead.status === 'converted' || lead.status === 'won'
              ? <Badge variant="outline" className="h-10 px-3">Converted</Badge>
              : <Button onClick={() => setConverting(true)}><UserCheck className="h-4 w-4 mr-2" /> Convert to client</Button>)}
            <Button variant="outline" className="text-error" onClick={() => deleteLead.mutate()} disabled={deleteLead.isPending}>
              <Trash2 className="h-4 w-4 mr-2" /> Archive
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2 lg:gap-6">
          {editing ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Edit Lead</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>First Name</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Last Name</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2"><Label>Score</Label><Input type="number" min={0} max={100} value={form.score} onChange={(e) => setForm({ ...form, score: Number(e.target.value) })} /></div>
                </div>
                <div className="space-y-2"><Label>Notes</Label><textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <div className="flex gap-2">
                  <Button onClick={() => updateLead.mutate(form)} disabled={updateLead.isPending}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
                {lead.email && <div><span className="text-muted-foreground">Email: </span>{lead.email}</div>}
                {lead.phone && <div><span className="text-muted-foreground">Phone: </span>{lead.phone}</div>}
                {lead.company && <div><span className="text-muted-foreground">Company: </span>{lead.company}</div>}
                {lead.source && <div><span className="text-muted-foreground">Source: </span>{lead.source}</div>}
                {categoryName && <div><span className="text-muted-foreground">Category: </span>{categoryName}</div>}
              </CardContent>
            </Card>
          )}

          {lead.notes && !editing && (
            <Card><CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader><CardContent><p className="text-sm whitespace-pre-wrap">{lead.notes}</p></CardContent></Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Activity Timeline</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input placeholder="Add a note..." value={activityTitle} onChange={(e) => setActivityTitle(e.target.value)} />
                <Button disabled={!activityTitle.trim()} onClick={() => addActivity.mutate(activityTitle)}>Add</Button>
              </div>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activities yet</p>
              ) : activities.map((a) => (
                <div key={a._id} className="flex justify-between gap-4 border-b pb-3 last:border-0 text-sm">
                  <span>{a.title}</span>
                  <span className="text-muted-foreground shrink-0">{formatDate(a.createdAt)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 pt-5 lg:pt-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={lead.status}
                onChange={(e) => updateLead.mutate({ status: e.target.value })}
              >
                {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Score</p>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-surface-card overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${lead.score}%` }} />
                </div>
                <span className="text-sm font-medium">{lead.score}</span>
              </div>
            </div>
            {lead.estimatedValue != null && (
              <div><p className="text-xs text-muted-foreground mb-1">Estimated Value</p><p className="text-sm font-medium">{formatCurrency(lead.estimatedValue)}</p></div>
            )}
            {lead.assignedTo && (
              <div><p className="text-xs text-muted-foreground mb-1">Assigned To</p><p className="text-sm">{lead.assignedTo.firstName} {lead.assignedTo.lastName}</p></div>
            )}
            <div><p className="text-xs text-muted-foreground mb-1">Created</p><p className="text-sm">{formatDate(lead.createdAt)}</p></div>
            {lead.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">{lead.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
            )}
          </CardContent>
        </Card>
      </div>
      {converting && <ConvertLeadModal lead={lead} open={converting} onClose={() => setConverting(false)} />}
    </>
  );
}
