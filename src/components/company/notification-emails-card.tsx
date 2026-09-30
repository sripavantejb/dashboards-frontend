import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormActions } from '@/components/layout/page-layout';
import { PageLoading } from '@/components/shared/page-states';

const CATEGORIES = [
  { key: 'finance', label: 'Finance', description: 'Payments received, recurring bills due and invoice / transaction changes' },
  { key: 'sales', label: 'Sales', description: 'Leads converted to clients and Sales CRM approval requests' },
  { key: 'careers', label: 'Careers', description: 'New job applications from the careers page' },
  { key: 'referrals', label: 'Referrals', description: 'New referrals submitted by partners' },
  { key: 'ega', label: 'EGA applications', description: 'New EGA (growth accelerator) applications' },
  { key: 'alerts', label: 'Daily alerts', description: 'Daily digest of overdue invoices, tasks, follow-ups and bills' },
] as const;
type Category = (typeof CATEGORIES)[number]['key'];
type Lists = Record<Category, string[]>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function EmailChips({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const entries = draft.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!entries.length) return;
    const invalid = entries.filter((e) => !EMAIL.test(e));
    if (invalid.length) return toast.error(`Not a valid email: ${invalid.join(', ')}`);
    onChange([...new Set([...value, ...entries])]);
    setDraft('');
  };

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5">
      {value.map((email) => (
        <span key={email} className="inline-flex items-center gap-1 rounded-full bg-surface-soft px-2.5 py-0.5 text-xs">
          {email}
          <button type="button" aria-label={`Remove ${email}`} className="text-muted-foreground hover:text-foreground" onClick={() => onChange(value.filter((e) => e !== email))}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <Input
        className="h-7 min-w-[180px] flex-1 border-0 px-1 shadow-none focus-visible:ring-0"
        placeholder={value.length ? 'Add another…' : 'name@company.com — press Enter to add'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (['Enter', ',', ';'].includes(e.key)) { e.preventDefault(); commit(); }
          if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
      />
    </div>
  );
}

/**
 * Extra inboxes that receive a company's notification emails, per category.
 * `base` is `/settings` for company admins or `/admin/organizations/:id/settings` for platform admins.
 */
export function NotificationEmailsCard({ base }: { base: string }) {
  const qc = useQueryClient();
  const key = ['notification-emails', base];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api.data<Lists>(`${base}/notification-emails`) });
  const [lists, setLists] = useState<Lists | null>(null);

  useEffect(() => {
    if (data) setLists(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (body: Lists) => api.data<Lists>(`${base}/notification-emails`, 'PUT', body),
    onSuccess: (saved) => { qc.setQueryData(key, saved); toast.success('Notification emails saved'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const test = useMutation({
    mutationFn: (category?: Category) => api.data<{ sent: number; failed: string[] }>(`${base}/notification-emails/test`, 'POST', category ? { category } : {}),
    onSuccess: (r) => toast.success(`Test email sent to ${r.sent} address${r.sent === 1 ? '' : 'es'}${r.failed.length ? ` (failed: ${r.failed.join(', ')})` : ''}`),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !lists) return <Card><CardContent className="p-5 lg:p-6"><PageLoading rows={3} /></CardContent></Card>;

  const dirty = JSON.stringify(lists) !== JSON.stringify(data);

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-5 lg:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Mail className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Notification emails</p>
            <p className="text-sm text-muted-foreground">
              Add the inboxes that should receive each kind of email — for example accounts@ for finance or hr@ for careers.
              Team members keep getting the notifications meant for them; these addresses are sent a copy.
            </p>
          </div>
        </div>

        <div className="flex flex-col divide-y rounded-md border">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="grid gap-2 p-4 md:grid-cols-[220px_1fr_auto] md:items-center">
              <div>
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>
              <EmailChips value={lists[c.key]} onChange={(next) => setLists({ ...lists, [c.key]: next })} />
              <Button size="sm" variant="ghost" disabled={dirty || !data?.[c.key].length || test.isPending} title={dirty ? 'Save first' : 'Send a test email'} onClick={() => test.mutate(c.key)}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <FormActions>
          <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => data && setLists(data)}>Reset</Button>
          <Button disabled={!dirty || save.isPending} onClick={() => save.mutate(lists)}>{save.isPending ? 'Saving…' : 'Save emails'}</Button>
        </FormActions>
      </CardContent>
    </Card>
  );
}
