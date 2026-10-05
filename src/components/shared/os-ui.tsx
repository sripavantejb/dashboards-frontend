import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export const inputClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => {
    const stretch = Boolean(className && /\bw-full\b/.test(className));
    return (
      <span className={cn('relative inline-flex min-w-0 align-middle', stretch ? 'w-full' : 'w-fit')}>
        <select
          ref={ref}
          className={cn(
            'box-border h-9 w-full cursor-pointer appearance-none rounded-md border border-input bg-background pl-2.5 pr-8 text-left text-sm leading-9 text-foreground',
            'outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        <ChevronDown aria-hidden className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-current opacity-70" />
      </span>
    );
  }
);
Select.displayName = 'Select';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn('flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export const humanize = (s?: string | null) =>
  (s || '').replace(/[_.]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const TONES: Record<string, string> = {
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  gray: 'bg-secondary text-secondary-foreground',
  sky: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  rose: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  violet: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
};

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  completed: 'green', paid: 'green', won: 'emerald', active: 'green', published: 'green', approved: 'green', accepted: 'green',
  converted: 'emerald', present: 'green', hired: 'green', selected: 'green', connected: 'emerald', income: 'green',
  interested: 'emerald', this_month: 'emerald', checked_in: 'green', checked_out: 'blue',
  in_progress: 'blue', issued: 'blue', onboarding: 'blue', sent: 'blue', scheduled: 'blue', started: 'blue',
  contacted: 'sky', reviewing: 'blue', qualified: 'blue', qualified_call: 'blue',
  meeting: 'teal', demo: 'teal',
  proposal: 'indigo', proposal_sent: 'indigo',
  in_review: 'purple', negotiation: 'violet', shortlisted: 'purple', viewed: 'purple', recursive: 'purple', review: 'purple',
  follow_up: 'violet', callback: 'orange',
  partially_paid: 'amber', waiting_for_client: 'amber', pending: 'amber', on_hold: 'amber', paused: 'amber', draft: 'gray',
  pending_approval: 'amber', todo: 'gray', planned: 'gray', new: 'slate', submitted: 'gray', not_yet_started: 'gray',
  no_answer: 'slate', busy: 'amber', customers: 'teal',
  overdue: 'red', blocked: 'red', cancelled: 'red', lost: 'rose', rejected: 'red', expired: 'red', missed: 'red',
  unqualified: 'orange', not_interested: 'rose', wrong_number: 'rose',
  inactive: 'gray', closed: 'gray', ended: 'gray', expense: 'red', archived: 'gray', urgent: 'red', high: 'amber',
  medium: 'blue', low: 'gray', hot: 'rose', warm: 'amber', cold: 'sky', due_soon: 'amber', due_today: 'amber',
  not_needed: 'slate',
};

const STAGE_BORDER: Record<string, string> = {
  new: 'border-slate-200',
  contacted: 'border-sky-200',
  qualified: 'border-blue-200',
  meeting: 'border-teal-200',
  proposal: 'border-indigo-200',
  negotiation: 'border-violet-200',
  converted: 'border-emerald-200',
  won: 'border-emerald-200',
  lost: 'border-rose-200',
  unqualified: 'border-orange-200',
  hot: 'border-rose-200',
  warm: 'border-amber-200',
  cold: 'border-sky-200',
  connected: 'border-emerald-200',
  interested: 'border-emerald-200',
  not_interested: 'border-rose-200',
  follow_up: 'border-violet-200',
  callback: 'border-orange-200',
  no_answer: 'border-slate-200',
  busy: 'border-amber-200',
  wrong_number: 'border-rose-200',
  not_yet_started: 'border-slate-200',
  started: 'border-blue-200',
  in_progress: 'border-blue-200',
  blocked: 'border-rose-200',
  recursive: 'border-violet-200',
  completed: 'border-emerald-200',
  not_needed: 'border-slate-200',
  urgent: 'border-rose-200',
  high: 'border-amber-200',
  medium: 'border-blue-200',
  low: 'border-slate-200',
};

export function stageSelectClass(value?: string | null) {
  if (!value) return 'border-input bg-background font-normal text-muted-foreground';
  const tone = STATUS_TONE[value];
  return cn('font-medium', TONES[tone || 'slate'], STAGE_BORDER[value] || 'border-slate-200');
}

export function StatusPill({ value, tone, className }: { value?: string | null; tone?: keyof typeof TONES; className?: string }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', TONES[tone || STATUS_TONE[value] || 'gray'], className)}>
      {humanize(value)}
    </span>
  );
}

export function StatCard({ label, value, hint, icon, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; tone?: 'default' | 'danger' | 'success' }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <p className={cn('mt-2 font-display text-2xl font-semibold tracking-tight', tone === 'danger' && 'text-error', tone === 'success' && 'text-success')}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SectionCard({ title, action, children, className, bodyClassName }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <Card className={className}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          {title && <h3 className="font-display text-base font-semibold">{title}</h3>}
          {action}
        </div>
      )}
      <CardContent className={cn('p-5', bodyClassName)}>{children}</CardContent>
    </Card>
  );
}

export function KeyValue({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="mt-0.5 truncate text-sm font-medium">{v === undefined || v === null || v === '' ? '—' : v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
            value === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="rounded-full bg-secondary px-1.5 text-[10px]">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

export interface Column<T = AnyRow> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T extends AnyRow = AnyRow>({ columns, rows, onRowClick, empty = 'Nothing here yet', selectedId, compact }: { columns: Column<T>[]; rows: T[]; onRowClick?: (row: T) => void; empty?: string; selectedId?: string; compact?: boolean }) {
  const headCell = compact ? 'px-3 py-2.5' : 'px-4 py-3';
  const cell = compact ? 'px-3 py-2' : 'px-4 py-3';
  return (
    <div className="overflow-x-auto rounded-xl border border-black/[0.06] bg-card shadow-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/[0.06] bg-surface-soft/50 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            {columns.map((c) => (
              <th key={c.key} className={cn('whitespace-nowrap align-middle', headCell, c.className)}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className={cn(cell, 'py-10 text-center text-muted-foreground')}>{empty}</td></tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={row._id || row.id || i}
                onClick={onRowClick ? (e) => {
                  const t = e.target as HTMLElement;
                  if (t.closest('select, input, textarea, button, a, [data-inline]')) return;
                  onRowClick(row);
                } : undefined}
                className={cn(
                  'border-b border-black/[0.04] last:border-0 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-surface-soft/50',
                  selectedId && (row._id === selectedId || row.id === selectedId) && 'bg-surface-soft/80'
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('align-middle', cell, c.className)}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export const inr = (n?: number | null) => formatCurrency(Number(n) || 0);

export const fmtDate = (d?: string | Date | null) =>
  d ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d)) : '—';

export const fmtDateTime = (d?: string | Date | null) =>
  d ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '—';

export const toDateInput = (d?: string | Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export const personName = (u?: { firstName?: string; lastName?: string; email?: string; name?: string } | null) =>
  u ? u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '—' : '—';

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}
