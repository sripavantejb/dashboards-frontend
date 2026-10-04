import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MailCheck, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormActions, FormField, FormRow, FormStack } from '@/components/layout/page-layout';
import { PageLoading } from '@/components/shared/page-states';
import { Badge } from '@/components/ui/badge';

interface SmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromName: string;
  fromEmail: string;
  passwordConfigured: boolean;
}

const empty: SmtpSettings = {
  enabled: false,
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  user: '',
  fromName: '',
  fromEmail: '',
  passwordConfigured: false,
};

/**
 * Company SMTP mailbox used for task reminders, digests, and notification emails.
 * `base` is `/settings` or `/admin/organizations/:id/settings`.
 */
export function SmtpConnectionCard({ base }: { base: string }) {
  const qc = useQueryClient();
  const key = ['smtp-settings', base];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api.data<SmtpSettings>(`${base}/smtp`) });
  const [form, setForm] = useState<SmtpSettings & { password: string }>({ ...empty, password: '' });

  useEffect(() => {
    if (data) setForm({ ...data, password: '' });
  }, [data]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: () =>
      api.data<SmtpSettings>(`${base}/smtp`, 'PUT', {
        enabled: form.enabled,
        host: form.host,
        port: Number(form.port) || 465,
        secure: form.secure,
        user: form.user,
        fromName: form.fromName,
        fromEmail: form.fromEmail || form.user,
        password: form.password || undefined,
      }),
    onSuccess: (saved) => {
      qc.setQueryData(key, saved);
      setForm({ ...saved, password: '' });
      toast.success('SMTP connection saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: () => api.data<{ sent: number; to: string }>(`${base}/smtp/test`, 'POST', { to: form.user || undefined }),
    onSuccess: (r) => toast.success(`Test email sent to ${r.to}`),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="p-5 lg:p-6">
          <PageLoading rows={3} />
        </CardContent>
      </Card>
    );
  }

  const dirty =
    form.enabled !== data.enabled ||
    form.host !== data.host ||
    Number(form.port) !== data.port ||
    form.secure !== data.secure ||
    form.user !== data.user ||
    form.fromName !== data.fromName ||
    form.fromEmail !== data.fromEmail ||
    Boolean(form.password);

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-5 lg:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <MailCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">SMTP connection</p>
              {data.passwordConfigured && data.enabled ? (
                <Badge variant="success">Connected</Badge>
              ) : data.passwordConfigured ? (
                <Badge variant="outline">Saved (disabled)</Badge>
              ) : (
                <Badge variant="outline">Not configured</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Connect the company mailbox (Gmail app password recommended). Task assignments, reminders, digests,
              invoices, and other notification emails are sent from this address.
            </p>
          </div>
        </div>

        <FormStack>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border"
              checked={form.enabled}
              onChange={(e) => set('enabled', e.target.checked)}
            />
            Enable sending from this mailbox
          </label>

          <FormRow>
            <FormField>
              <Label htmlFor="smtp-user">Mailbox / username</Label>
              <Input
                id="smtp-user"
                type="email"
                placeholder="company@gmail.com"
                value={form.user}
                onChange={(e) => set('user', e.target.value)}
              />
            </FormField>
            <FormField>
              <Label htmlFor="smtp-password">
                App password {data.passwordConfigured ? '(leave blank to keep current)' : ''}
              </Label>
              <Input
                id="smtp-password"
                type="password"
                autoComplete="new-password"
                placeholder={data.passwordConfigured ? '••••••••••••••••' : '16-character app password'}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
              />
            </FormField>
          </FormRow>

          <FormRow>
            <FormField>
              <Label htmlFor="smtp-from-name">From name</Label>
              <Input
                id="smtp-from-name"
                placeholder="Your Company"
                value={form.fromName}
                onChange={(e) => set('fromName', e.target.value)}
              />
            </FormField>
            <FormField>
              <Label htmlFor="smtp-from-email">From email (optional)</Label>
              <Input
                id="smtp-from-email"
                type="email"
                placeholder="Same as mailbox if empty"
                value={form.fromEmail}
                onChange={(e) => set('fromEmail', e.target.value)}
              />
            </FormField>
          </FormRow>

          <FormRow>
            <FormField>
              <Label htmlFor="smtp-host">SMTP host</Label>
              <Input id="smtp-host" value={form.host} onChange={(e) => set('host', e.target.value)} />
            </FormField>
            <FormField>
              <Label htmlFor="smtp-port">Port</Label>
              <Input
                id="smtp-port"
                type="number"
                value={form.port}
                onChange={(e) => set('port', Number(e.target.value) || 465)}
              />
            </FormField>
          </FormRow>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border"
              checked={form.secure}
              onChange={(e) => set('secure', e.target.checked)}
            />
            Use SSL/TLS (port 465)
          </label>
        </FormStack>

        <FormActions>
          <Button
            type="button"
            variant="outline"
            disabled={dirty || !data.passwordConfigured || test.isPending}
            onClick={() => test.mutate()}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {test.isPending ? 'Sending…' : 'Send test email'}
          </Button>
          <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => setForm({ ...data, password: '' })}>
            Reset
          </Button>
          <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : 'Save SMTP'}
          </Button>
        </FormActions>
      </CardContent>
    </Card>
  );
}
