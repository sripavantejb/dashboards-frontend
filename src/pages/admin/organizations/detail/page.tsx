import { adminPath } from '@/lib/admin-routes';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, KeyRound, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormRow, FormStack, ListRow, PageSection } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageLoading, EmptyState } from '@/components/shared/page-states';
import { formatDate, getInitials } from '@/lib/utils';
import type { AdminOrganization, OrgUser } from '@/types';
import { Link, useParams } from 'react-router';
import { CompanyDatabaseCard } from '@/components/admin/company-database-card';
import { CompanyProfileCard } from '@/components/company/company-profile-card';
import { NotificationEmailsCard } from '@/components/company/notification-emails-card';
import { SmtpConnectionCard } from '@/components/company/smtp-connection-card';

const ROLES = ['admin', 'manager', 'sales', 'marketing', 'hr', 'finance', 'operations', 'developer'];

export default function CompanyUsersPage() {
  const { id } = useParams() as { id: string };
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [resetUser, setResetUser] = useState<OrgUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'admin',
    department: '',
  });

  const { data: orgData } = useQuery({
    queryKey: ['admin-organization', id],
    queryFn: () => api.get<AdminOrganization>(`/admin/organizations/${id}`),
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-org-users', id],
    queryFn: () => api.get<OrgUser[]>(`/admin/organizations/${id}/users`),
  });

  const createMutation = useMutation({
    mutationFn: () => api.data(`/admin/organizations/${id}/users`, 'POST', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-users', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      setShowCreate(false);
      setForm({ email: '', password: '', firstName: '', lastName: '', role: 'admin', department: '' });
      toast.success('Company login created — share credentials with the company admin');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create login'),
  });

  const resetMutation = useMutation({
    mutationFn: () => api.data(`/admin/organizations/${id}/users/${resetUser!._id}`, 'PATCH', { password: newPassword }),
    onSuccess: () => {
      setResetUser(null);
      setNewPassword('');
      toast.success('Password reset successfully');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to reset password'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => api.data(`/admin/organizations/${id}/users/${userId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-users', id] });
      toast.success('User deactivated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to deactivate user'),
  });

  const org = orgData?.data;
  const users = usersData?.data || [];

  return (
    <>
      <PageHeader
        title={org?.name || 'Company Logins'}
        description="Super admin: create and manage ERP login credentials for this company"
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to={adminPath('organizations')}>
              <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            </Link>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create Company Admin Login
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-5 lg:p-6 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground">Hierarchy:</strong> You (Super Admin) create company admin logins here → Company admins sign in at <Link to="/login" className="underline">/login</Link> → They manage employees from their <strong>Employees</strong> page.</p>
        </CardContent>
      </Card>

      <CompanyProfileCard base={`/admin/organizations/${id}/settings`} onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-organization', id] })} />
      <SmtpConnectionCard base={`/admin/organizations/${id}/settings`} />
      <NotificationEmailsCard base={`/admin/organizations/${id}/settings`} />
      <CompanyDatabaseCard organizationId={id} slug={org?.slug} />

      {isLoading ? (
        <PageLoading rows={4} />
      ) : users.length === 0 ? (
        <EmptyState message="No users yet. Create the first company admin login." />
      ) : (
        <PageSection>
          {users.map((u) => (
            <Card key={u._id}>
              <CardContent className="p-0">
                <ListRow>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(`${u.firstName} ${u.lastName}`)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{u.firstName} {u.lastName}</p>
                      {u.role === 'admin' && (
                        <Badge><Shield className="h-3 w-3 mr-1" /> Company Admin</Badge>
                      )}
                      <Badge variant="outline" className="capitalize">{u.role}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Last login: {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setResetUser(u); setNewPassword(''); }}>
                    <KeyRound className="h-3 w-3 mr-1" /> Reset Password
                  </Button>
                  <Button size="sm" variant="ghost" className="text-error" onClick={() => deactivateMutation.mutate(u._id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                </ListRow>
              </CardContent>
            </Card>
          ))}
        </PageSection>
      )}

      <SimpleModal open={showCreate} onClose={() => setShowCreate(false)} title="Create Company Admin Login">
        <FormStack>
          <p className="text-sm text-muted-foreground">These credentials let the company admin sign in at /login and manage their team.</p>
          <FormRow>
            <FormField><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></FormField>
            <FormField><Label>Last Name *</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></FormField>
          </FormRow>
          <FormField><Label>Login Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
          <FormField><Label>Password *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" /></FormField>
          <FormRow>
            <FormField>
              <Label>Role</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </FormField>
            <FormField><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></FormField>
          </FormRow>
          <FormActions>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button disabled={!form.email || !form.password || !form.firstName || createMutation.isPending} onClick={() => createMutation.mutate()}>
              Create Login
            </Button>
          </FormActions>
        </FormStack>
      </SimpleModal>

      <SimpleModal open={!!resetUser} onClose={() => setResetUser(null)} title={`Reset Password — ${resetUser?.email}`}>
        <FormStack>
          <FormField>
            <Label>New Password *</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
          </FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setResetUser(null)}>Cancel</Button>
            <Button disabled={newPassword.length < 8 || resetMutation.isPending} onClick={() => resetMutation.mutate()}>
              Reset Password
            </Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}
