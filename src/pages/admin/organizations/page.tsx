import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Power, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { FormField, FormRow, FormStack, ListRow, PageSection } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageLoading, EmptyState } from '@/components/shared/page-states';
import { formatDate, formatDuration } from '@/lib/utils';
import type { AdminOrganization } from '@/types';
import { Link } from 'react-router';

const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter — 5 users (Free)' },
  { value: 'professional', label: 'Professional — 25 users' },
  { value: 'enterprise', label: 'Enterprise — 999 users' },
];

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

export default function AdminOrganizationsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    industry: '',
    website: '',
    plan: 'starter',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: () => api.get<AdminOrganization[]>('/admin/organizations'),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/admin/organizations', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setShowForm(false);
      setForm({ name: '', industry: '', website: '', plan: 'starter', adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '' });
      toast.success('Company created with ERP admin login');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create company'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) =>
      api.patch(`/admin/organizations/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      toast.success('Company updated');
    },
  });

  const orgs = data?.data || [];

  return (
    <>
      <PageHeader
        title="Companies & Agencies"
        description="Provision tenants with subscription plans and ERP admin logins"
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Company
          </Button>
        }
      />

      {isLoading ? (
        <PageLoading rows={4} />
      ) : orgs.length === 0 ? (
        <EmptyState message="No companies yet. Create your first agency tenant." />
      ) : (
        <PageSection>
          {orgs.map((org) => (
            <Card key={org._id}>
              <CardContent className="p-0">
                <ListRow>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-surface-soft p-2">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{org.name}</p>
                      <Badge variant={org.isActive ? 'default' : 'outline'}>
                        {org.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PLAN_COLORS[org.subscriptionPlan] || ''}`}>
                        {org.subscriptionPlan}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{org.slug} · {org.industry || 'No industry'}</p>
                    {org.adminUser && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Admin: {org.adminUser.firstName} {org.adminUser.lastName} ({org.adminUser.email})
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {org.userCount}/{org.maxUsers} users · {formatDuration(org.totalTimeSeconds)} total time
                      {org.planExpiresAt && ` · Plan expires ${formatDate(org.planExpiresAt)}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin/organizations/${org._id}`}>
                    <Button size="sm" variant="default">
                      <Users className="h-3 w-3 mr-1" /> Manage Logins
                    </Button>
                  </Link>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs capitalize"
                    value={org.subscriptionPlan}
                    onChange={(e) => updateMutation.mutate({ id: org._id, updates: { subscriptionPlan: e.target.value } })}
                  >
                    {PLAN_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateMutation.mutate({ id: org._id, updates: { isActive: !org.isActive } })}
                  >
                    <Power className="h-3 w-3 mr-1" />
                    {org.isActive ? 'Suspend' : 'Activate'}
                  </Button>
                </div>
                </ListRow>
              </CardContent>
            </Card>
          ))}
        </PageSection>
      )}

      <SimpleModal open={showForm} onClose={() => setShowForm(false)} title="Create Company & ERP Login">
        <FormStack>
          <FormField>
            <Label>Company Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Agency" />
          </FormField>
          <FormRow>
            <FormField>
              <Label>Industry</Label>
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Marketing" />
            </FormField>
            <FormField>
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
            </FormField>
          </FormRow>
          <FormField>
            <Label>Subscription Plan</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </FormField>
          <p className="text-sm font-medium pt-2">ERP Admin Login</p>
          <FormRow>
            <FormField>
              <Label>First Name *</Label>
              <Input value={form.adminFirstName} onChange={(e) => setForm({ ...form, adminFirstName: e.target.value })} />
            </FormField>
            <FormField>
              <Label>Last Name *</Label>
              <Input value={form.adminLastName} onChange={(e) => setForm({ ...form, adminLastName: e.target.value })} />
            </FormField>
          </FormRow>
          <FormField>
            <Label>Admin Email *</Label>
            <Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
          </FormField>
          <FormField>
            <Label>Admin Password *</Label>
            <Input type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="Min 8 characters" />
          </FormField>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!form.name || !form.adminEmail || !form.adminPassword || !form.adminFirstName || createMutation.isPending}
          >
            Create Company
          </Button>
        </FormStack>
      </SimpleModal>
    </>
  );
}
