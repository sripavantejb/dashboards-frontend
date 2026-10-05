import { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Check, ChevronDown, Copy, FilterX, LayoutGrid, List, LogIn, LogOut, Phone, Plus, Trash2, Upload, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { PageHeader } from '@/components/layout/page-header';
import { FormActions, FormRow, FormStack, PageGrid } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { FieldInput, type FieldDef } from '@/components/shared/resource-page';
import { DataTable, KeyValue, ProgressBar, SectionCard, Select, StatCard, StatusPill, Textarea, fmtDate, fmtDateTime, humanize, inr, stageSelectClass, type Column } from '@/components/shared/os-ui';
import { CALL_OUTCOMES, formatStoredDuration } from '@/lib/calling';
import { leadHref, leadIdOf } from '@/lib/portal-href';
import { CallAnalytics } from '@/components/sales/call-analytics';
import { CheckoutModal } from '@/components/sales/checkout-modal';
import { LeadBulkImportModal } from '@/components/sales/lead-bulk-import';
import { CallHistory, LeadCallProvider, useLeadCall } from '@/components/sales/lead-call';

type Any = Record<string, any>;
const onErr = (e: Error) => toast.error(e.message);

const LEAD_SOURCES = ['website', 'referral', 'instagram', 'facebook', 'linkedin', 'google', 'ads', 'campaign', 'cold_outreach', 'existing_customer', 'other'];
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'];
const DEAL_STAGES = ['new', 'contacted', 'qualified', 'meeting', 'proposal', 'negotiation', 'won', 'lost'];
const LOST_REASONS = ['price_objection', 'timing_issue', 'requirement_mismatch', 'chose_competitor', 'no_response', 'other'];
const MEETING_TYPES = ['discovery', 'demo', 'proposal', 'negotiation', 'internal', 'other'];
const MEETING_STATUSES = ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'];
const FOLLOWUP_TYPES = ['call', 'email', 'whatsapp', 'meeting', 'other'];
const QUOTATION_STATUSES = ['draft', 'pending_approval', 'approved', 'sent', 'viewed', 'accepted', 'rejected', 'expired'];
const PROPOSAL_STATUSES = ['draft', 'review', 'approved', 'sent', 'viewed', 'accepted', 'rejected'];
const TASK_STATUSES = ['todo', 'in_progress', 'completed'];
const PRIORITIES = ['urgent', 'high', 'medium', 'low'];
const MODULE_GROUPS: [string, string[]][] = [
  ['Dashboards', ['dashboard.sales', 'dashboard.manager']],
  ['Leads', ['leads.management', 'leads.qualification', 'leads.assignment']],
  ['Sales', ['sales.pipeline', 'sales.deals', 'sales.negotiation', 'sales.closure', 'sales.forecast']],
  ['Customers', ['customers.management', 'customers.documents']],
  ['Communication', ['comm.calls', 'comm.meetings', 'comm.followups', 'comm.email_whatsapp']],
  ['Documents', ['docs.quotations', 'docs.proposals', 'docs.sales_documents']],
  ['Performance', ['perf.targets', 'perf.performance', 'perf.leaderboard', 'perf.daily_report', 'perf.productivity', 'perf.daily_work_status']],
  ['Workforce', ['workforce.attendance_sync', 'workforce.attendance_dashboard', 'workforce.live_status', 'workforce.activity_tracking', 'workforce.activity_timeline']],
  ['Tasks', ['tasks.management', 'tasks.calendar']],
  ['Analytics & reports', ['analytics.revenue', 'analytics.conversion', 'analytics.lead_source', 'analytics.lost_deals', 'reports.reports', 'reports.export']],
  ['Growth', ['growth.ega', 'growth.ega_form', 'growth.applications']],
  ['Admin', ['admin.notifications', 'admin.approvals', 'admin.teams', 'admin.territories', 'admin.audit_logs']],
];
const ADMIN_ONLY = new Set(['dashboard.manager', 'leads.assignment', 'workforce.attendance_dashboard', 'workforce.live_status', 'workforce.activity_tracking', 'workforce.activity_timeline', 'analytics.revenue', 'analytics.conversion', 'analytics.lead_source', 'analytics.lost_deals', 'reports.reports', 'reports.export', 'admin.teams', 'admin.territories', 'admin.audit_logs']);

interface SalesMe { employee: Any; isSalesAdmin: boolean; modules: Record<string, boolean>; name: string; basePath: string }
const useMe = () => useOutletContext<SalesMe>();
/** UI portal path (/sales-crm or /bda) — never use for API calls. */
const usePortalPath = () => {
  const { basePath } = useMe();
  return (...parts: string[]) => [basePath, ...parts.filter(Boolean)].join('/');
};

function salesPathMatch(key: unknown, paths: string[]) {
  const path = String(key || '');
  return paths.some((p) => path === p || path.startsWith(`${p}?`) || path.startsWith(`${p}/`));
}

function useSales<T = any>(path: string, enabled = true) {
  return useQuery({
    queryKey: ['sales', path],
    queryFn: () => api.data<T>(`/sales-crm${path}`),
    enabled,
    staleTime: 45_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

function isLeadsQuery(key: unknown) {
  const path = String(key || '');
  return path === '/leads' || path.startsWith('/leads?') || path.startsWith('/leads/');
}

function patchLeadRows(qc: ReturnType<typeof useQueryClient>, id: string, patch: Record<string, unknown>) {
  qc.setQueriesData({ predicate: (q) => q.queryKey[0] === 'sales' && isLeadsQuery(q.queryKey[1]) }, (old: unknown) => {
    if (Array.isArray(old)) return old.map((row: Any) => (row?._id === id ? { ...row, ...patch } : row));
    if (old && typeof old === 'object' && (old as Any).lead?._id === id) {
      const bag = old as Any;
      return { ...bag, lead: { ...bag.lead, ...patch } };
    }
    return old;
  });
}

/** Mark caches stale without a network storm. Active screens refetch only when paths are listed. */
function touchSales(qc: ReturnType<typeof useQueryClient>, paths?: string[], refetchActive = false) {
  void qc.invalidateQueries({
    predicate: (q) => q.queryKey[0] === 'sales' && (!paths?.length || salesPathMatch(q.queryKey[1], paths)),
    refetchType: refetchActive ? 'active' : 'none',
  });
}

function useSalesAction<V = unknown>(fn: (v: V) => Promise<unknown>, success?: string, after?: (r: any) => void, paths: string[] = ['/leads', '/deals', '/calls', '/follow-ups', '/dashboard', '/my-day']) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      if (success) toast.success(success);
      touchSales(qc, paths, true);
      after?.(r);
    },
    onError: onErr,
  });
}

function useLeadRowAction<V extends { id: string }>(fn: (v: V) => Promise<unknown>, success: string, patchFor: (v: V) => Record<string, unknown>, stalePaths: string[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onMutate: async (v) => {
      await qc.cancelQueries({ predicate: (q) => q.queryKey[0] === 'sales' && isLeadsQuery(q.queryKey[1]) });
      patchLeadRows(qc, v.id, patchFor(v));
    },
    onSuccess: () => {
      toast.success(success);
      // Row already updated locally — only mark sibling pages stale for the next visit.
      if (stalePaths.length) touchSales(qc, stalePaths, false);
    },
    onError: (e) => {
      onErr(e);
      touchSales(qc, ['/leads'], true);
    },
  });
}

const post = (path: string, body: unknown = {}) => api.data(`/sales-crm${path}`, 'POST', body);

const isBdaPortal = (basePath: string) => basePath.includes('/bda');

const ROW_CTRL = 'box-border h-8 min-h-8 max-h-8 py-0 text-xs leading-8';
const inlineSelectClass = cn(ROW_CTRL, 'w-[7.75rem] min-w-[7.75rem] max-w-[7.75rem] cursor-pointer appearance-none pl-2 pr-7');
const rowInputClass = cn(ROW_CTRL, 'w-[10.5rem] min-w-[10.5rem] max-w-[10.5rem] px-2.5');
const rowNoteClass = cn(ROW_CTRL, 'w-[9.5rem] min-w-[9.5rem] max-w-[9.5rem] px-2.5');

function StageSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<string | { value: string; label: string }>;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Select className={cn(inlineSelectClass, stageSelectClass(value), className)} value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? humanize(o) : o.label;
        return <option key={v} value={v}>{label}</option>;
      })}
    </Select>
  );
}

function ymd(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function presetRange(preset: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = ymd(today);
  if (preset === 'today') return { from: to, to };
  if (preset === 'yesterday') {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const day = ymd(y);
    return { from: day, to: day };
  }
  if (preset === '7d') {
    const s = new Date(today);
    s.setDate(s.getDate() - 6);
    return { from: ymd(s), to };
  }
  if (preset === '30d') {
    const s = new Date(today);
    s.setDate(s.getDate() - 29);
    return { from: ymd(s), to };
  }
  if (preset === 'week') {
    const s = new Date(today);
    s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
    return { from: ymd(s), to };
  }
  if (preset === 'month') return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to };
  return { from: '', to: '' };
}

const EMPTY_LEAD_FILTER = {
  search: '',
  status: 'all',
  temperature: '',
  source: '',
  priority: '',
  datePreset: 'all',
  dateField: 'createdAt',
  from: '',
  to: '',
  followUp: '',
  dealStage: '',
  assignedEmployeeId: '',
  unassigned: false,
};

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="truncate text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function toDatetimeLocal(d?: string | Date | null) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(+dt)) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

function InlineNoteCell({ id, notes }: { id: string; notes?: string }) {
  const [text, setText] = useState(notes || '');
  const last = useRef(notes || '');
  useEffect(() => {
    setText(notes || '');
    last.current = notes || '';
  }, [id, notes]);
  const save = useLeadRowAction((v: { id: string; notes: string }) => api.data(`/sales-crm/leads/${v.id}`, 'PATCH', { notes: v.notes }), 'Note saved', (v) => ({ notes: v.notes }));
  return (
    <Input
      className={rowNoteClass}
      placeholder="Add note…"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const next = text.trim();
        if (next === last.current.trim()) return;
        last.current = next;
        save.mutate({ id, notes: next });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}

function RightInspector({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close details"
            className="fixed inset-0 z-[55] bg-black/40 md:bg-black/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={reduceMotion ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduceMotion ? undefined : { x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-xl flex-col border-l bg-background shadow-[-20px_0_40px_rgba(15,23,42,0.12)]"
          >
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** Modal form driven by `FieldDef`s; strips empty strings before posting. */
function FormModal({ open, onClose, title, fields, initial = {}, submitLabel = 'Save', onSubmit, pending, children }: {
  open: boolean; onClose: () => void; title: string; fields: FieldDef[]; initial?: Any; submitLabel?: string;
  onSubmit: (v: Any) => void; pending?: boolean; children?: React.ReactNode;
}) {
  const [form, setForm] = useState<Any>(initial);
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) { setLastOpen(open); if (open) setForm(initial); }
  const missing = fields.some((f) => f.required && !String(form[f.name] ?? '').trim());
  const submit = () => onSubmit(Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '' && v !== undefined)));
  return (
    <SimpleModal open={open} onClose={onClose} title={title}>
      <FormStack>
        {fields.map((f) => <FieldInput key={f.name} field={f} value={form[f.name]} onChange={(v) => setForm((s) => ({ ...s, [f.name]: v }))} />)}
        {children}
        <FormActions>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={missing || pending} onClick={submit}>{pending ? 'Saving…' : submitLabel}</Button>
        </FormActions>
      </FormStack>
    </SimpleModal>
  );
}

function Query<T>({ q, children }: { q: { data?: T; isLoading: boolean; isError: boolean; error: Error | null; refetch: () => unknown; isFetching?: boolean }; children: (d: T) => React.ReactNode }) {
  if (q.isError && q.data === undefined) return <PageError message={q.error?.message} onRetry={() => q.refetch()} />;
  // Keep prior rows visible while filters refetch — never blank the table on every keystroke.
  if (q.data === undefined) return <PageLoading />;
  return <>{children(q.data)}</>;
}

const leadLabel = (l?: Any | null) => (l ? [l.contactPerson, l.company].filter(Boolean).join(' · ') : '—');

function useLeadOptions() {
  const me = useMe();
  const q = useSales<Any[]>('/leads', me.modules['leads.management']);
  return (q.data || []).map((l) => ({ value: l._id, label: leadLabel(l) }));
}

// ---------------------------------------------------------------- layout
const TABS: { to: string; label: string; show: (m: SalesMe) => boolean }[] = [
  { to: '', label: 'Dashboard', show: () => true },
  { to: 'leads', label: 'Leads', show: (m) => m.modules['leads.management'] },
  { to: 'deals', label: 'Deals', show: (m) => m.modules['sales.deals'] },
  { to: 'customers', label: 'Customers', show: (m) => m.modules['customers.management'] },
  { to: 'calls', label: 'Calls', show: (m) => m.modules['comm.calls'] },
  { to: 'phone', label: 'Link phone', show: (m) => m.modules['comm.calls'] },
  { to: 'meetings', label: 'Meetings', show: (m) => m.modules['comm.meetings'] },
  { to: 'follow-ups', label: 'Follow-ups', show: (m) => m.modules['comm.followups'] },
  { to: 'quotations', label: 'Quotations', show: (m) => m.modules['docs.quotations'] },
  { to: 'proposals', label: 'Proposals', show: (m) => m.modules['docs.proposals'] },
  { to: 'tasks', label: 'Tasks', show: (m) => m.modules['tasks.management'] },
  { to: 'calendar', label: 'Calendar', show: (m) => m.modules['tasks.calendar'] },
  { to: 'approvals', label: 'Approvals', show: (m) => m.isSalesAdmin || m.modules['admin.approvals'] },
  { to: 'attendance', label: 'Attendance', show: () => true },
  { to: 'work-status', label: 'Work status', show: (m) => m.isSalesAdmin || m.modules['perf.daily_work_status'] },
  { to: 'targets', label: 'Targets', show: (m) => m.isSalesAdmin || m.modules['perf.targets'] },
  { to: 'performance', label: 'Performance', show: (m) => m.isSalesAdmin || m.modules['perf.performance'] || m.modules['perf.productivity'] || m.modules['sales.forecast'] },
  { to: 'leaderboard', label: 'Leaderboard', show: (m) => m.isSalesAdmin || m.modules['perf.leaderboard'] },
  { to: 'messages', label: 'Email / WhatsApp', show: (m) => m.modules['comm.email_whatsapp'] },
  { to: 'team', label: 'Team', show: (m) => m.isSalesAdmin },
  { to: 'territories', label: 'Territories', show: (m) => m.isSalesAdmin },
  { to: 'analytics', label: 'Analytics', show: (m) => m.isSalesAdmin },
];

const PRIMARY_TAB_KEYS = new Set(['', 'leads', 'deals', 'customers']);
const NAV_GROUPS: { id: string; label: string; keys: string[] }[] = [
  { id: 'communicate', label: 'Communicate', keys: ['calls', 'phone', 'meetings', 'follow-ups', 'messages'] },
  { id: 'documents', label: 'Documents', keys: ['quotations', 'proposals'] },
  { id: 'work', label: 'Work', keys: ['tasks', 'calendar', 'approvals', 'attendance', 'work-status'] },
  { id: 'performance', label: 'Performance', keys: ['targets', 'performance', 'leaderboard'] },
  { id: 'admin', label: 'Admin', keys: ['team', 'territories', 'analytics'] },
];

function SalesNavLink({ to, end, children }: { to: string; end?: boolean; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-soft hover:text-foreground'
        )
      }
    >
      {children}
    </NavLink>
  );
}

function SalesNavGroup({
  label,
  items,
  basePath,
}: {
  label: string;
  items: { to: string; label: string }[];
  basePath: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const active = items.some((i) => {
    const href = i.to ? `${basePath}/${i.to}` : basePath;
    return pathname === href || pathname.startsWith(`${href}/`);
  });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!items.length) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          active || open ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-soft hover:text-foreground'
        )}
        aria-expanded={open}
      >
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 opacity-70 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1.5 min-w-[200px] overflow-hidden rounded-lg border border-hairline bg-white py-1 shadow-lg">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to ? `${basePath}/${item.to}` : basePath}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'block px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-surface-soft font-medium text-foreground' : 'text-muted-foreground hover:bg-surface-soft hover:text-foreground'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function SalesCrmNav({ me, basePath }: { me: SalesMe; basePath: string }) {
  const visible = useMemo(
    () => TABS.filter((t) => t.show(me) && !(basePath.includes('/bda') && ['team', 'territories', 'analytics'].includes(t.to))),
    [me, basePath]
  );
  const byKey = useMemo(() => Object.fromEntries(visible.map((t) => [t.to, t])), [visible]);
  const primary = visible.filter((t) => PRIMARY_TAB_KEYS.has(t.to));
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.keys.map((k) => byKey[k]).filter(Boolean).map((t) => ({ to: t.to, label: t.label })),
  })).filter((g) => g.items.length > 0);

  return (
    <nav className="mb-2 flex flex-wrap items-center gap-1 rounded-xl border border-hairline bg-surface-soft/80 p-1.5">
      {primary.map((t) => (
        <SalesNavLink key={t.to || 'home'} to={t.to ? `${basePath}/${t.to}` : basePath} end={!t.to}>
          {t.label}
        </SalesNavLink>
      ))}
      {groups.length > 0 && <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />}
      {groups.map((g) => (
        <SalesNavGroup key={g.id} label={g.label} items={g.items} basePath={basePath} />
      ))}
    </nav>
  );
}

export function SalesCrmLayout({ basePath: basePathProp = '/sales-crm' }: { basePath?: string }) {
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const basePath = basePathProp === 'dynamic-bda' && orgSlug ? `/${orgSlug}/bda` : basePathProp;
  const isBdaPortal = basePath.includes('/bda');
  const q = useQuery({ queryKey: ['sales', '/me'], queryFn: () => api.data<Omit<SalesMe, 'basePath'>>('/sales-crm/me'), retry: false });
  if (q.isError) {
    return (
      <>
        <PageHeader title="Sales CRM" />
        <SectionCard><p className="py-6 text-center text-sm text-muted-foreground">{(q.error as Error).message}</p></SectionCard>
      </>
    );
  }
  if (q.isLoading || !q.data) return <PageLoading />;
  const me = { ...q.data, basePath };
  return (
    <>
      {!isBdaPortal && (
        <PageHeader
          title="Sales CRM"
          description={`${me.name} · ${me.employee.employeeCode}${me.isSalesAdmin ? ' · Sales admin' : ''}`}
        />
      )}
      {!isBdaPortal && <SalesCrmNav me={me} basePath={basePath} />}
      <div className="flex flex-col gap-6">
        <Outlet context={me} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------- dashboard
export function SalesDashboardPage() {
  const basePath = useMe().basePath;
  const q = useSales<Any>('/dashboard');
  return (
    <Query q={q}>
      {(d) => d.role === 'admin' ? (
        <>
          <PageGrid cols="4">
            <StatCard label="Active employees" value={d.stats.activeEmployees} />
            <StatCard label="Open leads" value={d.stats.openLeads} hint={`${d.stats.unassigned} unassigned`} tone={d.stats.unassigned ? 'danger' : 'default'} />
            <StatCard label="Converted" value={d.stats.converted} hint={`${d.conversionRate}% conversion`} tone="success" />
            <StatCard label="Pending approvals" value={d.stats.pendingApprovals} hint={`${d.stats.overdueTasks} overdue tasks`} />
          </PageGrid>
          <CallAnalytics data={d.callAnalytics} />
          <PageGrid cols="2">
            <SectionCard title="Lead status">
              <div className="flex flex-col gap-3">
                {Object.entries(d.leadStatus as Record<string, number>).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm"><StatusPill value={k} /><span className="font-medium tabular-nums">{v}</span></div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Team workload" action={<span className="text-xs text-muted-foreground">EGA: {d.stats.pendingEga} pending / {d.stats.totalEga}</span>}>
              <div className="flex flex-col gap-3">
                {d.workload.map((w: Any) => (
                  <div key={w.id}>
                    <div className="mb-1 flex justify-between text-sm"><span>{w.name}</span><span className="text-muted-foreground">{w.openLeads} open</span></div>
                    <ProgressBar value={w.pct} />
                  </div>
                ))}
                {!d.workload.length && <p className="text-sm text-muted-foreground">No sales employees yet. Add them from Team.</p>}
              </div>
            </SectionCard>
          </PageGrid>
          <SectionCard title="Recent BDA activity" action={<span className="text-xs text-muted-foreground">Also emailed hourly</span>}>
            <SalesActivityList rows={d.recentActivity || []} />
          </SectionCard>
        </>
      ) : (
        <>
          <PageGrid cols="4">
            <StatCard label="My leads" value={d.stats.myLeads} hint={`${d.stats.newLeads} new`} />
            <StatCard label="Open deals" value={d.stats.openDeals} hint={`Weighted ${inr(d.stats.weightedPipeline)}`} />
            <StatCard label="Pipeline" value={inr(d.stats.pipelineValue)} />
            <StatCard label="Revenue won" value={inr(d.stats.revenue)} tone="success" />
          </PageGrid>
          <CallAnalytics data={d.callAnalytics} />
          <PageGrid cols="2">
            <SectionCard title={`Follow-ups due (${d.stats.followUpsDue})`} action={<Link className="text-xs hover:underline" to={`${basePath}/follow-ups`}>View all</Link>}>
              <SimpleList rows={d.followUps} empty="Nothing due today." render={(f) => {
                const lid = leadIdOf(f);
                return (
                  <>
                    {lid ? <Link className="hover:underline" to={leadHref(basePath, lid)}>{f.notes || humanize(f.type)}</Link> : <span>{f.notes || humanize(f.type)}</span>}
                    <span className="text-xs text-muted-foreground">{fmtDateTime(f.dueAt)}</span>
                  </>
                );
              }} />
            </SectionCard>
            <SectionCard title="Upcoming meetings" action={<Link className="text-xs hover:underline" to={`${basePath}/meetings`}>View all</Link>}>
              <SimpleList rows={d.meetings} empty="No meetings scheduled." render={(m) => {
                const lid = leadIdOf(m);
                return (
                  <>
                    {lid ? <Link className="hover:underline" to={leadHref(basePath, lid)}>{m.title}</Link> : <span>{m.title}</span>}
                    <span className="text-xs text-muted-foreground">{fmtDateTime(m.startsAt)}</span>
                  </>
                );
              }} />
            </SectionCard>
            <SectionCard title="Open tasks" action={<Link className="text-xs hover:underline" to={`${basePath}/tasks`}>View all</Link>}>
              <SimpleList rows={d.tasks} empty="No open tasks." render={(t) => <><span>{t.title}</span><span className="text-xs text-muted-foreground">{fmtDate(t.dueDate)}</span></>} />
            </SectionCard>
            <SectionCard title="Recent leads" action={<Link className="text-xs hover:underline" to={`${basePath}/leads`}>Inbox</Link>}>
              <SimpleList rows={d.recentLeads} empty="No leads yet." render={(l) => <><Link className="hover:underline" to={leadHref(basePath, l._id)}>{leadLabel(l)}</Link><StatusPill value={l.status} /></>} />
            </SectionCard>
          </PageGrid>
        </>
      )}
    </Query>
  );
}

function SimpleList({ rows, render, empty }: { rows: Any[]; render: (r: Any) => React.ReactNode; empty: string }) {
  if (!rows?.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <ul className="divide-y">{rows.map((r) => <li key={r._id} className="flex items-center justify-between gap-3 py-2 text-sm">{render(r)}</li>)}</ul>;
}

// ---------------------------------------------------------------- leads
const LEAD_FIELDS: FieldDef[] = [
  { name: 'contactPerson', label: 'Contact person', required: true },
  { name: 'company', label: 'Company' },
  { name: 'phone', label: 'Phone' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'city', label: 'City' },
  { name: 'industry', label: 'Industry' },
  { name: 'source', label: 'Source', type: 'select', options: LEAD_SOURCES },
  { name: 'temperature', label: 'Temperature', type: 'select', options: ['hot', 'warm', 'cold'] },
  { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES },
  { name: 'requirement', label: 'Requirement', type: 'textarea' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export function SalesLeadsPage() {
  const me = useMe();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const drawer = isBdaPortal(me.basePath);
  const selectedId = searchParams.get('lead');
  const [callingLead, setCallingLead] = useState<Any | null>(null);
  const [filter, setFilter] = useState(EMPTY_LEAD_FILTER);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);
  const dates = filter.datePreset === 'custom' ? { from: filter.from, to: filter.to } : presetRange(filter.datePreset);
  const qs = new URLSearchParams({
    status: filter.status,
    ...(filter.temperature && { temperature: filter.temperature }),
    ...(search && { search }),
    ...(filter.source && { source: filter.source }),
    ...(filter.priority && { priority: filter.priority }),
    ...(filter.unassigned && { unassigned: 'true' }),
    ...(filter.assignedEmployeeId && { assignedEmployeeId: filter.assignedEmployeeId }),
    ...(filter.followUp && { followUp: filter.followUp }),
    ...(filter.dealStage && { dealStage: filter.dealStage }),
    ...((dates.from || dates.to) && { dateField: filter.dateField, ...(dates.from && { from: dates.from }), ...(dates.to && { to: dates.to }) }),
  }).toString();
  const q = useSales<Any[]>(`/leads?${qs}`);
  const dealsQ = useSales<Any[]>('/deals?stage=all', Boolean(me.modules['sales.deals']));
  const team = useSales<Any[]>('/employees', me.isSalesAdmin);
  const dealByLead = useMemo(() => {
    const map = new Map<string, Any>();
    for (const d of dealsQ.data || []) {
      const lid = String(d.leadId?._id || d.leadId || '');
      if (lid && !map.has(lid)) map.set(lid, d);
    }
    return map;
  }, [dealsQ.data]);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const qc = useQueryClient();
  const create = useSalesAction((v: Any) => post('/leads', v), 'Lead created', () => setOpen(false), ['/leads', '/dashboard', '/my-day']);
  const setStatus = useLeadRowAction((v: { id: string; status: string }) => post(`/leads/${v.id}/status`, { status: v.status }), 'Status updated', (v) => ({ status: v.status }), ['/dashboard', '/my-day']);
  const setTemp = useLeadRowAction((v: { id: string; temperature: string }) => api.data(`/sales-crm/leads/${v.id}`, 'PATCH', { temperature: v.temperature }), 'Temperature updated', (v) => ({ temperature: v.temperature }));
  const logCall = useLeadRowAction((v: { id: string; outcome: string; status?: string }) => post('/calls', { leadId: v.id, outcome: v.outcome }), 'Call logged', (v) => ({
    lastCallOutcome: v.outcome,
    lastContactedAt: new Date().toISOString(),
    ...(v.status ? { status: v.status } : {}),
  }), ['/calls', '/dashboard', '/my-day']);
  const scheduleCb = useLeadRowAction((v: { id: string; dueAt: string }) => post('/follow-ups', { leadId: v.id, dueAt: v.dueAt, type: 'call', notes: 'Callback' }), 'Callback scheduled', (v) => ({ nextFollowUpAt: v.dueAt }), ['/follow-ups', '/my-day', '/dashboard']);
  const moveDeal = useMutation({
    mutationFn: (v: { id: string; stage: string }) => post(`/deals/${v.id}/stage`, { stage: v.stage }),
    onMutate: (v) => {
      qc.setQueriesData({ predicate: (q) => q.queryKey[0] === 'sales' && String(q.queryKey[1] || '').startsWith('/deals') }, (old: unknown) => (
        Array.isArray(old) ? old.map((d: Any) => (d._id === v.id ? { ...d, stage: v.stage } : d)) : old
      ));
    },
    onSuccess: (_r, v) => {
      toast.success(v.stage === 'won' ? 'Deal won — customer created' : 'Deal stage updated');
      touchSales(qc, v.stage === 'won' ? ['/customers', '/dashboard', '/my-day'] : ['/dashboard'], false);
    },
    onError: onErr,
  });
  const startDeal = useMutation({
    mutationFn: async (v: { leadId: string; name: string; stage: string }) => {
      const created = await post('/deals', { dealName: v.name, leadId: v.leadId, probability: 10, priority: 'medium' }) as Any;
      if (v.stage && v.stage !== 'new') await post(`/deals/${created._id}/stage`, { stage: v.stage });
      return { ...created, stage: v.stage || created.stage, leadId: v.leadId };
    },
    onSuccess: (created) => {
      toast.success(created.stage === 'won' ? 'Deal won — customer created' : 'Deal stage updated');
      qc.setQueriesData({ predicate: (q) => q.queryKey[0] === 'sales' && String(q.queryKey[1] || '').startsWith('/deals') }, (old: unknown) => (
        Array.isArray(old) ? [created, ...old] : old
      ));
      touchSales(qc, created.stage === 'won' ? ['/customers', '/dashboard'] : ['/dashboard'], false);
    },
    onError: onErr,
  });
  const removeLead = useMutation({
    mutationFn: (id: string) => api.data(`/sales-crm/leads/${id}`, 'DELETE'),
    onMutate: (id) => {
      qc.setQueriesData({ predicate: (q) => q.queryKey[0] === 'sales' && isLeadsQuery(q.queryKey[1]) }, (old: unknown) => (
        Array.isArray(old) ? old.filter((row: Any) => row._id !== id) : old
      ));
      if (selectedId === id) setSearchParams({});
      if (callingLead?._id === id) setCallingLead(null);
    },
    onSuccess: () => {
      toast.success('Lead deleted');
      touchSales(qc, ['/dashboard', '/my-day', '/deals', '/calls', '/follow-ups', '/meetings'], true);
    },
    onError: (e) => {
      onErr(e);
      touchSales(qc, ['/leads'], true);
    },
  });
  const openLead = (id: string) => {
    if (!drawer) {
      navigate(`${me.basePath}/leads/${id}`);
      return;
    }
    setSearchParams({ lead: id });
  };
  const activeFilters = [
    filter.status !== 'all', filter.temperature, filter.source, filter.priority, filter.datePreset !== 'all',
    filter.followUp, filter.dealStage, filter.assignedEmployeeId, filter.unassigned, searchInput,
  ].filter(Boolean).length;
  const patchFilter = (next: Partial<typeof EMPTY_LEAD_FILTER>) => setFilter((s) => ({ ...s, ...next }));
  const filterSelect = 'h-9 w-full min-w-0 border-black/[0.08] bg-white py-0 pl-2.5 pr-8 text-[13px] leading-9';
  return (
    <>
      <div className="rounded-xl border border-black/[0.06] bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b border-black/[0.05] px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
          <Input placeholder="Search name, company, phone…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="h-9 border-black/[0.08] bg-white sm:max-w-sm" />
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => { setFilter(EMPTY_LEAD_FILTER); setSearchInput(''); setSearch(''); }}>
                <FilterX className="mr-1.5 h-4 w-4" />Clear ({activeFilters})
              </Button>
            )}
            <Button type="button" variant="outline" className="h-9" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />Bulk import
            </Button>
            <Button className="h-9" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New lead</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          <FilterField label="Status">
            <Select className={filterSelect} value={filter.status} onChange={(e) => patchFilter({ status: e.target.value })}>
              <option value="all">All statuses</option>
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Temperature">
            <Select className={filterSelect} value={filter.temperature} onChange={(e) => patchFilter({ temperature: e.target.value })}>
              <option value="">Any temp.</option>
              {['hot', 'warm', 'cold'].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Source">
            <Select className={filterSelect} value={filter.source} onChange={(e) => patchFilter({ source: e.target.value })}>
              <option value="">Any source</option>
              {LEAD_SOURCES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Priority">
            <Select className={filterSelect} value={filter.priority} onChange={(e) => patchFilter({ priority: e.target.value })}>
              <option value="">Any priority</option>
              {PRIORITIES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Date field">
            <Select className={filterSelect} value={filter.dateField} onChange={(e) => patchFilter({ dateField: e.target.value })}>
              <option value="createdAt">Created</option>
              <option value="lastContactedAt">Last contacted</option>
              <option value="nextFollowUpAt">Callback</option>
            </Select>
          </FilterField>
          <FilterField label="Date range">
            <Select className={filterSelect} value={filter.datePreset} onChange={(e) => patchFilter({ datePreset: e.target.value })}>
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom</option>
            </Select>
          </FilterField>
          {filter.datePreset === 'custom' && (
            <>
              <FilterField label="From">
                <Input type="date" className="h-9 w-full border-black/[0.08] bg-white py-0 text-[13px] leading-9" value={filter.from} onChange={(e) => patchFilter({ from: e.target.value })} />
              </FilterField>
              <FilterField label="To">
                <Input type="date" className="h-9 w-full border-black/[0.08] bg-white py-0 text-[13px] leading-9" value={filter.to} onChange={(e) => patchFilter({ to: e.target.value })} />
              </FilterField>
            </>
          )}
          <FilterField label="Follow-up">
            <Select className={filterSelect} value={filter.followUp} onChange={(e) => patchFilter({ followUp: e.target.value })}>
              <option value="">Any follow-up</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due today</option>
              <option value="upcoming">Upcoming</option>
              <option value="none">Not scheduled</option>
            </Select>
          </FilterField>
          {me.modules['sales.deals'] && (
            <FilterField label="Deal stage">
              <Select className={filterSelect} value={filter.dealStage} onChange={(e) => patchFilter({ dealStage: e.target.value })}>
                <option value="">Any deal</option>
                <option value="none">No deal yet</option>
                {DEAL_STAGES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
              </Select>
            </FilterField>
          )}
          {me.isSalesAdmin && (
            <FilterField label="Owner">
              <Select className={filterSelect} value={filter.unassigned ? 'unassigned' : filter.assignedEmployeeId} onChange={(e) => {
                const v = e.target.value;
                if (v === 'unassigned') patchFilter({ unassigned: true, assignedEmployeeId: '' });
                else patchFilter({ unassigned: false, assignedEmployeeId: v });
              }}>
                <option value="">Anyone</option>
                <option value="unassigned">Unassigned</option>
                {(team.data || []).filter((e) => e.status === 'active').map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
              </Select>
            </FilterField>
          )}
        </div>
      </div>
      <Query q={q}>
        {(rows) => (
          <DataTable
            rows={rows}
            selectedId={selectedId || undefined}
            compact
            empty="No leads match."
            onRowClick={(r) => openLead(r._id)}
            columns={[
              { key: 'contactPerson', header: 'Lead', className: 'min-w-[11rem] max-w-[14rem]', render: (r) => (
                <button type="button" className="block w-full max-w-[13rem] text-left" onClick={(e) => { e.stopPropagation(); openLead(r._id); }}>
                  <p className="truncate text-[13px] font-semibold leading-5 tracking-tight hover:underline">{r.contactPerson}</p>
                  <p className="truncate text-[11px] leading-4 text-muted-foreground">{r.company || r.phone || '—'}</p>
                </button>
              ) },
              { key: 'status', header: 'Status', className: 'w-[8.25rem]', render: (r) => (
                <StageSelect value={r.status} options={LEAD_STATUSES} onChange={(status) => setStatus.mutate({ id: r._id, status })} />
              ) },
              { key: 'temperature', header: 'Temp.', className: 'w-[8.25rem]', render: (r) => (
                <StageSelect value={r.temperature || 'warm'} options={['hot', 'warm', 'cold']} onChange={(temperature) => setTemp.mutate({ id: r._id, temperature })} />
              ) },
              ...(me.modules['comm.calls'] ? [{
                key: 'call', header: 'Call', className: 'w-[11rem]', render: (r: Any) => (
                  <div className="flex h-8 items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 shrink-0 border-black/10 px-0"
                      disabled={!String(r.phone || '').trim() || callingLead?._id === r._id}
                      title={String(r.phone || '').trim() ? `Call ${r.phone}` : 'Add a phone number first'}
                      aria-label={String(r.phone || '').trim() ? `Call ${r.contactPerson}` : 'No phone number'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCallingLead(r);
                      }}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                    <StageSelect
                      className="w-[7.25rem] min-w-[7.25rem] max-w-[7.25rem]"
                      value={r.lastCallOutcome || ''}
                      placeholder="Log…"
                      options={[{ value: 'connected', label: 'Connected' }, ...CALL_OUTCOMES.map((o) => ({ value: o.value, label: o.label }))]}
                      onChange={(outcome) => outcome && logCall.mutate({ id: r._id, outcome, status: r.status === 'new' ? 'contacted' : undefined })}
                    />
                  </div>
                ),
              }] : []),
              ...(me.modules['sales.deals'] ? [{
                key: 'dealStage', header: 'Deal stage', className: 'w-[8.25rem]', render: (r: Any) => {
                  const deal = dealByLead.get(r._id);
                  return (
                    <StageSelect
                      value={deal?.stage || ''}
                      placeholder="Set stage…"
                      options={DEAL_STAGES}
                      onChange={(stage) => {
                        if (!stage) return;
                        if (deal) moveDeal.mutate({ id: deal._id, stage });
                        else startDeal.mutate({ leadId: r._id, name: r.company || r.contactPerson, stage });
                      }}
                    />
                  );
                },
              }] : []),
              { key: 'notes', header: 'Notes', className: 'w-[10rem]', render: (r) => <InlineNoteCell id={r._id} notes={r.notes} /> },
              ...(me.modules['comm.followups'] ? [{
                key: 'callback', header: 'Callback', className: 'w-[11rem]', render: (r: Any) => (
                  <Input
                    type="datetime-local"
                    className={cn(rowInputClass, 'border-black/10 bg-white')}
                    key={`${r._id}-${r.nextFollowUpAt || ''}`}
                    defaultValue={toDatetimeLocal(r.nextFollowUpAt)}
                    onBlur={(e) => {
                      if (!e.target.value) return;
                      const iso = new Date(e.target.value).toISOString();
                      const prev = r.nextFollowUpAt ? new Date(r.nextFollowUpAt).toISOString() : '';
                      if (iso === prev) return;
                      scheduleCb.mutate({ id: r._id, dueAt: iso });
                    }}
                  />
                ),
              }] : []),
              ...(me.isSalesAdmin ? [{ key: 'assignedName', header: 'Owner', className: 'min-w-[7rem]', render: (r: Any) => <span className="text-[13px]">{r.assignedName || <span className="text-amber-600">Unassigned</span>}</span> }] : []),
              { key: 'actions', header: '', className: 'w-10', render: (r) => (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 shrink-0 px-0 text-muted-foreground hover:bg-error/10 hover:text-error"
                  title="Delete lead"
                  aria-label={`Delete ${r.contactPerson}`}
                  disabled={removeLead.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!confirm(`Delete lead “${r.contactPerson}”?`)) return;
                    removeLead.mutate(r._id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) },
            ] as Column<Any>[]} />
        )}
      </Query>
      <FormModal open={open} onClose={() => setOpen(false)} title="New lead" fields={LEAD_FIELDS} initial={{ source: 'website', temperature: 'warm', priority: 'medium' }} onSubmit={(v) => create.mutate(v)} pending={create.isPending} />
      <LeadBulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => touchSales(qc, ['/leads', '/dashboard', '/my-day', '/follow-ups', '/calls'], true)}
      />
      {drawer && (
        <RightInspector open={Boolean(selectedId)} onClose={() => setSearchParams({})}>
          {selectedId && <LeadInspector id={selectedId} onClose={() => setSearchParams({})} />}
        </RightInspector>
      )}
      {callingLead && me.modules['comm.calls'] && (
        <LeadCallProvider
          key={callingLead._id}
          leadId={callingLead._id}
          phone={callingLead.phone}
          contactName={callingLead.contactPerson}
          company={callingLead.company}
          enabled
          basePath={me.basePath}
          autoStart
          onDone={() => setCallingLead(null)}
        />
      )}
    </>
  );
}

export function SalesLeadDetailPage() {
  const { id } = useParams();
  const me = useMe();
  if (isBdaPortal(me.basePath) && id) {
    return <Navigate to={`${me.basePath}/leads?lead=${id}`} replace />;
  }
  if (!id) return null;
  return <LeadInspector id={id} />;
}

function LeadInspector({ id, onClose }: { id: string; onClose?: () => void }) {
  const me = useMe();
  const basePath = me.basePath;
  const navigate = useNavigate();
  const q = useSales<Any>(`/leads/${id}`);
  const team = useSales<Any[]>('/employees', me.isSalesAdmin);
  const [modal, setModal] = useState<'' | 'edit' | 'qual' | 'call' | 'followup' | 'meeting' | 'deal'>('');
  const close = () => setModal('');
  const status = useSalesAction((s: string) => post(`/leads/${id}/status`, { status: s }), 'Status updated');
  const assign = useSalesAction((employeeId: string) => post(`/leads/${id}/assign`, { employeeId }), 'Lead assigned');
  const edit = useSalesAction((v: Any) => api.data(`/sales-crm/leads/${id}`, 'PATCH', v), 'Lead updated', close);
  const qual = useSalesAction((v: Any) => post(`/leads/${id}/qualification`, v), 'Qualification saved', close);
  const call = useSalesAction((v: Any) => post('/calls', { ...v, leadId: id }), 'Call logged', close);
  const followup = useSalesAction((v: Any) => post('/follow-ups', { ...v, leadId: id }), 'Follow-up scheduled', close);
  const meeting = useSalesAction((v: Any) => post('/meetings', { ...v, leadId: id }), 'Meeting scheduled', close);
  const deal = useSalesAction((v: Any) => post('/deals', { ...v, leadId: id }), 'Deal created', (r) => navigate(`${basePath}/deals/${r._id}`));
  const archive = useSalesAction(() => api.data(`/sales-crm/leads/${id}`, 'DELETE'), 'Lead deleted', () => {
    onClose?.();
    if (!onClose) navigate(`${basePath}/leads`);
  });
  return (
    <Query q={q}>
      {({ lead, calls, meetings, followUps, deals, activity, messages = [] }) => (
        <LeadCallProvider leadId={lead._id} phone={lead.phone} contactName={lead.contactPerson} company={lead.company} enabled={Boolean(me.modules['comm.calls'])} basePath={basePath}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-start gap-3 border-b px-5 py-4">
            {!onClose && (
              <Button variant="ghost" size="sm" asChild><Link to={`${basePath}/leads`}><ArrowLeft className="mr-1 h-4 w-4" />Leads</Link></Button>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold">{lead.contactPerson}</h2>
                <StatusPill value={lead.temperature} />
              </div>
              <p className="truncate text-xs text-muted-foreground">{lead.company || lead.phone || lead.email || 'Lead'}</p>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <StageSelect className="w-36" value={lead.status} options={LEAD_STATUSES} onChange={(s) => status.mutate(s)} />
            {me.isSalesAdmin && (
              <Select className="w-44" value={lead.assignedEmployeeId || ''} onChange={(e) => e.target.value && assign.mutate(e.target.value)}>
                <option value="">Assign to…</option>
                {(team.data || []).filter((e) => e.status === 'active').map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={() => setModal('edit')}>Edit</Button>
            <Button variant="ghost" size="sm" className="text-error" title="Delete lead" onClick={() => confirm(`Delete lead “${lead.contactPerson}”?`) && archive.mutate(undefined)}><Trash2 className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {me.modules['comm.calls'] && <Button size="sm" variant="outline" onClick={() => setModal('call')}><Phone className="mr-1.5 h-3.5 w-3.5" />Log call</Button>}
            {me.modules['comm.followups'] && <Button size="sm" variant="outline" onClick={() => setModal('followup')}>Schedule follow-up</Button>}
            {me.modules['comm.meetings'] && <Button size="sm" variant="outline" onClick={() => setModal('meeting')}>Schedule meeting</Button>}
            {me.modules['comm.email_whatsapp'] && <Button size="sm" variant="outline" asChild><Link to={`${basePath}/messages?lead=${id}`}>Email / WhatsApp</Link></Button>}
            {me.modules['leads.qualification'] && <Button size="sm" variant="outline" onClick={() => setModal('qual')}>Qualification</Button>}
            {me.modules['sales.deals'] && <Button size="sm" onClick={() => setModal('deal')}>Create deal</Button>}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {me.modules['comm.calls'] && <Link className="text-primary hover:underline" to={`${basePath}/calls?lead=${id}`}>All calls →</Link>}
            {me.modules['comm.followups'] && <Link className="text-primary hover:underline" to={`${basePath}/follow-ups?lead=${id}`}>All follow-ups →</Link>}
            {me.modules['sales.deals'] && <Link className="text-primary hover:underline" to={`${basePath}/deals?lead=${id}`}>Deals for this lead →</Link>}
            {me.modules['comm.meetings'] && <Link className="text-primary hover:underline" to={`${basePath}/meetings?lead=${id}`}>Meetings →</Link>}
          </div>
          <SectionCard title="Details">
            <LeadPhoneRow phone={lead.phone} enabled={Boolean(me.modules['comm.calls'])} />
            <KeyValue items={[
              ['Company', lead.company || '—'], ['Email', lead.email || '—'], ['City', lead.city || '—'],
              ['Source', humanize(lead.source)], ['Industry', lead.industry || '—'], ['Priority', humanize(lead.priority)],
              ['Last contacted', fmtDateTime(lead.lastContactedAt)], ['Next follow-up', fmtDateTime(lead.nextFollowUpAt)],
              ['Requirement', lead.requirement || '—'],
            ]} />
          </SectionCard>
          <SectionCard title="Qualification">
            <KeyValue items={[
              ['Budget', lead.budget ? inr(lead.budget) : '—'], ['Timeline', lead.timeline || '—'], ['Decision maker', lead.decisionMaker || '—'],
              ['Business need', lead.businessNeed || '—'], ['Probability', `${lead.probability || 0}%`], ['Next action', lead.nextAction || '—'],
              ['Notes', lead.qualificationNotes || '—'],
            ]} />
          </SectionCard>
          <SectionCard title={`Deals (${deals.length})`}>
            <SimpleList rows={deals} empty="No deals yet." render={(d) => <><Link className="hover:underline" to={`${basePath}/deals/${d._id}`}>{d.dealName}</Link><span className="flex items-center gap-2">{inr(d.value)}<StatusPill value={d.stage} /></span></>} />
          </SectionCard>
          <SectionCard title="Call History" action={me.modules['comm.calls'] ? <Link className="text-xs hover:underline" to={`${basePath}/calls?lead=${id}`}>View all</Link> : undefined}>
            <CallHistory calls={calls} />
          </SectionCard>
          <SectionCard title={`Follow-ups (${followUps.length})`} action={me.modules['comm.followups'] ? <Link className="text-xs hover:underline" to={`${basePath}/follow-ups?lead=${id}`}>View all</Link> : undefined}>
            <SimpleList rows={followUps} empty="None scheduled." render={(f) => <><span>{f.notes || humanize(f.type)}</span><span className="flex items-center gap-2 text-xs text-muted-foreground">{fmtDateTime(f.dueAt)}<StatusPill value={f.status} /></span></>} />
          </SectionCard>
          <SectionCard title={`Meetings (${meetings.length})`}>
            <SimpleList rows={meetings} empty="No meetings." render={(m) => <><span>{m.title}</span><span className="flex items-center gap-2 text-xs text-muted-foreground">{fmtDateTime(m.startsAt)}<StatusPill value={m.status} /></span></>} />
          </SectionCard>
          <SectionCard title={`Email / WhatsApp (${messages.length})`}>
            <SimpleList rows={messages} empty="No messages logged." render={(m) => <><span><StatusPill value={m.channel} /> {m.subject || m.body?.slice(0, 80)}</span><span className="text-xs text-muted-foreground">{fmtDateTime(m.sentAt)}</span></>} />
          </SectionCard>
          <SectionCard title="Activity timeline"><SalesActivityList rows={activity} /></SectionCard>
          </div>

          <FormModal open={modal === 'edit'} onClose={close} title="Edit lead" fields={LEAD_FIELDS} initial={lead} onSubmit={(v) => { const { _id, organizationId, createdAt, updatedAt, __v, status: _s, assignedEmployeeId, recordStatus, createdBy, updatedBy, ...rest } = v; void _id; void organizationId; void createdAt; void updatedAt; void __v; void _s; void assignedEmployeeId; void recordStatus; void createdBy; void updatedBy; edit.mutate(Object.fromEntries(LEAD_FIELDS.map((f) => [f.name, rest[f.name]]).filter(([, x]) => x !== undefined))); }} pending={edit.isPending} />
          <FormModal open={modal === 'qual'} onClose={close} title="Qualification" initial={lead} pending={qual.isPending} onSubmit={(v) => qual.mutate(v)} fields={[
            { name: 'budget', label: 'Budget (₹)', type: 'number' }, { name: 'timeline', label: 'Timeline' }, { name: 'decisionMaker', label: 'Decision maker' },
            { name: 'businessNeed', label: 'Business need', type: 'textarea' }, { name: 'probability', label: 'Probability (%)', type: 'number' },
            { name: 'nextAction', label: 'Next action' }, { name: 'qualificationNotes', label: 'Notes', type: 'textarea' },
          ]} />
          <FormModal open={modal === 'call'} onClose={close} title="Log call" initial={{ outcome: 'interested' }} pending={call.isPending} onSubmit={(v) => call.mutate(v)} fields={[
            { name: 'outcome', label: 'Outcome', type: 'select', options: CALL_OUTCOMES, required: true }, { name: 'durationMinutes', label: 'Duration (min)', type: 'number' },
            { name: 'notes', label: 'Notes', type: 'textarea' }, { name: 'nextAction', label: 'Next action' },
            { name: 'nextFollowUpAt', label: 'Next follow-up', type: 'datetime', help: 'Creates a follow-up automatically.' },
          ]} />
          <FormModal open={modal === 'followup'} onClose={close} title="Schedule follow-up" initial={{ type: 'call', priority: 'medium' }} pending={followup.isPending} onSubmit={(v) => followup.mutate(v)} fields={FOLLOWUP_FIELDS} />
          <FormModal open={modal === 'meeting'} onClose={close} title="Schedule meeting" initial={{ type: 'discovery' }} pending={meeting.isPending} onSubmit={(v) => meeting.mutate(v)} fields={MEETING_FIELDS} />
          <FormModal open={modal === 'deal'} onClose={close} title="Create deal" initial={{ dealName: lead.company || lead.contactPerson, probability: 10, priority: 'medium' }} pending={deal.isPending} onSubmit={(v) => deal.mutate(v)} fields={DEAL_FIELDS} />
        </div>
        </LeadCallProvider>
      )}
    </Query>
  );
}

function LeadPhoneRow({ phone, enabled }: { phone?: string; enabled: boolean }) {
  const call = useLeadCall();
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Phone</p>
          <p className="text-sm font-medium">{phone || '—'}</p>
        </div>
        {enabled && phone && <Button size="sm" disabled={call.busy} onClick={call.start}>📞 Call</Button>}
        {call.status}
      </div>
      {call.panel}
    </div>
  );
}

function SalesActivityList({ rows }: { rows: Any[] }) {
  if (!rows?.length) return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((a) => (
        <li key={a._id} className="flex gap-3 text-sm">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
          <div className="min-w-0"><p>{a.title}</p><p className="text-xs text-muted-foreground">{a.actorName} · {fmtDateTime(a.createdAt)}</p></div>
        </li>
      ))}
    </ul>
  );
}

const FOLLOWUP_FIELDS: FieldDef[] = [
  { name: 'dueAt', label: 'Due', type: 'datetime', required: true },
  { name: 'type', label: 'Type', type: 'select', options: FOLLOWUP_TYPES },
  { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];
const MEETING_FIELDS: FieldDef[] = [
  { name: 'title', label: 'Title', required: true },
  { name: 'startsAt', label: 'When', type: 'datetime', required: true },
  { name: 'type', label: 'Type', type: 'select', options: MEETING_TYPES },
  { name: 'location', label: 'Location / link' },
  { name: 'participants', label: 'Participants' },
  { name: 'agenda', label: 'Agenda', type: 'textarea' },
];
const DEAL_FIELDS: FieldDef[] = [
  { name: 'dealName', label: 'Deal name', required: true },
  { name: 'value', label: 'Value (₹)', type: 'number' },
  { name: 'probability', label: 'Probability (%)', type: 'number' },
  { name: 'expectedCloseDate', label: 'Expected close', type: 'date' },
  { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

const DEAL_STAGE_ACCENT: Record<string, string> = {
  new: 'bg-slate-400',
  contacted: 'bg-sky-500',
  qualified: 'bg-blue-500',
  meeting: 'bg-teal-500',
  proposal: 'bg-indigo-500',
  negotiation: 'bg-amber-500',
  won: 'bg-emerald-500',
  lost: 'bg-rose-500',
};

// ---------------------------------------------------------------- deals
export function SalesDealsPage() {
  const me = useMe();
  const basePath = me.basePath;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterLead = searchParams.get('lead') || '';
  const [view, setView] = useState<'board' | 'list'>('board');
  const q = useSales<Any[]>('/deals?stage=all');
  const leads = useLeadOptions();
  const [open, setOpen] = useState(false);
  const create = useSalesAction((v: Any) => post('/deals', v), 'Deal created', () => setOpen(false));
  const move = useSalesAction((v: { id: string; stage: string }) => post(`/deals/${v.id}/stage`, { stage: v.stage }), 'Deal moved');
  return (
    <>
      <PageHeader
        title="Deals"
        description={filterLead ? 'Showing deals for one lead — clear the filter from the URL or open all deals from the sidebar.' : 'Track every opportunity across your pipeline — from first contact to close.'}
        action={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {filterLead && (
              <Button variant="outline" size="sm" asChild><Link to={`${basePath}/leads?lead=${filterLead}`}>Back to lead</Link></Button>
            )}
            <div className="inline-flex rounded-lg border border-black/10 bg-white/80 p-1 shadow-sm backdrop-blur">
              {([
                { id: 'board' as const, icon: LayoutGrid, label: 'Board' },
                { id: 'list' as const, icon: List, label: 'List' },
              ]).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-all',
                    view === v.id ? 'bg-foreground font-medium text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <v.icon className="h-3.5 w-3.5" />
                  {v.label}
                </button>
              ))}
            </div>
            <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New deal</Button>
          </div>
        }
      />
      <Query q={q}>
        {(allRows) => {
          const rows = filterLead ? allRows.filter((d) => leadIdOf(d) === filterLead) : allRows;
          const pipelineValue = rows.reduce((t, d) => t + (Number(d.value) || 0), 0);
          const openCount = rows.filter((d) => !['won', 'lost'].includes(d.stage)).length;
          return view === 'list' ? (
            <DataTable rows={rows} empty="No deals yet — create your first opportunity."
              columns={[
                { key: 'dealName', header: 'Deal', render: (r) => {
                  const lid = leadIdOf(r);
                  return (
                    <div>
                      <p className="font-medium">{r.dealName}</p>
                      {lid ? <Link className="text-xs text-muted-foreground hover:underline" to={leadHref(basePath, lid)}>{leadLabel(r.leadId)}</Link> : <p className="text-xs text-muted-foreground">{leadLabel(r.leadId)}</p>}
                    </div>
                  );
                } },
                { key: 'value', header: 'Value', render: (r) => inr(r.value) },
                { key: 'probability', header: 'Prob.', render: (r) => `${r.probability || 0}%` },
                { key: 'stage', header: 'Stage', className: 'w-px', render: (r) => (
                  <StageSelect value={r.stage} options={DEAL_STAGES} onChange={(stage) => move.mutate({ id: r._id, stage })} />
                ) },
                { key: 'expectedCloseDate', header: 'Close by', render: (r) => fmtDate(r.expectedCloseDate) },
              ]} />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-black/[0.06] bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Open deals</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums tracking-tight">{openCount}</p>
                </div>
                <div className="rounded-xl border border-black/[0.06] bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pipeline value</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums tracking-tight">{inr(pipelineValue)}</p>
                </div>
                <div className="rounded-xl border border-black/[0.06] bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Total in board</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums tracking-tight">{rows.length}</p>
                </div>
              </div>

              {!rows.length && (
                <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-black/10 bg-white/60 px-5 py-6 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-display text-base font-semibold tracking-tight">Your pipeline is ready</p>
                    <p className="mt-1 max-w-xl text-sm text-muted-foreground">Create a deal from a lead to start moving opportunities across stages.</p>
                  </div>
                  <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Create first deal</Button>
                </div>
              )}

              <div className="bda-deal-board -mx-1 flex gap-3 overflow-x-auto px-1 pb-3 pt-1">
                {DEAL_STAGES.map((stage) => {
                  const col = rows.filter((d) => d.stage === stage);
                  const total = col.reduce((t, d) => t + (Number(d.value) || 0), 0);
                  return (
                    <div
                      key={stage}
                      className="flex w-[280px] shrink-0 flex-col rounded-xl border border-black/[0.06] bg-white/70 shadow-sm backdrop-blur"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-black/[0.05] px-3 py-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 shrink-0 rounded-sm', DEAL_STAGE_ACCENT[stage] || 'bg-slate-400')} />
                            <p className="truncate text-sm font-semibold tracking-tight">{humanize(stage)}</p>
                          </div>
                          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                            {col.length} {col.length === 1 ? 'deal' : 'deals'} · {inr(total)}
                          </p>
                        </div>
                      </div>
                      <div className="flex min-h-[220px] flex-col gap-2.5 p-2.5">
                        {col.length === 0 ? (
                          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-black/[0.07] bg-black/[0.015] px-3 py-8 text-center">
                            <p className="text-xs text-muted-foreground">No deals in this stage</p>
                          </div>
                        ) : (
                          col.map((d) => (
                            <div
                              key={d._id}
                              className="group rounded-lg border border-black/[0.06] bg-white p-3.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-black/10 hover:shadow-md"
                            >
                              <Link to={`${basePath}/deals/${d._id}`} className="block text-sm font-semibold tracking-tight text-foreground group-hover:underline">
                                {d.dealName}
                              </Link>
                              {leadIdOf(d) ? (
                                <Link to={leadHref(basePath, leadIdOf(d))} className="mt-1 block truncate text-xs text-muted-foreground hover:underline">{leadLabel(d.leadId)}</Link>
                              ) : (
                                <p className="mt-1 truncate text-xs text-muted-foreground">{leadLabel(d.leadId)}</p>
                              )}
                              <div className="mt-3 flex items-end justify-between gap-2">
                                <div>
                                  <p className="font-display text-sm font-semibold tabular-nums">{inr(d.value)}</p>
                                  <p className="text-[11px] text-muted-foreground">{d.probability || 0}% probability</p>
                                </div>
                                {d.expectedCloseDate && (
                                  <p className="text-[11px] text-muted-foreground">Close {fmtDate(d.expectedCloseDate)}</p>
                                )}
                              </div>
                              {me.modules['sales.pipeline'] && (
                                <Select
                                  className="mt-3 h-8 border-black/10 bg-surface-soft/80 text-xs"
                                  value={d.stage}
                                  onChange={(e) => move.mutate({ id: d._id, stage: e.target.value })}
                                >
                                  {DEAL_STAGES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                                </Select>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }}
      </Query>
      <FormModal open={open} onClose={() => setOpen(false)} title="New deal" initial={{ probability: 10, priority: 'medium', ...(filterLead ? { leadId: filterLead } : {}) }} pending={create.isPending} onSubmit={(v) => create.mutate(v)}
        fields={[{ name: 'leadId', label: 'Lead', type: 'select', options: leads }, ...DEAL_FIELDS]} />
    </>
  );
}

export function SalesDealDetailPage() {
  const { id } = useParams();
  const me = useMe();
  const basePath = me.basePath;
  const navigate = useNavigate();
  const q = useSales<Any>(`/deals/${id}`);
  const [modal, setModal] = useState<'' | 'edit' | 'neg' | 'close' | 'approval' | 'quote' | 'proposal'>('');
  const close = () => setModal('');
  const stage = useSalesAction((s: string) => post(`/deals/${id}/stage`, { stage: s }), 'Stage updated');
  const edit = useSalesAction((v: Any) => api.data(`/sales-crm/deals/${id}`, 'PATCH', v), 'Deal updated', close);
  const neg = useSalesAction((v: Any) => post(`/deals/${id}/negotiation`, v), 'Negotiation saved', close);
  const closeDeal = useSalesAction((v: Any) => post(`/deals/${id}/close`, v), 'Deal closed', close);
  const approval = useSalesAction((v: Any) => post('/approvals', { ...v, dealId: id }), 'Approval requested', close);
  const proposal = useSalesAction((v: Any) => post('/proposals', { ...v, dealId: id }), 'Proposal created', close);
  const archive = useSalesAction(() => api.data(`/sales-crm/deals/${id}`, 'DELETE'), 'Deal archived', () => navigate(`${basePath}/deals`));
  return (
    <Query q={q}>
      {({ deal, lead, quotations, proposals, approvals, activity }) => (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" asChild><Link to={`${basePath}/deals`}><ArrowLeft className="mr-1 h-4 w-4" />Deals</Link></Button>
            <h2 className="text-lg font-semibold">{deal.dealName}</h2>
            <StatusPill value={deal.stage} />
            <div className="ml-auto flex flex-wrap gap-2">
              {me.modules['sales.pipeline'] && <Select className="w-40" value={deal.stage} onChange={(e) => stage.mutate(e.target.value)}>{DEAL_STAGES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select>}
              <Button variant="outline" onClick={() => setModal('edit')}>Edit</Button>
              <Button variant="ghost" className="text-error" onClick={() => confirm('Archive this deal?') && archive.mutate(undefined)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {me.modules['sales.negotiation'] && <Button size="sm" variant="outline" onClick={() => setModal('neg')}>Negotiation</Button>}
            {me.modules['docs.quotations'] && <Button size="sm" variant="outline" onClick={() => setModal('quote')}>New quotation</Button>}
            {me.modules['docs.proposals'] && <Button size="sm" variant="outline" onClick={() => setModal('proposal')}>New proposal</Button>}
            {me.modules['docs.sales_documents'] && <Button size="sm" variant="outline" asChild><Link to={`/sow-templates?dealId=${id}&client=${encodeURIComponent(lead?.company || '')}&project=${encodeURIComponent(deal.dealName || '')}`}>Create SOW</Link></Button>}
            {me.modules['admin.approvals'] && <Button size="sm" variant="outline" onClick={() => setModal('approval')}>Request approval</Button>}
            {me.modules['sales.closure'] && !['won', 'lost'].includes(deal.stage) && <Button size="sm" onClick={() => setModal('close')}>Close deal</Button>}
          </div>
          <PageGrid cols="2">
            <SectionCard title="Deal">
              <KeyValue items={[
                ['Value', inr(deal.value)], ['Probability', `${deal.probability || 0}%`], ['Expected close', fmtDate(deal.expectedCloseDate)],
                ['Priority', humanize(deal.priority)], ['Lead', lead ? <Link className="hover:underline" to={leadHref(basePath, lead._id)}>{leadLabel(lead)}</Link> : '—'],
                ...(deal.closedAt ? [['Closed', fmtDate(deal.closedAt)], ['Final offer', inr(deal.finalOffer)]] as [string, React.ReactNode][] : []),
                ...(deal.stage === 'lost' ? [['Lost reason', humanize(deal.lostReason)]] as [string, React.ReactNode][] : []),
                ['Notes', deal.notes || '—'],
              ]} />
            </SectionCard>
            <SectionCard title="Negotiation">
              <KeyValue items={[
                ['Competitor', deal.competitor || '—'], ['Current offer', deal.currentOffer ? inr(deal.currentOffer) : '—'],
                ['Discount requested', deal.discountRequested ? `${deal.discountRequested}%` : '—'], ['Discount approved', deal.discountApproved ? `${deal.discountApproved}%` : '—'],
              ]} />
            </SectionCard>
            <SectionCard title={`Quotations (${quotations.length})`}>
              <SimpleList rows={quotations} empty="No quotations." render={(x) => <><span className="font-mono text-xs">{x.quotationNumber}</span><span className="flex items-center gap-2">{inr(x.total)}<StatusPill value={x.status} /></span></>} />
            </SectionCard>
            <SectionCard title={`Proposals (${proposals.length})`}>
              <SimpleList rows={proposals} empty="No proposals." render={(x) => <><span>{x.title}</span><span className="flex items-center gap-2">{inr(x.pricing)}<StatusPill value={x.status} /></span></>} />
            </SectionCard>
            <SectionCard title={`Approvals (${approvals.length})`}>
              <SimpleList rows={approvals} empty="No approval requests." render={(x) => <><span>{humanize(x.type)} {x.requestedValue && `· ${x.requestedValue}`}</span><StatusPill value={x.status} /></>} />
            </SectionCard>
            <SectionCard title="Activity"><SalesActivityList rows={activity} /></SectionCard>
          </PageGrid>

          <FormModal open={modal === 'edit'} onClose={close} title="Edit deal" fields={DEAL_FIELDS} initial={{ ...deal, expectedCloseDate: deal.expectedCloseDate?.slice(0, 10) }} pending={edit.isPending}
            onSubmit={(v) => edit.mutate(Object.fromEntries(DEAL_FIELDS.map((f) => [f.name, v[f.name]]).filter(([, x]) => x !== undefined)))} />
          <FormModal open={modal === 'neg'} onClose={close} title="Negotiation" initial={deal} pending={neg.isPending} onSubmit={(v) => neg.mutate(v)} fields={[
            { name: 'competitor', label: 'Competitor' }, { name: 'currentOffer', label: 'Current offer (₹)', type: 'number' },
            { name: 'discountRequested', label: 'Discount requested (%)', type: 'number' }, { name: 'discountApproved', label: 'Discount approved (%)', type: 'number' },
            { name: 'notes', label: 'Notes', type: 'textarea' },
          ]} />
          <CloseDealModal open={modal === 'close'} onClose={close} deal={deal} pending={closeDeal.isPending} onSubmit={(v) => closeDeal.mutate(v)} />
          <FormModal open={modal === 'approval'} onClose={close} title="Request approval" initial={{ type: 'discount' }} pending={approval.isPending} onSubmit={(v) => approval.mutate(v)} fields={[
            { name: 'type', label: 'Type', type: 'select', options: ['discount', 'quotation', 'proposal', 'deal'], required: true },
            { name: 'requestedValue', label: 'Requested value', placeholder: 'e.g. 10%' }, { name: 'reason', label: 'Reason', type: 'textarea' },
          ]} />
          <FormModal open={modal === 'proposal'} onClose={close} title="New proposal" initial={{ title: `Proposal — ${deal.dealName}`, pricing: deal.value }} pending={proposal.isPending} onSubmit={(v) => proposal.mutate(v)} fields={PROPOSAL_FIELDS} />
          <QuotationModal open={modal === 'quote'} onClose={close} dealId={deal._id} customerName={lead?.company || lead?.contactPerson || ''} />
        </>
      )}
    </Query>
  );
}

function CloseDealModal({ open, onClose, deal, onSubmit, pending }: { open: boolean; onClose: () => void; deal: Any; onSubmit: (v: Any) => void; pending: boolean }) {
  const [outcome, setOutcome] = useState<'won' | 'lost'>('won');
  const fields: FieldDef[] = outcome === 'won'
    ? [{ name: 'finalOffer', label: 'Final amount (₹)', type: 'number', required: true }, { name: 'paymentStatus', label: 'Payment status', type: 'select', options: ['pending', 'advance_received', 'paid'] }]
    : [{ name: 'lostReason', label: 'Reason', type: 'select', options: LOST_REASONS, required: true }, { name: 'lostNotes', label: 'Notes', type: 'textarea' }];
  return (
    <FormModal key={outcome} open={open} onClose={onClose} title="Close deal" fields={fields} initial={{ finalOffer: deal.currentOffer || deal.value }} pending={pending} submitLabel={outcome === 'won' ? 'Mark won' : 'Mark lost'}
      onSubmit={(v) => onSubmit({ ...v, outcome })}>
      <div className="inline-flex rounded-md border p-0.5">
        {(['won', 'lost'] as const).map((o) => <button key={o} type="button" onClick={() => setOutcome(o)} className={cn('rounded px-4 py-1 text-sm', outcome === o ? 'bg-secondary font-medium' : 'text-muted-foreground')}>{humanize(o)}</button>)}
      </div>
    </FormModal>
  );
}

// ---------------------------------------------------------------- customers, calls, meetings, follow-ups
export function SalesCustomersPage() {
  const basePath = useMe().basePath;
  const q = useSales<Any[]>('/customers');
  return (
    <Query q={q}>
      {(rows) => (
        <DataTable rows={rows} empty="Customers appear here when a deal is won."
          columns={[
            { key: 'name', header: 'Customer', render: (r) => <div><p className="font-medium">{r.company || r.name}</p><p className="text-xs text-muted-foreground">{r.name}</p></div> },
            { key: 'contact', header: 'Contact', render: (r) => [r.email, r.phone].filter(Boolean).join(' · ') || '—' },
            { key: 'sourceLeadId', header: 'Source lead', render: (r) => r.sourceLeadId ? <Link className="hover:underline" to={leadHref(basePath, String(r.sourceLeadId))}>Open lead</Link> : '—' },
            { key: 'city', header: 'City', render: (r) => r.city || '—' },
            { key: 'totalRevenue', header: 'Revenue', render: (r) => inr(r.totalRevenue) },
            { key: 'customerSince', header: 'Since', render: (r) => fmtDate(r.customerSince || r.createdAt) },
          ]} />
      )}
    </Query>
  );
}

export function SalesCallsPage() {
  const basePath = useMe().basePath;
  const [searchParams] = useSearchParams();
  const filterLead = searchParams.get('lead') || '';
  const [view, setView] = useState<'all' | 'connected'>('all');
  const q = useSales<Any[]>('/calls');
  const leads = useLeadOptions();
  const [open, setOpen] = useState(false);
  const create = useSalesAction((v: Any) => post('/calls', v), 'Call logged', () => setOpen(false));
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {filterLead && <Button variant="outline" size="sm" asChild><Link to={leadHref(basePath, filterLead)}>Back to lead</Link></Button>}
        <div className="inline-flex rounded-lg border p-0.5">
          {(['all', 'connected'] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={cn('rounded-md px-3 py-1.5 text-sm', view === v ? 'bg-foreground text-background' : 'text-muted-foreground')}>
              {v === 'all' ? 'All dialed' : 'Connected'}
            </button>
          ))}
        </div>
        <Button className="ml-auto" onClick={() => setOpen(true)}><Phone className="mr-2 h-4 w-4" />Log call</Button>
      </div>
      <Query q={q}>
        {(allRows) => {
          const scoped = filterLead ? allRows.filter((r) => leadIdOf(r) === filterLead) : allRows;
          const connected = scoped.filter((r) => r.outcome === 'connected');
          const rows = view === 'connected' ? connected : scoped;
          return (
            <>
              <PageGrid cols="2">
                <StatCard label="Dialed" value={scoped.length} hint="Every call you logged" />
                <StatCard label="Connected" value={connected.length} hint="Calls marked connected" tone="success" />
              </PageGrid>
              <DataTable rows={rows} empty={view === 'connected' ? 'No connected calls yet.' : 'No calls logged yet.'}
                columns={[
                  { key: 'lead', header: 'Lead', render: (r) => {
                    const lid = leadIdOf(r);
                    return lid ? <Link className="hover:underline" to={leadHref(basePath, lid)}>{leadLabel(r.leadId)}</Link> : '—';
                  } },
                  { key: 'outcome', header: 'Outcome', render: (r) => <StatusPill value={r.outcome} /> },
                  { key: 'durationMinutes', header: 'Duration', render: (r) => formatStoredDuration(r) || '—' },
                  { key: 'notes', header: 'Notes', render: (r) => <span className="line-clamp-1">{r.notes || '—'}</span> },
                  { key: 'calledAt', header: 'When', render: (r) => fmtDateTime(r.calledAt || r.createdAt) },
                ]} />
            </>
          );
        }}
      </Query>
      <FormModal open={open} onClose={() => setOpen(false)} title="Log call" initial={{ outcome: 'connected', ...(filterLead ? { leadId: filterLead } : {}) }} pending={create.isPending} onSubmit={(v) => create.mutate(v)} fields={[
        { name: 'leadId', label: 'Lead', type: 'select', options: leads }, { name: 'outcome', label: 'Outcome', type: 'select', options: [{ value: 'connected', label: 'Connected' }, ...CALL_OUTCOMES], required: true },
        { name: 'durationMinutes', label: 'Duration (min)', type: 'number' }, { name: 'notes', label: 'Notes', type: 'textarea' },
        { name: 'nextAction', label: 'Next action' }, { name: 'nextFollowUpAt', label: 'Next follow-up', type: 'datetime' },
      ]} />
    </>
  );
}

export function SalesMeetingsPage() {
  const basePath = useMe().basePath;
  const [searchParams] = useSearchParams();
  const filterLead = searchParams.get('lead') || '';
  const q = useSales<Any[]>('/meetings');
  const leads = useLeadOptions();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Any | null>(null);
  const create = useSalesAction((v: Any) => post('/meetings', v), 'Meeting scheduled', () => setOpen(false));
  const update = useSalesAction((v: Any) => post(`/meetings/${editing!._id}/status`, v), 'Meeting updated', () => setEditing(null));
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {filterLead && <Button variant="outline" size="sm" asChild><Link to={leadHref(basePath, filterLead)}>Back to lead</Link></Button>}
        <Button className="ml-auto" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Schedule meeting</Button>
      </div>
      <Query q={q}>
        {(allRows) => {
          const rows = filterLead ? allRows.filter((r) => leadIdOf(r) === filterLead) : allRows;
          return (
          <DataTable rows={rows} empty="No meetings." onRowClick={setEditing}
            columns={[
              { key: 'title', header: 'Meeting', render: (r) => {
                const lid = leadIdOf(r);
                return (
                  <div>
                    <p className="font-medium">{r.title}</p>
                    {lid ? <Link className="text-xs text-muted-foreground hover:underline" to={leadHref(basePath, lid)} onClick={(e) => e.stopPropagation()}>{leadLabel(r.leadId)}</Link> : <p className="text-xs text-muted-foreground">{leadLabel(r.leadId)}</p>}
                  </div>
                );
              } },
              { key: 'type', header: 'Type', render: (r) => humanize(r.type) },
              { key: 'startsAt', header: 'When', render: (r) => fmtDateTime(r.startsAt) },
              { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
            ]} />
          );
        }}
      </Query>
      <FormModal open={open} onClose={() => setOpen(false)} title="Schedule meeting" initial={{ type: 'discovery', ...(filterLead ? { leadId: filterLead } : {}) }} pending={create.isPending} onSubmit={(v) => create.mutate(v)}
        fields={[{ name: 'leadId', label: 'Lead', type: 'select', options: leads }, ...MEETING_FIELDS]} />
      <FormModal open={!!editing} onClose={() => setEditing(null)} title={editing?.title || ''} initial={editing || {}} pending={update.isPending}
        onSubmit={(v) => update.mutate({ status: v.status, notes: v.notes, decisions: v.decisions, nextSteps: v.nextSteps })} fields={[
          { name: 'status', label: 'Status', type: 'select', options: MEETING_STATUSES, required: true },
          { name: 'notes', label: 'Notes', type: 'textarea' }, { name: 'decisions', label: 'Decisions', type: 'textarea' }, { name: 'nextSteps', label: 'Next steps', type: 'textarea' },
        ]} />
    </>
  );
}

export function SalesFollowUpsPage() {
  const basePath = useMe().basePath;
  const [searchParams] = useSearchParams();
  const filterLead = searchParams.get('lead') || '';
  const [status, setStatus] = useState('pending');
  const q = useSales<Any[]>(`/follow-ups?status=${status}`);
  const leads = useLeadOptions();
  const [open, setOpen] = useState(false);
  const create = useSalesAction((v: Any) => post('/follow-ups', v), 'Follow-up scheduled', () => setOpen(false));
  const mark = useSalesAction((v: { id: string; status: string }) => post(`/follow-ups/${v.id}/status`, { status: v.status }), 'Updated');
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {filterLead && <Button variant="outline" size="sm" asChild><Link to={leadHref(basePath, filterLead)}>Back to lead</Link></Button>}
        <Select className="w-40" value={status} onChange={(e) => setStatus(e.target.value)}>{['pending', 'completed', 'missed', 'cancelled', 'all'].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select>
        <Button className="ml-auto" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Schedule follow-up</Button>
      </div>
      <Query q={q}>
        {(allRows) => {
          const rows = filterLead ? allRows.filter((r) => leadIdOf(r) === filterLead) : allRows;
          return (
          <DataTable rows={rows} empty="No follow-ups."
            columns={[
              { key: 'lead', header: 'Lead', render: (r) => {
                const lid = leadIdOf(r);
                return lid ? <Link className="hover:underline" to={leadHref(basePath, lid)}>{leadLabel(r.leadId)}</Link> : '—';
              } },
              { key: 'type', header: 'Type', render: (r) => humanize(r.type) },
              { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
              { key: 'dueAt', header: 'Due', render: (r) => <span className={cn(r.status === 'pending' && new Date(r.dueAt) < new Date() && 'font-medium text-error')}>{fmtDateTime(r.dueAt)}</span> },
              { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
              { key: 'x', header: '', className: 'w-px', render: (r) => r.status === 'pending' && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-success" title="Done" onClick={() => mark.mutate({ id: r._id, status: 'completed' })}><Check className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Missed" onClick={() => mark.mutate({ id: r._id, status: 'missed' })}><X className="h-4 w-4" /></Button>
                </div>
              ) },
            ]} />
          );
        }}
      </Query>
      <FormModal open={open} onClose={() => setOpen(false)} title="Schedule follow-up" initial={{ type: 'call', priority: 'medium', ...(filterLead ? { leadId: filterLead } : {}) }} pending={create.isPending} onSubmit={(v) => create.mutate(v)}
        fields={[{ name: 'leadId', label: 'Lead', type: 'select', options: leads }, ...FOLLOWUP_FIELDS]} />
    </>
  );
}

// ---------------------------------------------------------------- quotations + proposals
function QuotationModal({ open, onClose, dealId, customerName = '' }: { open: boolean; onClose: () => void; dealId?: string; customerName?: string }) {
  const [form, setForm] = useState<Any>({});
  const [items, setItems] = useState<Any[]>([]);
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) { setLastOpen(open); if (open) { setForm({ customerName, discountPercent: 0, taxPercent: 18, validUntil: '', terms: '', notes: '' }); setItems([{ name: '', quantity: 1, price: 0 }]); } }
  const create = useSalesAction(() => post('/quotations', { ...form, dealId, items: items.filter((i) => i.name.trim()), validUntil: form.validUntil || undefined }), 'Quotation created', onClose);
  const subtotal = items.reduce((t, i) => t + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);
  const total = Math.round(subtotal * (1 - (Number(form.discountPercent) || 0) / 100) * (1 + (Number(form.taxPercent) || 0) / 100));
  return (
    <SimpleModal open={open} onClose={onClose} title="New quotation">
      <FormStack>
        <FieldInput field={{ name: 'customerName', label: 'Customer name', required: true }} value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} />
        <div className="flex flex-col gap-2">
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <Input placeholder="Item" value={it.name} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <Input className="w-20" type="number" placeholder="Qty" value={it.quantity} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
              <Input className="w-28" type="number" placeholder="Price" value={it.price} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
              <Button size="icon" variant="ghost" className="shrink-0" disabled={items.length === 1} onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="self-start" onClick={() => setItems([...items, { name: '', quantity: 1, price: 0 }])}><Plus className="mr-1 h-3.5 w-3.5" />Item</Button>
        </div>
        <FormRow>
          <FieldInput field={{ name: 'discountPercent', label: 'Discount (%)', type: 'number' }} value={form.discountPercent} onChange={(v) => setForm({ ...form, discountPercent: v })} />
          <FieldInput field={{ name: 'taxPercent', label: 'GST (%)', type: 'number' }} value={form.taxPercent} onChange={(v) => setForm({ ...form, taxPercent: v })} />
        </FormRow>
        <FieldInput field={{ name: 'validUntil', label: 'Valid until', type: 'date' }} value={form.validUntil} onChange={(v) => setForm({ ...form, validUntil: v })} />
        <FieldInput field={{ name: 'terms', label: 'Terms', type: 'textarea' }} value={form.terms} onChange={(v) => setForm({ ...form, terms: v })} />
        <div className="flex justify-between rounded-md bg-surface-soft px-3 py-2 text-sm"><span className="text-muted-foreground">Subtotal {inr(subtotal)}</span><span className="font-semibold">Total {inr(total)}</span></div>
        <FormActions>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.customerName?.trim() || !items.some((i) => i.name.trim()) || create.isPending} onClick={() => create.mutate(undefined)}>{create.isPending ? 'Saving…' : 'Create quotation'}</Button>
        </FormActions>
      </FormStack>
    </SimpleModal>
  );
}

export function SalesQuotationsPage() {
  const q = useSales<Any[]>('/quotations');
  const [open, setOpen] = useState(false);
  const status = useSalesAction((v: { id: string; status: string }) => post(`/quotations/${v.id}/status`, { status: v.status }), 'Status updated');
  const dup = useSalesAction((id: string) => post(`/quotations/${id}/duplicate`), 'New version created');
  return (
    <>
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New quotation</Button></div>
      <Query q={q}>
        {(rows) => (
          <DataTable rows={rows} empty="No quotations yet."
            columns={[
              { key: 'quotationNumber', header: 'Number', render: (r) => <span className="font-mono text-xs font-semibold">{r.quotationNumber}{r.version > 1 && ` v${r.version}`}</span> },
              { key: 'customerName', header: 'Customer', render: (r) => r.customerName },
              { key: 'total', header: 'Total', render: (r) => <div><p className="font-medium">{inr(r.total)}</p><p className="text-xs text-muted-foreground">{r.discountPercent ? `${r.discountPercent}% off · ` : ''}{r.taxPercent}% GST</p></div> },
              { key: 'validUntil', header: 'Valid until', render: (r) => fmtDate(r.validUntil) },
              { key: 'status', header: 'Status', render: (r) => <Select className="h-8 w-40 text-xs" value={r.status} onChange={(e) => status.mutate({ id: r._id, status: e.target.value })}>{QUOTATION_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select> },
              { key: 'x', header: '', className: 'w-px', render: (r) => <Button size="icon" variant="ghost" className="h-8 w-8" title="Revise (new version)" onClick={() => dup.mutate(r._id)}><Copy className="h-3.5 w-3.5" /></Button> },
            ]} />
        )}
      </Query>
      <QuotationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const PROPOSAL_FIELDS: FieldDef[] = [
  { name: 'title', label: 'Title', required: true },
  { name: 'pricing', label: 'Pricing (₹)', type: 'number' },
  { name: 'timeline', label: 'Timeline' },
  { name: 'scope', label: 'Scope', type: 'textarea' },
  { name: 'terms', label: 'Terms', type: 'textarea' },
];

export function SalesProposalsPage() {
  const me = useMe();
  const q = useSales<Any[]>('/proposals');
  const deals = useSales<Any[]>('/deals?stage=open', me.modules['sales.deals']);
  const [open, setOpen] = useState(false);
  const create = useSalesAction((v: Any) => post('/proposals', v), 'Proposal created', () => setOpen(false));
  const status = useSalesAction((v: { id: string; status: string }) => post(`/proposals/${v.id}/status`, { status: v.status }), 'Status updated');
  return (
    <>
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New proposal</Button></div>
      <Query q={q}>
        {(rows) => (
          <DataTable rows={rows} empty="No proposals yet."
            columns={[
              { key: 'title', header: 'Proposal', render: (r) => <div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.dealId?.dealName || '—'}</p></div> },
              { key: 'pricing', header: 'Pricing', render: (r) => inr(r.pricing) },
              { key: 'timeline', header: 'Timeline', render: (r) => r.timeline || '—' },
              { key: 'status', header: 'Status', render: (r) => <Select className="h-8 w-36 text-xs" value={r.status} onChange={(e) => status.mutate({ id: r._id, status: e.target.value })}>{PROPOSAL_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select> },
              { key: 'createdAt', header: 'Created', render: (r) => fmtDate(r.createdAt) },
            ]} />
        )}
      </Query>
      <FormModal open={open} onClose={() => setOpen(false)} title="New proposal" pending={create.isPending} onSubmit={(v) => create.mutate(v)}
        fields={[{ name: 'dealId', label: 'Deal', type: 'select', options: (deals.data || []).map((d) => ({ value: d._id, label: d.dealName })) }, ...PROPOSAL_FIELDS]} />
    </>
  );
}

// ---------------------------------------------------------------- tasks + calendar
export function SalesTasksPage() {
  const me = useMe();
  const q = useSales<Any[]>('/tasks');
  const team = useSales<Any[]>('/employees', me.isSalesAdmin);
  const [open, setOpen] = useState(false);
  const create = useSalesAction((v: Any) => post('/tasks', v), 'Task created', () => setOpen(false));
  const status = useSalesAction((v: { id: string; status: string }) => post(`/tasks/${v.id}/status`, { status: v.status }), 'Task updated');
  return (
    <>
      <PageHeader title="Tasks" description={me.isSalesAdmin ? 'Assign work to a sales person — it shows on their BDA My Day and Tasks.' : 'Tasks assigned to you, including work from the company admin.'} />
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New task</Button></div>
      <Query q={q}>
        {(rows) => (
          <DataTable rows={rows} empty="No tasks assigned to you yet."
            columns={[
              { key: 'title', header: 'Task', render: (r) => <div><p className={cn('font-medium', r.status === 'completed' && 'text-muted-foreground line-through')}>{r.title}</p>{r.description && <p className="line-clamp-1 text-xs text-muted-foreground">{r.description}</p>}</div> },
              ...(me.isSalesAdmin ? [{ key: 'assignedName', header: 'Assigned to', render: (r: Any) => r.assignedName || '—' }] : []),
              { key: 'priority', header: 'Priority', render: (r) => <StatusPill value={r.priority} /> },
              { key: 'dueDate', header: 'Due', render: (r) => fmtDate(r.dueDate) },
              { key: 'status', header: 'Status', render: (r) => (
                <Select className={cn('h-8 w-36 text-xs', r.status === 'overdue' && 'border-error text-error')} value={r.status === 'overdue' ? '' : r.status} onChange={(e) => status.mutate({ id: r._id, status: e.target.value })}>
                  {r.status === 'overdue' && <option value="">Overdue</option>}
                  {TASK_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                </Select>
              ) },
            ]} />
        )}
      </Query>
      <FormModal open={open} onClose={() => setOpen(false)} title="New task" initial={{ priority: 'medium' }} pending={create.isPending} onSubmit={(v) => create.mutate(v)} fields={[
        { name: 'title', label: 'Title', required: true }, { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES }, { name: 'dueDate', label: 'Due date', type: 'date' },
        ...(me.isSalesAdmin ? [{ name: 'employeeId', label: 'Assign to', type: 'select', required: true, options: (team.data || []).map((e) => ({ value: e._id, label: e.name })) } as FieldDef] : []),
      ]} />
    </>
  );
}

export function SalesCalendarPage() {
  const q = useSales<Any[]>('/calendar');
  const days = useMemo(() => {
    const map = new Map<string, Any[]>();
    for (const e of q.data || []) {
      const k = new Date(e.at).toDateString();
      map.set(k, [...(map.get(k) || []), e]);
    }
    return [...map.entries()];
  }, [q.data]);
  return (
    <Query q={q}>
      {() => days.length ? (
        <div className="flex flex-col gap-4">
          {days.map(([day, events]) => (
            <SectionCard key={day} title={fmtDate(day)}>
              <ul className="divide-y">
                {events.map((e) => (
                  <li key={`${e.kind}-${e.id}`} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-16 shrink-0 text-xs text-muted-foreground">{new Date(e.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    <StatusPill value={humanize(e.kind)} tone={e.kind === 'meeting' ? 'blue' : e.kind === 'task' ? 'purple' : 'amber'} />
                    <span className="flex-1">{e.title}</span>
                    <StatusPill value={e.status} />
                  </li>
                ))}
              </ul>
            </SectionCard>
          ))}
        </div>
      ) : <SectionCard><p className="py-6 text-center text-sm text-muted-foreground">Nothing scheduled in the next five weeks.</p></SectionCard>}
    </Query>
  );
}

// ---------------------------------------------------------------- approvals
export function SalesApprovalsPage() {
  const me = useMe();
  const q = useSales<Any[]>('/approvals');
  const [deciding, setDeciding] = useState<{ row: Any; decision: 'approved' | 'rejected' } | null>(null);
  const decide = useSalesAction((v: Any) => post(`/approvals/${deciding!.row._id}/decide`, { decision: deciding!.decision, ...v }), 'Decision saved', () => setDeciding(null));
  return (
    <>
      <Query q={q}>
        {(rows) => (
          <DataTable rows={rows} empty="No approval requests."
            columns={[
              { key: 'type', header: 'Request', render: (r) => <div><p className="font-medium">{humanize(r.type)}{r.requestedValue && ` · ${r.requestedValue}`}</p><p className="text-xs text-muted-foreground">{r.dealId?.dealName || '—'}</p></div> },
              { key: 'requesterName', header: 'Requested by', render: (r) => r.requesterName || '—' },
              { key: 'reason', header: 'Reason', render: (r) => <span className="line-clamp-2">{r.reason || '—'}</span> },
              { key: 'status', header: 'Status', render: (r) => <div><StatusPill value={r.status} />{r.reviewerComment && <p className="mt-1 text-xs text-muted-foreground">{r.reviewerComment}</p>}</div> },
              { key: 'createdAt', header: 'When', render: (r) => fmtDate(r.createdAt) },
              { key: 'x', header: '', className: 'w-px', render: (r) => me.isSalesAdmin && r.status === 'pending' && (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => setDeciding({ row: r, decision: 'approved' })}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => setDeciding({ row: r, decision: 'rejected' })}>Reject</Button>
                </div>
              ) },
            ]} />
        )}
      </Query>
      <FormModal open={!!deciding} onClose={() => setDeciding(null)} title={deciding?.decision === 'approved' ? 'Approve request' : 'Reject request'} pending={decide.isPending}
        submitLabel={deciding?.decision === 'approved' ? 'Approve' : 'Reject'} onSubmit={(v) => decide.mutate(v)} fields={[{ name: 'reviewerComment', label: 'Comment', type: 'textarea' }]} />
    </>
  );
}

// ---------------------------------------------------------------- attendance + work status
const timeOf = (d?: string) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');
const fmtMins = (n?: number | null) => {
  if (n == null) return '—';
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

export function SalesAttendancePage() {
  const me = useMe();
  const [date, setDate] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const q = useSales<Any>(`/attendance${me.isSalesAdmin && date ? `?date=${date}` : ''}`);
  const history = useSales<{ rows: Any[] }>('/attendance/history', me.isSalesAdmin);
  const checkIn = useSalesAction(() => post('/attendance/check-in'), 'Checked in');
  return (
    <Query q={q}>
      {(d) => me.isSalesAdmin ? (
        <>
          <PageHeader title="Attendance & timings" description="Today’s check-in/out plus the last 30 days of BDA hours." />
          <div className="flex items-center gap-3">
            <Input type="date" className="w-44" value={date || d.date} onChange={(e) => setDate(e.target.value)} />
            <span className="text-sm text-muted-foreground">{d.present} of {d.total} checked in</span>
          </div>
          <DataTable rows={d.rows.map((r: Any) => ({ ...r, _id: r.employeeId }))} empty="No BDAs yet. Create a sales login from BDA settings."
            columns={[
              { key: 'name', header: 'Employee', render: (r) => <div><p className="font-medium">{r.name}</p><p className="font-mono text-xs text-muted-foreground">{r.employeeCode}</p></div> },
              { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
              { key: 'checkInAt', header: 'Check in', render: (r) => timeOf(r.checkInAt) },
              { key: 'checkOutAt', header: 'Check out', render: (r) => timeOf(r.checkOutAt) },
              { key: 'durationMinutes', header: 'Hours', render: (r) => fmtMins(r.durationMinutes) },
              { key: 'remarks', header: 'Remarks', render: (r) => <span className="line-clamp-2 max-w-xs text-xs">{r.remarks || '—'}</span> },
            ]} />
          <SectionCard title="Timing history (30 days)">
            <DataTable rows={history.data?.rows || []} empty="No attendance recorded yet."
              columns={[
                { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
                { key: 'name', header: 'BDA', render: (r) => <div><p className="font-medium">{r.name}</p><p className="font-mono text-xs text-muted-foreground">{r.employeeCode}</p></div> },
                { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
                { key: 'checkInAt', header: 'In', render: (r) => timeOf(r.checkInAt) },
                { key: 'checkOutAt', header: 'Out', render: (r) => timeOf(r.checkOutAt) },
                { key: 'durationMinutes', header: 'Hours', render: (r) => fmtMins(r.durationMinutes) },
                { key: 'remarks', header: 'Remarks', render: (r) => <span className="line-clamp-2 max-w-xs text-xs">{r.remarks || '—'}</span> },
              ]} />
          </SectionCard>
        </>
      ) : (
        <>
          <SectionCard title="Today">
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-sm"><span className="text-muted-foreground">In:</span> {timeOf(d.today?.checkInAt)} <span className="ml-3 text-muted-foreground">Out:</span> {timeOf(d.today?.checkOutAt)}</div>
              <div className="ml-auto flex gap-2">
                {!d.today?.checkInAt && <Button onClick={() => checkIn.mutate(undefined)} disabled={checkIn.isPending}><LogIn className="mr-2 h-4 w-4" />Check in</Button>}
                {!d.today?.checkOutAt && <Button variant="outline" onClick={() => setCheckoutOpen(true)}><LogOut className="mr-2 h-4 w-4" />Check out</Button>}
              </div>
            </div>
            {d.today?.checkoutRemarks && <p className="mt-3 text-sm text-muted-foreground">Remarks: {d.today.checkoutRemarks}</p>}
          </SectionCard>
          <DataTable rows={d.history} empty="No attendance yet."
            columns={[
              { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
              { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
              { key: 'checkInAt', header: 'In', render: (r) => timeOf(r.checkInAt) },
              { key: 'checkOutAt', header: 'Out', render: (r) => timeOf(r.checkOutAt) },
              { key: 'hours', header: 'Hours', render: (r) => fmtMins(r.checkInAt && r.checkOutAt ? Math.round((+new Date(r.checkOutAt) - +new Date(r.checkInAt)) / 60_000) : null) },
              { key: 'checkoutRemarks', header: 'Remarks', render: (r) => <span className="line-clamp-2 max-w-xs text-xs">{r.checkoutRemarks || '—'}</span> },
            ]} />
          <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
        </>
      )}
    </Query>
  );
}

export function SalesWorkStatusPage() {
  const me = useMe();
  const q = useSales<Any[]>('/work-status');
  const team = useSales<Any[]>('/employees', me.isSalesAdmin);
  const [form, setForm] = useState({ summary: '', blockers: '', planTomorrow: '' });
  const submit = useSalesAction(() => post('/work-status', form), 'Work status submitted', () => setForm({ summary: '', blockers: '', planTomorrow: '' }));
  const nameOf = (id: string) => (team.data || []).find((e) => e._id === id)?.name || '';
  return (
    <>
      {me.modules['perf.daily_work_status'] && !me.isSalesAdmin && (
        <SectionCard title="Today's update">
          <FormStack>
            <Textarea placeholder="What did you get done today?" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            <FormRow>
              <Input placeholder="Blockers" value={form.blockers} onChange={(e) => setForm({ ...form, blockers: e.target.value })} />
              <Input placeholder="Plan for tomorrow" value={form.planTomorrow} onChange={(e) => setForm({ ...form, planTomorrow: e.target.value })} />
            </FormRow>
            <FormActions><Button disabled={form.summary.trim().length < 2 || submit.isPending} onClick={() => submit.mutate(undefined)}>Submit</Button></FormActions>
          </FormStack>
        </SectionCard>
      )}
      <Query q={q}>
        {(rows) => (
          <DataTable rows={rows} empty="No updates yet."
            columns={[
              { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
              ...(me.isSalesAdmin ? [{ key: 'employee', header: 'Employee', render: (r: Any) => nameOf(String(r.employeeId)) || '—' }] : []),
              { key: 'summary', header: 'Summary', render: (r) => <span className="whitespace-pre-wrap">{r.summary}</span> },
              { key: 'blockers', header: 'Blockers', render: (r) => r.blockers || '—' },
              { key: 'planTomorrow', header: 'Tomorrow', render: (r) => r.planTomorrow || '—' },
            ] as Column<Any>[]} />
        )}
      </Query>
    </>
  );
}

// ---------------------------------------------------------------- targets, territories
export function SalesTargetsPage() {
  const me = useMe();
  const basePath = me.basePath;
  const q = useSales<Any[]>('/targets');
  const stages = useSales<Any[]>('/stage-targets');
  const team = useSales<Any[]>('/employees', me.isSalesAdmin);
  const [open, setOpen] = useState(false);
  const create = useSalesAction((v: Any) => post('/targets', v), 'Target set', () => setOpen(false));
  const remove = useSalesAction((id: string) => api.data(`/sales-crm/targets/${id}`, 'DELETE'), 'Target removed');
  const stageRows = stages.data || [];
  // Non-admin GET /stage-targets is already scoped to the logged-in BDA.
  const myStages = stageRows;
  return (
    <>
      <PageHeader
        title="Targets"
        description={me.isSalesAdmin
          ? 'Revenue targets and daily pipeline stage goals. Stage goals set on the company dashboard also show here for each BDA.'
          : 'Your daily pipeline stage goals (set by your admin) and any revenue targets assigned to you.'}
        action={me.isSalesAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link to="/dashboard#sales-team-bda">Edit stage targets</Link></Button>
            <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Set revenue target</Button>
          </div>
        ) : undefined}
      />

      <SectionCard
        title="Daily pipeline stage targets"
        action={<span className="text-xs text-muted-foreground">{myStages[0]?.date || 'Today'} · actual = leads you created or moved today</span>}
      >
        {stages.isLoading ? <PageLoading rows={2} /> : myStages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {me.isSalesAdmin
              ? 'No BDAs yet. Add a sales login, then set stage targets on the company dashboard.'
              : 'Your admin has not set pipeline stage targets for you yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {me.isSalesAdmin && <th className="px-3 py-2 font-medium">BDA</th>}
                  {LEAD_STATUSES.map((st) => <th key={st} className="px-3 py-2 font-medium">{humanize(st)}</th>)}
                  <th className="px-3 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {myStages.map((row) => {
                  const targetTotal = Number(row.targetTotal || 0);
                  const actualTotal = Number(row.actualTotal || 0);
                  return (
                    <tr key={row.employeeId} className="border-b last:border-0 align-top">
                      {me.isSalesAdmin && (
                        <td className="px-3 py-3">
                          <p className="font-medium">{row.name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{row.employeeCode}</p>
                        </td>
                      )}
                      {LEAD_STATUSES.map((st) => {
                        const target = Number(row.stages?.[st] || 0);
                        const actual = Number(row.actual?.[st] || 0);
                        const met = target > 0 && actual >= target;
                        return (
                          <td key={st} className="px-3 py-3">
                            <p className="tabular-nums font-medium">{actual}<span className="text-muted-foreground"> / {target}</span></p>
                            <p className={`text-[11px] ${met ? 'text-success' : 'text-muted-foreground'}`}>{target ? (met ? 'On track' : 'Behind') : '—'}</p>
                          </td>
                        );
                      })}
                      <td className="px-3 py-3">
                        <p className="tabular-nums font-medium">{actualTotal} / {targetTotal}</p>
                        <div className="mt-1 w-28"><ProgressBar value={targetTotal ? Math.min(100, Math.round((actualTotal / targetTotal) * 100)) : 0} /></div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!me.isSalesAdmin && (
          <p className="mt-3 text-xs text-muted-foreground">
            Tip: open <Link className="underline" to={`${basePath}/leads`}>Leads</Link> to move pipeline stages and update your actuals.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Revenue targets">
        {me.isSalesAdmin && (
          <div className="mb-3 flex justify-end">
            <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Set revenue target</Button>
          </div>
        )}
        <Query q={q}>
          {(rows) => (
            <DataTable rows={rows} empty={me.isSalesAdmin ? 'No revenue targets set yet.' : 'No revenue target assigned to you yet.'}
              columns={[
                { key: 'employeeName', header: 'Employee', render: (r) => r.employeeName || '—' },
                { key: 'period', header: 'Period', render: (r) => <div><p>{humanize(r.period)}</p><p className="text-xs text-muted-foreground">{fmtDate(r.periodStart)} – {fmtDate(r.periodEnd)}</p></div> },
                { key: 'progress', header: 'Progress', render: (r) => <div className="w-48"><div className="mb-1 flex justify-between text-xs"><span>{inr(r.actual)} / {inr(r.targetValue)}</span><span className="font-medium">{r.pct}%</span></div><ProgressBar value={Math.min(100, r.pct)} /></div> },
                { key: 'remaining', header: 'Remaining', render: (r) => <div><p>{inr(r.remaining)}</p><p className="text-xs text-muted-foreground">{r.daysRemaining} days left</p></div> },
                { key: 'x', header: '', className: 'w-px', render: (r) => me.isSalesAdmin && <Button size="icon" variant="ghost" className="h-8 w-8 text-error" onClick={() => confirm('Remove this target?') && remove.mutate(r._id)}><Trash2 className="h-3.5 w-3.5" /></Button> },
              ]} />
          )}
        </Query>
      </SectionCard>

      <FormModal open={open} onClose={() => setOpen(false)} title="Set revenue target" initial={{ period: 'monthly' }} pending={create.isPending} onSubmit={(v) => create.mutate(v)} fields={[
        { name: 'employeeId', label: 'Employee', type: 'select', required: true, options: (team.data || []).filter((e) => !e.isSalesAdmin).map((e) => ({ value: e._id, label: e.name })) },
        { name: 'period', label: 'Period', type: 'select', required: true, options: ['daily', 'weekly', 'monthly', 'quarterly'] },
        { name: 'periodStart', label: 'Start', type: 'date', required: true }, { name: 'periodEnd', label: 'End (inclusive)', type: 'date', required: true },
        { name: 'targetValue', label: 'Revenue target (₹)', type: 'number', required: true },
      ]} />
    </>
  );
}

export function SalesTerritoriesPage() {
  const q = useSales<Any[]>('/territories');
  const [open, setOpen] = useState(false);
  const create = useSalesAction((v: Any) => post('/territories', v), 'Territory added', () => setOpen(false));
  const remove = useSalesAction((id: string) => api.data(`/sales-crm/territories/${id}`, 'DELETE'), 'Territory removed');
  return (
    <>
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Add territory</Button></div>
      <Query q={q}>
        {(rows) => (
          <DataTable rows={rows} empty="No territories yet."
            columns={[
              { key: 'name', header: 'Territory', render: (r) => <span className="font-medium">{r.name}</span> },
              { key: 'type', header: 'Type', render: (r) => humanize(r.type) },
              { key: 'description', header: 'Description', render: (r) => r.description || '—' },
              { key: 'x', header: '', className: 'w-px', render: (r) => <Button size="icon" variant="ghost" className="h-8 w-8 text-error" onClick={() => confirm(`Remove ${r.name}?`) && remove.mutate(r._id)}><Trash2 className="h-3.5 w-3.5" /></Button> },
            ]} />
        )}
      </Query>
      <FormModal open={open} onClose={() => setOpen(false)} title="Add territory" initial={{ type: 'city' }} pending={create.isPending} onSubmit={(v) => create.mutate(v)} fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'type', label: 'Type', type: 'select', options: ['city', 'state', 'region', 'country', 'custom'] },
        { name: 'description', label: 'Description', type: 'textarea' },
      ]} />
    </>
  );
}

// ---------------------------------------------------------------- performance, leaderboard, analytics
export function SalesPerformancePage() {
  const me = useMe();
  const [employeeId, setEmployeeId] = useState('');
  const team = useSales<Any[]>('/employees', me.isSalesAdmin);
  const q = useSales<Any>(`/performance${employeeId ? `?employeeId=${employeeId}` : ''}`);
  return (
    <>
      {me.isSalesAdmin && (
        <Select className="w-60" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">Me</option>
          {(team.data || []).filter((e) => e._id !== me.employee._id).map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
        </Select>
      )}
      <Query q={q}>
        {({ performance: p, daily: d, forecast: f, productivity: pr }) => (
          <>
            <PageGrid cols="4">
              <StatCard label="Revenue won" value={inr(p.revenue)} hint={`${p.won} won · ${p.lost} lost`} tone="success" />
              <StatCard label="Conversion" value={`${p.conversionRate}%`} hint={`Avg deal ${inr(p.avgDeal)}`} />
              <StatCard label="Weighted pipeline" value={inr(f.weightedPipeline)} hint={`${f.openDeals} open · ${inr(f.openPipeline)}`} />
              <StatCard label="Task completion" value={`${pr.completionPct}%`} hint={`${pr.pending} pending`} tone={pr.overdueTasks + pr.overdueFollowUps ? 'danger' : 'default'} />
            </PageGrid>
            <PageGrid cols="2">
              <SectionCard title="Today">
                <KeyValue items={[
                  ['Leads received', d.leadsReceived], ['Calls', d.calls], ['Meetings held', d.meetingsHeld], ['Follow-ups done', d.followUpsDone],
                  ['Proposals / quotations', `${d.proposals} / ${d.quotations}`], ['Won / lost', `${d.won} / ${d.lost}`], ['Revenue today', inr(d.revenueToday)], ['Pending follow-ups', d.pendingWork],
                ]} />
              </SectionCard>
              <SectionCard title="Activity totals">
                <KeyValue items={[
                  ['Calls', p.calls], ['Meetings', p.meetings], ['Proposals', p.proposals], ['Follow-ups completed', p.followUpsCompleted],
                  ['Overdue tasks', pr.overdueTasks], ['Overdue follow-ups', pr.overdueFollowUps], ['Tasks this week', pr.weeklyTasks],
                ]} />
              </SectionCard>
              <SectionCard title="Forecast by month (weighted)">
                <BarList rows={f.months.map((m: Any) => ({ label: m.month, value: m.weighted }))} />
              </SectionCard>
              <SectionCard title="Forecast by stage (weighted)">
                <BarList rows={f.byStage.map((s: Any) => ({ label: humanize(s.stage), value: s.weighted }))} />
              </SectionCard>
            </PageGrid>
          </>
        )}
      </Query>
    </>
  );
}

function BarList({ rows, money = true }: { rows: { label: string; value: number }[]; money?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-muted-foreground">No data yet.</p>;
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-muted-foreground">{r.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} /></div>
          <span className="w-24 shrink-0 text-right tabular-nums">{money ? inr(r.value) : r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SalesLeaderboardPage() {
  const q = useSales<Any[]>('/leaderboard');
  return (
    <Query q={q}>
      {(rows) => (
        <SectionCard title="This month">
          {rows.length ? (
            <ol className="divide-y">
              {rows.map((r, i) => (
                <li key={r.employeeId} className={cn('flex items-center gap-4 py-3 text-sm', r.me && 'font-semibold')}>
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs', i < 3 ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>{i + 1}</span>
                  <span className="flex-1">{r.name}{r.me && ' (you)'}</span>
                  <span className="text-muted-foreground">{r.dealsWon} won</span>
                  <span className="w-28 text-right tabular-nums">{inr(r.revenue)}</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-muted-foreground">No sales employees yet.</p>}
        </SectionCard>
      )}
    </Query>
  );
}

export function SalesAnalyticsPage() {
  const q = useSales<Any>('/analytics');
  return (
    <Query q={q}>
      {({ revenue, conversion, sources, lostDeals }) => (
        <>
          <PageGrid cols="4">
            <StatCard label="Total revenue" value={inr(revenue.total)} hint={`Avg deal ${inr(revenue.avgDeal)}`} tone="success" />
            <StatCard label="Lead conversion" value={`${conversion.leadRate}%`} hint={`${conversion.converted} of ${conversion.leads} leads`} />
            <StatCard label="Win rate" value={`${conversion.winRate}%`} hint={`${conversion.won} won · ${conversion.lost} lost`} />
            <StatCard label="Lost value" value={inr(lostDeals.value)} hint={`${lostDeals.total} deals`} tone={lostDeals.total ? 'danger' : 'default'} />
          </PageGrid>
          <PageGrid cols="2">
            <SectionCard title="Revenue — last 12 months"><BarList rows={revenue.monthly.map((m: Any) => ({ label: m.month, value: m.revenue }))} /></SectionCard>
            <SectionCard title="Deals by stage"><BarList money={false} rows={conversion.byStage.map((s: Any) => ({ label: humanize(s.stage), value: s.count }))} /></SectionCard>
            <SectionCard title="Lead sources">
              <DataTable rows={sources.map((s: Any) => ({ ...s, _id: s.source }))} empty="No leads yet."
                columns={[
                  { key: 'source', header: 'Source', render: (r) => humanize(r.source) },
                  { key: 'leads', header: 'Leads', render: (r) => r.leads },
                  { key: 'converted', header: 'Converted', render: (r) => r.converted },
                  { key: 'rate', header: 'Rate', render: (r) => `${r.rate}%` },
                ]} />
            </SectionCard>
            <SectionCard title="Lost reasons"><BarList money={false} rows={lostDeals.reasons.map((r: Any) => ({ label: humanize(r.reason), value: r.count }))} /></SectionCard>
          </PageGrid>
        </>
      )}
    </Query>
  );
}

// ---------------------------------------------------------------- team
export function SalesTeamPage() {
  const navigate = useNavigate();
  const basePath = useMe().basePath;
  const slug = useAuthStore((s) => s.organization?.slug);
  const bdaLoginPath = `/${slug || 'company'}/bda`;
  const q = useSales<Any[]>('/employees');
  const [open, setOpen] = useState(false);
  const create = useSalesAction((v: Any) => post('/employees', v), 'Employee added', () => setOpen(false));
  return (
    <>
      <PageHeader
        title="BDA team & access"
        description="Create BDA logins, then open a person to turn modules on or off. BDAs sign in at the branded portal."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}${bdaLoginPath}`);
                toast.success('BDA login URL copied');
              } catch { toast.error('Could not copy URL'); }
            }}>
              <Copy className="mr-2 h-4 w-4" />Copy BDA URL
            </Button>
            <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Add BDA login</Button>
          </div>
        }
      />
      <Query q={q}>
        {(rows) => (
          <DataTable rows={rows} empty="No employees yet." onRowClick={(r) => navigate(`${basePath}/team/${r._id}`)}
            columns={[
              { key: 'name', header: 'Employee', render: (r) => <div className="flex items-center gap-2"><span className={cn('h-2 w-2 rounded-full', r.live ? 'bg-green-500' : 'bg-muted-foreground/30')} title={r.live ? 'Online' : 'Offline'} /><div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.email}</p></div></div> },
              { key: 'employeeCode', header: 'Code', render: (r) => <span className="font-mono text-xs">{r.employeeCode}</span> },
              { key: 'role', header: 'Role', render: (r) => (r.isSalesAdmin ? <StatusPill value="Sales admin" tone="purple" /> : <StatusPill value="BDA" />) },
              { key: 'team', header: 'Team / territory', render: (r) => [r.department, r.team, r.territory].filter(Boolean).join(' · ') || '—' },
              { key: 'openLeads', header: 'Open leads', render: (r) => r.openLeads },
              { key: 'revenue', header: 'Revenue', render: (r) => inr(r.revenue) },
              { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
            ]} />
        )}
      </Query>
      <FormModal open={open} onClose={() => setOpen(false)} title="Add BDA / sales employee" initial={{ department: 'Sales' }} pending={create.isPending} onSubmit={(v) => create.mutate(v)} fields={[
        { name: 'name', label: 'Full name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'password', label: 'Password', type: 'password', help: 'Required for a new login (min 8 characters). New sales employees open the company BDA portal at /{company-slug}/bda after login.' },
        { name: 'phone', label: 'Phone' }, { name: 'department', label: 'Department' }, { name: 'team', label: 'Team' }, { name: 'territory', label: 'Territory' },
        { name: 'isSalesAdmin', label: 'Sales admin (full ERP Sales CRM — not BDA-only)', type: 'checkbox' },
      ]} />
    </>
  );
}

export function SalesEmployeeDetailPage() {
  const { id } = useParams();
  const me = useMe();
  const basePath = me.basePath;
  const navigate = useNavigate();
  const q = useSales<Any>(`/employees/${id}`);
  const [modules, setModules] = useState<Record<string, boolean> | null>(null);
  const [edit, setEdit] = useState(false);
  const save = useSalesAction(() => api.data(`/sales-crm/employees/${id}/permissions`, 'PUT', { modules }), 'Access updated', () => setModules(null));
  const update = useSalesAction((v: Any) => api.data(`/sales-crm/employees/${id}`, 'PATCH', v), 'Employee updated', () => setEdit(false));
  const remove = useSalesAction(() => api.data(`/sales-crm/employees/${id}`, 'DELETE'), 'Employee removed', () => navigate(`${basePath}/team`));
  return (
    <Query q={q}>
      {({ employee, modules: current, stats, activity }) => {
        const m = modules || current;
        return (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost" size="sm" asChild><Link to={`${basePath}/team`}><ArrowLeft className="mr-1 h-4 w-4" />Team</Link></Button>
              <h2 className="text-lg font-semibold">{employee.name}</h2>
              <span className="font-mono text-xs text-muted-foreground">{employee.employeeCode}</span>
              <StatusPill value={employee.status} />
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={() => setEdit(true)}>Edit</Button>
                {employee._id !== me.employee._id && <Button variant="ghost" className="text-error" onClick={() => confirm(`Remove ${employee.name}? Their open leads become unassigned.`) && remove.mutate(undefined)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </div>
            <PageGrid cols="4">
              <StatCard label="Leads" value={stats.leads} />
              <StatCard label="Deals" value={stats.deals} hint={`${stats.won} won`} />
              <StatCard label="Revenue" value={inr(stats.revenue)} tone="success" />
              <StatCard label="Calls / meetings" value={`${stats.calls} / ${stats.meetings}`} />
            </PageGrid>
            <SectionCard title="Module access" action={employee.isSalesAdmin ? <span className="text-xs text-muted-foreground">Sales admins have every module</span> : modules && (
              <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setModules(null)}>Reset</Button><Button size="sm" disabled={save.isPending} onClick={() => save.mutate(undefined)}>Save access</Button></div>
            )}>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {MODULE_GROUPS.map(([group, keys]) => (
                  <div key={group}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                    <div className="flex flex-col gap-1.5">
                      {keys.map((k) => {
                        const locked = employee.isSalesAdmin || ADMIN_ONLY.has(k);
                        return (
                          <label key={k} className={cn('flex items-center gap-2 text-sm', locked && 'opacity-60')}>
                            <input type="checkbox" disabled={locked} checked={Boolean(m[k])} onChange={(e) => setModules({ ...m, [k]: e.target.checked })} />
                            {humanize(k.split('.')[1])}{ADMIN_ONLY.has(k) && !employee.isSalesAdmin && <span className="text-[10px] text-muted-foreground">admin only</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Recent activity"><SalesActivityList rows={activity} /></SectionCard>
            <FormModal open={edit} onClose={() => setEdit(false)} title="Edit employee" initial={employee} pending={update.isPending}
              onSubmit={(v) => update.mutate({ status: v.status, department: v.department, team: v.team, territory: v.territory, phone: v.phone })} fields={[
                { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'on_leave'], required: true },
                { name: 'phone', label: 'Phone' }, { name: 'department', label: 'Department' }, { name: 'team', label: 'Team' }, { name: 'territory', label: 'Territory' },
              ]} />
          </>
        );
      }}
    </Query>
  );
}

// ---------------------------------------------------------------- BDA My Day + Email/WhatsApp
export function SalesMyDayPage() {
  const me = useMe();
  const basePath = me.basePath;
  const q = useSales<Any>('/my-day');
  const attendance = useSales<Any>('/attendance');
  const stageTargets = useSales<Any[]>('/stage-targets');
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const checkIn = useSalesAction(() => post('/attendance/check-in'), 'Checked in');
  const escalate = useSalesAction(
    (v: Any) => post('/escalate', v),
    'Escalation sent to your managers',
    () => setEscalateOpen(false)
  );
  const today = attendance.data?.today;
  const myStage = (stageTargets.data || [])[0];
  return (
    <Query q={q}>
      {(d) => (
        <>
          <PageHeader
            title="My Day"
            description={`Focus queue for ${d.date}`}
            action={
              <div className="flex flex-wrap gap-2">
                {!today?.checkInAt && (
                  <Button onClick={() => checkIn.mutate(undefined)} disabled={checkIn.isPending}>
                    <LogIn className="mr-2 h-4 w-4" />Check in
                  </Button>
                )}
                {!today?.checkOutAt && (
                  <Button variant="outline" onClick={() => setCheckoutOpen(true)}>
                    <LogOut className="mr-2 h-4 w-4" />Check out
                  </Button>
                )}
                <Button variant="outline" onClick={() => setEscalateOpen(true)}>Ask manager for help</Button>
              </div>
            }
          />
          <PageGrid cols="4">
            <StatCard label="Open leads" value={d.stats.openLeads} />
            <StatCard label="Open tasks" value={d.stats.openTasks ?? d.openTasks?.length ?? 0} />
            <StatCard label="Overdue follow-ups" value={d.stats.overdueFollowUps} tone={d.stats.overdueFollowUps ? 'danger' : 'default'} />
            <StatCard label="Today's meetings" value={d.stats.todayMeetings} />
          </PageGrid>
          {myStage && Number(myStage.targetTotal || 0) > 0 && (
            <SectionCard
              title="Today's stage targets"
              action={<Link className="text-xs hover:underline" to={`${basePath}/targets`}>Full targets →</Link>}
            >
              <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Progress today</span>
                <span className="font-medium tabular-nums">{myStage.actualTotal || 0} / {myStage.targetTotal || 0}</span>
              </div>
              <ProgressBar value={myStage.targetTotal ? Math.min(100, Math.round((Number(myStage.actualTotal || 0) / Number(myStage.targetTotal)) * 100)) : 0} />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {LEAD_STATUSES.map((st) => {
                  const target = Number(myStage.stages?.[st] || 0);
                  const actual = Number(myStage.actual?.[st] || 0);
                  if (!target && !actual) return null;
                  return (
                    <div key={st} className="rounded-md border px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{humanize(st)}</p>
                      <p className="mt-1 font-medium tabular-nums">{actual} <span className="text-muted-foreground">/ {target}</span></p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
          <CallAnalytics data={d.callAnalytics} />
          <PageGrid cols="2">
            <SectionCard title="My open tasks" action={<Link className="text-xs hover:underline" to={`${basePath}/tasks`}>View all</Link>}>
              <SimpleList rows={d.openTasks || d.todayTasks || []} empty="No open tasks assigned to you." render={(t) => (
                <><span className="text-sm">{t.title}{t.dueDate ? <span className="text-muted-foreground"> · due {fmtDate(t.dueDate)}</span> : null}</span><StatusPill value={t.status} /></>
              )} />
            </SectionCard>
            <SectionCard title="Overdue follow-ups" action={<Link className="text-xs hover:underline" to={`${basePath}/follow-ups`}>View all</Link>}>
              <SimpleList rows={d.overdueFollowUps} empty="Nothing overdue." render={(f) => {
                const lid = leadIdOf(f);
                return (
                  <>
                    {lid ? <Link className="text-sm hover:underline" to={leadHref(basePath, lid)}>{f.notes || humanize(f.type)}</Link> : <span className="text-sm">{f.notes || humanize(f.type)}</span>}
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">{fmtDateTime(f.dueAt)}<StatusPill value={f.status} /></span>
                  </>
                );
              }} />
            </SectionCard>
            <SectionCard title="Today's meetings" action={<Link className="text-xs hover:underline" to={`${basePath}/meetings`}>View all</Link>}>
              <SimpleList rows={d.todayMeetings} empty="No meetings today." render={(m) => {
                const lid = leadIdOf(m);
                return (
                  <>
                    {lid ? <Link className="text-sm hover:underline" to={leadHref(basePath, lid)}>{m.title}</Link> : <span className="text-sm">{m.title}</span>}
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">{fmtDateTime(m.startsAt)}<StatusPill value={m.status} /></span>
                  </>
                );
              }} />
            </SectionCard>
            <SectionCard title="Hot / warm leads" action={<Link className="text-xs hover:underline" to={`${basePath}/leads`}>Inbox</Link>}>
              <SimpleList rows={d.hotLeads} empty="No hot leads." render={(l) => (
                <><Link className="hover:underline" to={leadHref(basePath, l._id)}>{leadLabel(l)}</Link><StatusPill value={l.temperature} /></>
              )} />
            </SectionCard>
          </PageGrid>
          {(d.overdueTasks?.length > 0) && (
            <SectionCard title="Overdue tasks">
              <SimpleList rows={d.overdueTasks} empty="None." render={(t) => (
                <><span className="text-sm">{t.title}<span className="text-muted-foreground"> · due {fmtDate(t.dueDate)}</span></span><StatusPill value="overdue" /></>
              )} />
            </SectionCard>
          )}
          <FormModal
            open={escalateOpen}
            onClose={() => setEscalateOpen(false)}
            title="Ask manager for help"
            submitLabel="Send escalation"
            pending={escalate.isPending}
            onSubmit={(v) => escalate.mutate(v)}
            fields={[
              { name: 'subject', label: 'What do you need?', required: true, placeholder: 'e.g. Stuck on pricing for ACME' },
              { name: 'detail', label: 'Details', type: 'textarea', placeholder: 'Context your manager should know' },
            ]}
          />
          <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
        </>
      )}
    </Query>
  );
}

export function SalesMessagesPage() {
  const me = useMe();
  const basePath = me.basePath;
  const [searchParams] = useSearchParams();
  const filterLead = searchParams.get('lead') || '';
  const [channel, setChannel] = useState<'all' | 'email' | 'whatsapp'>('all');
  const qs = channel === 'all' ? '' : `?channel=${channel}`;
  const q = useSales<Any[]>(`/messages${qs}`, me.modules['comm.email_whatsapp']);
  const leads = useLeadOptions();
  const [open, setOpen] = useState(Boolean(filterLead));
  const create = useSalesAction(async (v: Any) => {
    const res = await post('/messages', v) as Any;
    if (res?.deepLink) window.open(res.deepLink, '_blank', 'noopener,noreferrer');
    return res;
  }, 'Message logged', () => setOpen(false));
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {filterLead && <Button variant="outline" size="sm" asChild><Link to={leadHref(basePath, filterLead)}>Back to lead</Link></Button>}
        <Select className="w-40" value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}>
          <option value="all">All channels</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </Select>
        <Button className="sm:ml-auto" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Log / compose</Button>
      </div>
      <Query q={q}>
        {(allRows) => {
          const rows = filterLead ? allRows.filter((r) => leadIdOf(r) === filterLead) : allRows;
          return (
          <DataTable rows={rows} empty="No messages logged yet."
            columns={[
              { key: 'channel', header: 'Channel', render: (r) => <StatusPill value={r.channel} /> },
              { key: 'lead', header: 'Lead', render: (r) => {
                const lid = leadIdOf(r);
                return lid ? <Link className="hover:underline" to={leadHref(basePath, lid)}>{leadLabel(r.leadId)}</Link> : '—';
              } },
              { key: 'toAddress', header: 'To', render: (r) => r.toAddress || '—' },
              { key: 'subject', header: 'Subject / preview', render: (r) => <div><p className="font-medium">{r.subject || humanize(r.channel)}</p><p className="line-clamp-1 text-xs text-muted-foreground">{r.body}</p></div> },
              { key: 'sentAt', header: 'When', render: (r) => fmtDateTime(r.sentAt) },
            ]} />
          );
        }}
      </Query>
      <FormModal open={open} onClose={() => setOpen(false)} title="Log email or WhatsApp" pending={create.isPending}
        initial={{ channel: 'whatsapp', direction: 'outbound', ...(filterLead ? { leadId: filterLead } : {}) }}
        onSubmit={(v) => create.mutate(v)}
        fields={[
          { name: 'channel', label: 'Channel', type: 'select', options: ['email', 'whatsapp'], required: true },
          { name: 'leadId', label: 'Lead', type: 'select', options: leads },
          { name: 'toAddress', label: 'To (email or phone)' },
          { name: 'subject', label: 'Subject (email)' },
          { name: 'body', label: 'Message', type: 'textarea', required: true },
        ]} />
    </>
  );
}
