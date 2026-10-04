import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Copy, ExternalLink, Plus, Settings2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormRow, FormStack } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionCard } from '@/components/shared/os-ui';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageError, PageLoading } from '@/components/shared/page-states';
import type { OrgUser } from '@/types';

export default function BdaSettingsPage() {
  const { organization } = useAuthStore();
  const slug = organization?.slug || 'company';
  const bdaLoginPath = `/${slug}/bda`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const bdaUrl = `${origin}${bdaLoginPath}`;
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '' });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<OrgUser[]>('/users?limit=100'),
  });

  const createUser = useMutation({
    mutationFn: () =>
      api.post('/users', {
        ...form,
        role: 'sales',
        department: 'Sales',
      }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('BDA login created');
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        setShowNew(false);
        setForm({ email: '', password: '', firstName: '', lastName: '', phone: '' });
      } else toast.error(res.error?.message || 'Failed to create BDA login');
    },
  });

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(bdaUrl);
      toast.success('BDA login URL copied');
    } catch {
      toast.error('Could not copy URL');
    }
  };

  const users = data?.data || [];
  const bdas = users.filter((u) => u.role === 'sales');

  return (
    <>
      <PageHeader
        title="BDA settings"
        description="Create BDA logins, share the branded portal URL, and manage module access."
        action={
          <Button onClick={() => setShowNew(true)}>
            <Plus className="mr-2 h-4 w-4" />Create BDA login
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="BDA login URL">
          <p className="text-sm text-muted-foreground">
            BDAs sign in here — branded with your company name and logo. They will not see Finance or other agency modules.
          </p>
          <code className="mt-3 block break-all rounded-md border border-hairline bg-surface-soft px-3 py-2 text-sm">{bdaUrl}</code>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copyUrl}>
              <Copy className="mr-2 h-4 w-4" />Copy URL
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={bdaLoginPath} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />Open portal
              </a>
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Access & team">
          <p className="text-sm text-muted-foreground">Turn modules on or off per BDA, set territories, and review attendance from Sales CRM.</p>
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/sales-crm/team">
                <Users className="mr-2 h-4 w-4" />BDA team & module access
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/employees">
                <Settings2 className="mr-2 h-4 w-4" />All employee logins
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/sales-crm/attendance">Attendance</Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/sales-crm/targets">Targets</Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/dashboard">Dashboard check-in & stage targets</Link>
            </Button>
          </div>
        </SectionCard>
      </div>

      <SectionCard title={`BDA logins (${bdas.length})`}>
        {isLoading ? (
          <PageLoading rows={3} />
        ) : isError ? (
          <PageError onRetry={() => refetch()} />
        ) : bdas.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No BDA logins yet. Create one to send them {bdaLoginPath}.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {bdas.map((u) => (
              <li key={u._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/sales-crm/team">Open in team</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SimpleModal open={showNew} onClose={() => setShowNew(false)} title="Create BDA login">
        <FormStack>
          <p className="text-sm text-muted-foreground">
            This creates a <strong>sales</strong> user. They sign in at <code className="text-xs">{bdaLoginPath}</code>.
          </p>
          <FormRow>
            <FormField>
              <Label>First name *</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </FormField>
            <FormField>
              <Label>Last name *</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </FormField>
          </FormRow>
          <FormField>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField>
            <Label>Password *</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </FormField>
          <FormField>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setShowNew(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.email || !form.password || !form.firstName || createUser.isPending}
              onClick={() => createUser.mutate()}
            >
              Create BDA login
            </Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}
