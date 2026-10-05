import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { CALL_OUTCOMES, callOutcomeLabel, dialThroughBridge, durationCaption, formatClock, formatStoredDuration, isHandset, markTelAlwaysDone, openTel, telAlwaysDone } from '@/lib/calling';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Textarea, inputClass } from '@/components/shared/os-ui';
import { cn, formatDate, getInitials } from '@/lib/utils';

export interface CallSession {
  _id: string;
  leadId?: string;
  phone?: string;
  telUri?: string;
  status: string;
  channel?: string;
  provider?: string;
  calledAt?: string;
  endedAt?: string;
  durationSeconds?: number | null;
  durationSource?: string;
  outcome?: string;
  notes?: string;
  nextFollowUpAt?: string | null;
  leadName?: string;
  phoneLinked?: boolean;
  callerName?: string;
  reportsCarrierEvents?: boolean;
}

interface LeadCallApi {
  start: () => void;
  resume: (call: CallSession) => void;
  status: ReactNode;
  panel: ReactNode;
  busy: boolean;
}

const Ctx = createContext<LeadCallApi | null>(null);

export function useLeadCall() {
  const value = useContext(Ctx);
  if (!value) throw new Error('Lead call controls are unavailable');
  return value;
}

export function LeadCallProvider({
  leadId,
  phone,
  contactName,
  company,
  enabled,
  basePath,
  children,
  autoStart = false,
  onDone,
}: {
  leadId: string;
  phone?: string;
  contactName?: string;
  company?: string;
  enabled: boolean;
  basePath: string;
  children?: ReactNode;
  /** Start dialing as soon as this provider mounts (leads table Call button). */
  autoStart?: boolean;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const [session, setSession] = useState<CallSession | null>(null);
  const [phase, setPhase] = useState<'idle' | 'calling' | 'completed' | 'form'>('idle');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [saving, setSaving] = useState(false);
  const [showWindowsTip, setShowWindowsTip] = useState(() => !telAlwaysDone());
  const [dialHint, setDialHint] = useState<'starting' | 'direct' | 'confirm'>('confirm');
  const started = useRef(0);
  const phaseRef = useRef(phase);
  const endRef = useRef<(source: 'phone_return' | 'crm_timer') => void>(() => {});
  const autoStarted = useRef(false);
  const startRef = useRef<() => Promise<void>>(async () => {});
  phaseRef.current = phase;

  useEffect(() => {
    if (!enabled || autoStart) return;
    let cancel = false;
    api.data<CallSession | null>(`/sales-crm/calling/sessions/open?leadId=${leadId}`)
      .then((open) => {
        if (cancel || !open) return;
        setSession(open);
        if (open.status === 'awaiting_outcome') setPhase('form');
        else if (open.status === 'initiated' || open.status === 'dialing') {
          started.current = Date.now();
          setPhase('calling');
        }
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, [leadId, enabled, autoStart]);

  const poll = useQuery({
    queryKey: ['call-session', session?._id],
    queryFn: () => api.data<CallSession>(`/sales-crm/calling/sessions/${session!._id}`),
    enabled: Boolean(session?._id && phase === 'calling'),
    refetchInterval: 2000,
  });

  useEffect(() => {
    const next = poll.data;
    if (!next || phaseRef.current !== 'calling') return;
    if (next.status === 'awaiting_outcome') {
      setSession(next);
      setPhase('completed');
    }
  }, [poll.data]);

  useEffect(() => {
    if (phase !== 'completed') return;
    const timer = window.setTimeout(() => setPhase('form'), 700);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'calling' || !session?._id || !isHandset()) return;
    let leftAt = 0;
    const onVis = () => {
      if (document.visibilityState === 'hidden') leftAt = Date.now();
      if (document.visibilityState === 'visible' && leftAt && Date.now() - leftAt > 1500) {
        endRef.current('phone_return');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [phase, session?._id]);

  const end = async (source: 'phone_return' | 'crm_timer') => {
    if (!session || phaseRef.current !== 'calling') return;
    try {
      const updated = await api.data<CallSession>(`/sales-crm/calling/sessions/${session._id}/end`, 'POST', {
        durationSource: source,
        durationSeconds: source === 'crm_timer' ? Math.max(0, Math.round((Date.now() - started.current) / 1000)) : undefined,
      });
      setSession(updated);
      setPhase('completed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not finish the call');
    }
  };
  endRef.current = end;

  const start = async () => {
    if (!enabled) return;
    if (!phone?.trim()) {
      toast.error('This lead has no phone number');
      onDone?.();
      return;
    }
    try {
      const created = await api.data<CallSession>('/sales-crm/calling/sessions', 'POST', { leadId, handset: isHandset() });
      started.current = Date.now();
      setSession(created);
      setOutcome('');
      setNotes('');
      setFollowUp('');
      setDialHint('starting');
      setPhase('calling');
      if (created.telUri) {
        // Prefer the native dialer / Continuity Phone Link so the device actually rings.
        if (isHandset()) {
          openTel(created.telUri);
          setDialHint('direct');
        } else {
          const placed = await dialThroughBridge(created.telUri);
          if (placed === 'clicked') setDialHint('direct');
          else if (placed === 'opened') setDialHint('confirm');
          else {
            openTel(created.telUri);
            setDialHint('confirm');
          }
        }
        const channel = created.channel === 'os_phone_link' ? 'os_phone_link' : 'this_device';
        const dialing = await api.data<CallSession>(`/sales-crm/calling/sessions/${created._id}/dialing`, 'POST', { channel });
        setSession(dialing);
      } else {
        toast.error('Could not build a dialable number for this lead');
        setPhase('idle');
        setSession(null);
        onDone?.();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start the call');
      onDone?.();
    }
  };
  startRef.current = start;

  useEffect(() => {
    if (!autoStart || !enabled || autoStarted.current) return;
    autoStarted.current = true;
    void startRef.current();
  }, [autoStart, enabled]);

  const resume = (call: CallSession) => {
    setSession(call);
    setPhase(call.status === 'awaiting_outcome' ? 'form' : 'calling');
    if (call.status !== 'awaiting_outcome') started.current = Date.now();
  };

  const finishUi = () => {
    setPhase('idle');
    setSession(null);
    onDone?.();
  };

  const cancel = async () => {
    if (!session) {
      finishUi();
      return;
    }
    try {
      await api.data(`/sales-crm/calling/sessions/${session._id}/cancel`, 'POST', {});
    } catch {
      /* already finished */
    }
    finishUi();
  };

  const save = async () => {
    if (!session || !outcome) return;
    setSaving(true);
    try {
      if (phaseRef.current === 'calling' || session.status === 'initiated' || session.status === 'dialing') {
        await api.data(`/sales-crm/calling/sessions/${session._id}/end`, 'POST', {
          durationSource: 'crm_timer',
          durationSeconds: Math.max(0, Math.round((Date.now() - started.current) / 1000)),
        });
      }
      await api.data(`/sales-crm/calling/sessions/${session._id}/outcome`, 'POST', {
        outcome,
        notes,
        ...(followUp ? { nextFollowUpAt: followUp } : {}),
      });
      toast.success('Call saved');
      finishUi();
      void qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'sales' && ['/leads', '/calls', '/dashboard', '/my-day', '/activity'].some((p) => String(q.queryKey[1] || '').startsWith(p)),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the call');
    } finally {
      setSaving(false);
    }
  };

  const dismissWindowsTip = () => {
    markTelAlwaysDone();
    setShowWindowsTip(false);
  };

  const stageOpen = phase === 'calling' || phase === 'completed' || phase === 'form';
  const length = formatStoredDuration(session);

  const status = phase === 'calling' || phase === 'completed'
    ? <span className="text-sm font-medium text-amber-700" aria-live="polite">Calling...</span>
    : phase === 'idle' && session?.status === 'awaiting_outcome'
      ? <button type="button" className="text-sm font-medium underline" onClick={() => setPhase('form')}>Add call outcome</button>
      : null;

  return (
    <Ctx.Provider value={{ start, resume, status, panel: null, busy: stageOpen }}>
      {children}
      {stageOpen && (
        <CallStage
          name={contactName || 'Lead'}
          company={company}
          phone={phone || session?.phone || ''}
          running={phase === 'calling'}
          startedAt={started.current || Date.now()}
          savedLength={length}
          outcome={outcome}
          notes={notes}
          followUp={followUp}
          saving={saving}
          showWindowsTip={showWindowsTip && !isHandset()}
          dialHint={dialHint}
          basePath={basePath}
          onOutcome={setOutcome}
          onNotes={setNotes}
          onFollowUp={setFollowUp}
          onSave={save}
          onCancel={phase === 'calling' ? cancel : finishUi}
          onDismissWindowsTip={dismissWindowsTip}
        />
      )}
    </Ctx.Provider>
  );
}

function useElapsed(running: boolean, startedAt: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  return Math.max(0, Math.round((now - startedAt) / 1000));
}

function CallStage({
  name, company, phone, running, startedAt, savedLength, outcome, notes, followUp, saving,
  showWindowsTip, dialHint, basePath, onOutcome, onNotes, onFollowUp, onSave, onCancel, onDismissWindowsTip,
}: {
  name: string;
  company?: string;
  phone: string;
  running: boolean;
  startedAt: number;
  savedLength: string | null;
  outcome: string;
  notes: string;
  followUp: string;
  saving: boolean;
  showWindowsTip: boolean;
  dialHint: 'starting' | 'direct' | 'confirm';
  basePath: string;
  onOutcome: (value: string) => void;
  onNotes: (value: string) => void;
  onFollowUp: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDismissWindowsTip: () => void;
}) {
  const elapsed = useElapsed(running, startedAt);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-background p-6 shadow-xl" role="dialog" aria-label="Call">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">{getInitials(name)}</div>
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-semibold">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{[company, phone].filter(Boolean).join(' · ')}</p>
          </div>
          <p className="ml-auto font-display text-3xl tabular-nums">{running ? formatClock(elapsed) : (savedLength || formatClock(elapsed))}</p>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="relative flex h-2.5 w-2.5">
            {running && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-medium">{running ? 'Calling...' : 'Call completed'}</span>
        </div>

        {dialHint === 'starting' && running && (
          <p className="mt-3 text-sm text-muted-foreground">Opening Phone Link and pressing Call…</p>
        )}
        {dialHint === 'direct' && running && (
          <p className="mt-3 text-sm text-muted-foreground">Your phone is dialing. Talk, pick an outcome, and save here.</p>
        )}
        {dialHint === 'confirm' && showWindowsTip && (
          <div className="mt-4 rounded-lg border border-hairline bg-surface-soft p-3 text-sm">
            <p className="font-medium">Stop the “which app?” question</p>
            <p className="mt-1 text-muted-foreground">On the Windows popup choose <strong>Phone</strong>, tick <strong>Always</strong>, then OK. You do that once.</p>
            <p className="mt-1 text-muted-foreground">If Phone Link is still waiting, press Call. The number is already filled in.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild><a href="ms-settings:defaultapps">Open default apps</a></Button>
              <Button size="sm" variant="outline" asChild><Link to={`${basePath}/phone`}>Link phone</Link></Button>
              <Button size="sm" onClick={onDismissWindowsTip}>I ticked Always</Button>
            </div>
          </div>
        )}
        {dialHint === 'confirm' && !showWindowsTip && (
          <p className="mt-3 text-sm text-muted-foreground">Press Call in the Phone window if it is still waiting. Then talk, pick an outcome, and save here.</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          {CALL_OUTCOMES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onOutcome(item.value)}
              className={cn('rounded-md border px-3 py-2 text-left text-sm', outcome === item.value ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-surface-soft')}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-sm font-medium">
          Call notes
          <Textarea className="mt-1.5" value={notes} placeholder="Customer is interested in the service and asked for pricing. Call again tomorrow." onChange={(e) => onNotes(e.target.value)} />
        </label>
        <label className="mt-4 block text-sm font-medium">
          Next follow-up date <span className="font-normal text-muted-foreground">(optional)</span>
          <input className={cn(inputClass, 'mt-1.5')} type="date" value={followUp} onChange={(e) => onFollowUp(e.target.value)} />
        </label>
        {!running && <p className="mt-3 text-xs text-muted-foreground">{durationCaption('crm_timer')}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>{running ? 'Cancel' : 'Close'}</Button>
          <Button disabled={!outcome || saving} onClick={onSave}>{saving ? 'Saving…' : 'Save call'}</Button>
        </div>
      </div>
    </div>
  );
}

export function CallHistory({ calls }: { calls: CallSession[] }) {
  const { resume } = useLeadCall();
  if (!calls.length) return <p className="text-sm text-muted-foreground">No calls yet.</p>;
  const groups = new Map<string, CallSession[]>();
  for (const call of calls) {
    const key = formatDate(call.calledAt || new Date().toISOString());
    groups.set(key, [...(groups.get(key) || []), call]);
  }
  return (
    <div className="flex flex-col gap-5">
      {[...groups.entries()].map(([day, rows]) => (
        <div key={day}>
          <p className="text-sm font-semibold">{day}</p>
          <ul className="mt-2 flex flex-col gap-3">
            {rows.map((call) => {
              const length = formatStoredDuration(call);
              return (
                <li key={call._id} className="text-sm">
                  <p>📞 {length || 'Duration not available'}</p>
                  <p className="text-muted-foreground">
                    Outcome: {call.outcome ? callOutcomeLabel(call.outcome) : 'Not saved yet'}
                    {call.status === 'awaiting_outcome' && (
                      <button type="button" className="ml-2 underline" onClick={() => resume(call)}>Add outcome</button>
                    )}
                  </p>
                  {call.notes && <p className="text-muted-foreground">Notes: {call.notes}</p>}
                  {call.nextFollowUpAt && <p className="text-muted-foreground">Follow-up: {formatDate(call.nextFollowUpAt)}</p>}
                  <p className="text-muted-foreground">Called by: {call.callerName || '—'}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Call length is timed in the CRM. Your phone network does not report it, and calls are not recorded.</p>
    </div>
  );
}
