import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone, PhoneCall, Clock, TrendingUp, CheckCircle, ListPlus, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { PageGrid } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { formatDate, getTelHref } from '@/lib/utils';
import type { Lead, CallDailyStats, FollowUp } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router';

const OUTCOMES = [
  { value: 'connected', label: 'Connected', color: 'bg-green-100 text-green-700' },
  { value: 'busy', label: 'Busy', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'no_answer', label: 'No Answer', color: 'bg-gray-100 text-gray-700' },
  { value: 'switched_off', label: 'Switched Off', color: 'bg-red-100 text-red-700' },
  { value: 'call_back', label: 'Call Back', color: 'bg-blue-100 text-blue-700' },
  { value: 'interested', label: 'Interested', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'meeting', label: 'Meeting', color: 'bg-purple-100 text-purple-700' },
  { value: 'proposal', label: 'Proposal', color: 'bg-pink-100 text-pink-700' },
  { value: 'won', label: 'Won', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
];

function getDefaultCallbackDatetimeLocal() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatCallbackDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function CallingPage() {
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [outcome, setOutcome] = useState('');
  const [duration, setDuration] = useState(0);
  const [notes, setNotes] = useState('');
  const [timer, setTimer] = useState(0);
  const [isCalling, setIsCalling] = useState(false);
  const [callbackDateTime, setCallbackDateTime] = useState('');

  const { data: statsData } = useQuery({
    queryKey: ['call-daily'],
    queryFn: () => api.get<CallDailyStats>('/calls/daily'),
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['call-analytics'],
    queryFn: () => api.get<Array<{ _id: string; total: number; connected: number }>>('/calls/analytics'),
  });

  const { data: leadsData } = useQuery({
    queryKey: ['leads-for-calling'],
    queryFn: () => api.get<Lead[]>('/leads?queueReady=true&sort=queuedAt&order=asc&limit=50'),
  });

  const { data: callbacksData } = useQuery({
    queryKey: ['follow-ups-upcoming'],
    queryFn: () => api.get<FollowUp[]>('/follow-ups/upcoming'),
  });

  const logCallMutation = useMutation({
    mutationFn: (data: { leadId: string; outcome: string; duration: number; notes?: string; scheduledCallback?: string }) =>
      api.post('/calls', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['call-daily'] });
      queryClient.invalidateQueries({ queryKey: ['leads-for-calling'] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups-upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
      toast.success(
        variables.outcome === 'call_back'
          ? 'Call logged and callback scheduled'
          : 'Call logged'
      );
      setSelectedLead(null);
      setOutcome('');
      setNotes('');
      setCallbackDateTime('');
      setDuration(0);
      setTimer(0);
      setIsCalling(false);
    },
  });

  const stats = statsData?.data;
  const leads = leadsData?.data || [];
  const analytics = analyticsData?.data || [];
  const scheduledCallbacks = (callbacksData?.data || []).filter(
    (fu) => fu.type === 'phone' && fu.title.startsWith('Call back')
  );

  const handleOutcomeSelect = (value: string) => {
    setOutcome(value);
    if (value === 'call_back' && !callbackDateTime) {
      setCallbackDateTime(getDefaultCallbackDatetimeLocal());
    }
  };

  const startCall = (lead: Lead) => {
    if (!getTelHref(lead.phone)) {
      toast.error('No phone number available for this lead');
      return;
    }

    setSelectedLead(lead);
    setIsCalling(true);
    setTimer(0);
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    (window as unknown as Record<string, NodeJS.Timeout>).__callTimer = interval;
  };

  const endCall = () => {
    clearInterval((window as unknown as Record<string, NodeJS.Timeout>).__callTimer);
    setDuration(timer);
    setIsCalling(false);
  };

  const submitCall = () => {
    if (!selectedLead || !outcome) return;
    if (outcome === 'call_back') {
      if (!callbackDateTime) {
        toast.error('Please select a callback date and time');
        return;
      }
      if (new Date(callbackDateTime) <= new Date()) {
        toast.error('Callback must be scheduled in the future');
        return;
      }
    }
    logCallMutation.mutate({
      leadId: selectedLead._id,
      outcome,
      duration: duration || timer,
      notes,
      ...(outcome === 'call_back' && callbackDateTime
        ? { scheduledCallback: new Date(callbackDateTime).toISOString() }
        : {}),
    });
  };

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <>
      <PageHeader title="Cold Calling" description="Log calls, track outcomes, and analyze performance" />

      <PageGrid cols="4">
        <KpiCard title="Today's Calls" value={stats?.totalCalls || 0} format="number" icon={<Phone className="h-4 w-4" />} />
        <KpiCard title="Connected" value={stats?.connected || 0} format="number" icon={<PhoneCall className="h-4 w-4" />} />
        <KpiCard title="Total Duration" value={formatTimer(stats?.totalDuration || 0)} icon={<Clock className="h-4 w-4" />} />
        <KpiCard title="Avg Duration" value={formatTimer(stats?.avgDuration || 0)} icon={<TrendingUp className="h-4 w-4" />} />
      </PageGrid>

      <div className="grid gap-4 lg:gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Call Queue</CardTitle>
                <Link to="/lead-lists">
                  <Button variant="outline" size="sm">
                    <ListPlus className="h-3 w-3 mr-1" /> Assign from Lists
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {leads.map((lead) => {
                const telHref = getTelHref(lead.phone);
                return (
                <div key={lead._id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between lg:p-4">
                  <div>
                    <p className="text-sm font-medium">{lead.firstName} {lead.lastName}</p>
                    <p className="text-xs text-muted-foreground">{lead.company} · {lead.phone || 'No phone'}</p>
                  </div>
                  {telHref && !isCalling ? (
                    <Button size="sm" asChild>
                      <a href={telHref} onClick={() => startCall(lead)}>
                        <Phone className="h-3 w-3 mr-1" /> Call
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" disabled>
                      <Phone className="h-3 w-3 mr-1" /> Call
                    </Button>
                  )}
                </div>
              );})}
              {leads.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No leads in queue</p>
                  <p className="text-xs text-muted-foreground mt-1">Assign leads from Lead Lists to start calling</p>
                  <Link to="/lead-lists">
                    <Button variant="outline" size="sm" className="mt-3">
                      <ListPlus className="h-3 w-3 mr-1" /> Go to Lead Lists
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedLead && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-base">
                  {isCalling ? 'On Call' : 'Log Call'} — {selectedLead.firstName} {selectedLead.lastName}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {isCalling && (
                  <div className="text-center py-4">
                    <p className="font-display text-4xl font-semibold">{formatTimer(timer)}</p>
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                      {getTelHref(selectedLead.phone) && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={getTelHref(selectedLead.phone)!}>
                            <Phone className="h-3 w-3 mr-1" /> Open Dialer
                          </a>
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={endCall}>End Call</Button>
                    </div>
                  </div>
                )}

                {!isCalling && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {OUTCOMES.map((o) => (
                        <button
                          key={o.value}
                          onClick={() => handleOutcomeSelect(o.value)}
                          className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${outcome === o.value ? o.color + ' ring-2 ring-primary' : 'bg-surface-soft hover:bg-surface-card'}`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    {outcome === 'call_back' && (
                      <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                        <Label className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Schedule Call Back
                        </Label>
                        <Input
                          type="datetime-local"
                          value={callbackDateTime}
                          min={getDefaultCallbackDatetimeLocal()}
                          onChange={(e) => setCallbackDateTime(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          This lead will reappear in your call queue at the scheduled time and show in Follow-ups & notifications.
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call notes..." />
                    </div>
                    <Button
                      onClick={submitCall}
                      disabled={
                        !outcome
                        || logCallMutation.isPending
                        || (outcome === 'call_back' && !callbackDateTime)
                      }
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Log Call ({formatTimer(duration || timer)})
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">7-Day Analytics</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="_id" tickFormatter={(v) => v.slice(5)} className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="total" fill="#111111" name="Total" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="connected" fill="#10b981" name="Connected" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Scheduled Call Backs</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {scheduledCallbacks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No scheduled callbacks</p>
              ) : (
                scheduledCallbacks.slice(0, 6).map((fu) => {
                  const lead = typeof fu.leadId === 'object' ? fu.leadId : null;
                  return (
                    <div key={fu._id} className="flex items-center justify-between text-sm rounded-lg border p-2">
                      <div>
                        <p className="font-medium">{lead ? `${lead.firstName} ${lead.lastName || ''}` : fu.title}</p>
                        <p className="text-xs text-muted-foreground">{formatCallbackDateTime(fu.scheduledAt)}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">Scheduled</Badge>
                    </div>
                  );
                })
              )}
              {scheduledCallbacks.length > 0 && (
                <Link to="/follow-ups">
                  <Button variant="link" size="sm" className="px-0 h-auto">View all in Follow-ups</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Today's Calls</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {(stats?.calls || []).slice(0, 8).map((call) => {
                const lead = typeof call.leadId === 'object' ? call.leadId : null;
                return (
                  <div key={call._id} className="flex items-center justify-between text-sm">
                    <span>{lead ? `${lead.firstName} ${lead.lastName || ''}` : '—'}</span>
                    <Badge variant="outline" className="text-xs">{call.outcome}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
