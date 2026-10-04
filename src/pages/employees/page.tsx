import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Plus, Trash2, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormRow, FormStack, ListRow } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageError, PageLoading, EmptyState } from '@/components/shared/page-states';
import { formatDate, getInitials } from '@/lib/utils';
import type { OrgUser } from '@/types';

export default function EmployeesPage() {
  const { user, organization } = useAuthStore();
  const isCompanyAdmin = user?.role === 'admin';
  const bdaLoginPath = `/${organization?.slug || 'company'}/bda`;
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'sales', department: '' });
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<OrgUser[]>('/users?limit=50'),
  });

  const createUser = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: (res) => {
      if (res.success) { toast.success('Employee added'); queryClient.invalidateQueries({ queryKey: ['users'] }); setShowNew(false); }
      else toast.error(res.error?.message || 'Failed to add employee');
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) => api.patch(`/users/${id}`, updates),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Employee updated'); },
  });

  const deactivateUser = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Employee deactivated'); },
  });

  const users = data?.data || [];

  return (
    <>
      <PageHeader
        title="Employees"
        description={isCompanyAdmin
          ? 'Create BDA (sales) logins and other company users. BDAs sign in at the branded portal URL. Manage modules in BDA settings or Sales CRM → Team.'
          : 'Team members in your organization'}
        action={isCompanyAdmin ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}${bdaLoginPath}`);
                toast.success('BDA login URL copied');
              } catch { toast.error('Could not copy URL'); }
            }}>
              <Copy className="mr-2 h-4 w-4" />Copy BDA URL
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link to="/bda-settings"><ExternalLink className="mr-2 h-4 w-4" />BDA settings</Link>
            </Button>
            <Button className="w-full sm:w-auto" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4 mr-2" />Create BDA / employee login
            </Button>
          </div>
        ) : undefined}
      />

      {isLoading ? <PageLoading rows={4} /> : isError ? <PageError onRetry={() => refetch()} /> : users.length === 0 ? <EmptyState message="No team members found." /> : (
        <div className="flex flex-col gap-3">
          {users.map((u) => (
            <Card key={u._id}>
              <CardContent className="p-0">
                <ListRow>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10"><AvatarFallback>{getInitials(`${u.firstName} ${u.lastName}`)}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <p className="font-medium">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>
                  <div className="flex items-center gap-2 flex-wrap">
                  {u.role === 'sales' && <Badge variant="outline">BDA portal</Badge>}
                  <select className="h-8 rounded-md border border-input bg-background px-2 text-xs capitalize" value={u.role}
                    onChange={(e) => updateUser.mutate({ id: u._id, updates: { role: e.target.value } })}>
                    {['admin', 'manager', 'sales', 'marketing', 'hr', 'finance', 'operations', 'developer'].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <Badge variant="outline">{u.department || 'No dept'}</Badge>
                  <span className="text-xs text-muted-foreground">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never logged in'}</span>
                  <Button size="sm" variant="ghost" className="text-error" onClick={() => deactivateUser.mutate(u._id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                </ListRow>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SimpleModal open={showNew} onClose={() => setShowNew(false)} title="Add Employee Login">
        <FormStack>
          <p className="text-sm text-muted-foreground mb-2">
            Create login credentials for a team member. Agency roles sign in at <code className="text-xs">/login</code>.
            {form.role === 'sales' && (
              <span className="mt-2 block rounded-md border border-hairline bg-surface-soft px-3 py-2 text-foreground">
                <strong>BDA portal:</strong> sales employees use your company URL{' '}
                <code className="text-xs">{bdaLoginPath}</code>
                {' '}(branded login + leads, calls, follow-ups, deals). They will not see Finance, Ops, or other agency modules.
              </span>
            )}
          </p>
          <FormRow>
            <FormField><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></FormField>
            <FormField><Label>Last Name *</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></FormField>
          </FormRow>
          <FormField><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
          <FormField><Label>Password *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></FormField>
          <FormRow>
            <FormField><Label>Role</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {(isCompanyAdmin
                  ? ['sales', 'manager', 'marketing', 'hr', 'finance', 'operations', 'developer', 'admin']
                  : ['sales', 'manager', 'marketing', 'hr', 'finance', 'operations', 'developer']
                ).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </FormField>
            <FormField><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></FormField>
          </FormRow>
          <FormActions>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button disabled={!form.email || !form.password || !form.firstName || createUser.isPending} onClick={() => createUser.mutate()}>Add</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}
