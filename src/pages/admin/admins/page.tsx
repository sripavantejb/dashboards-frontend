import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { FormField, FormRow, FormStack, ListRow, PageSection } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageLoading, EmptyState } from '@/components/shared/page-states';
import { formatDate, getInitials } from '@/lib/utils';
import type { OrgUser } from '@/types';

export default function AdminAdminsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-platform-admins'],
    queryFn: () => api.get<OrgUser[]>('/admin/platform-admins'),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/admin/platform-admins', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-platform-admins'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setShowForm(false);
      setForm({ email: '', password: '', firstName: '', lastName: '' });
      toast.success('Platform admin created');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create admin'),
  });

  const admins = data?.data || [];

  return (
    <>
      <PageHeader
        title="Platform Admins"
        description="SaaS super admins with full platform access"
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Admin
          </Button>
        }
      />

      {isLoading ? (
        <PageLoading rows={3} />
      ) : admins.length === 0 ? (
        <EmptyState message="No platform admins found." />
      ) : (
        <PageSection>
          {admins.map((admin) => (
            <Card key={admin._id}>
              <CardContent className="p-0">
                <ListRow className="sm:items-center">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getInitials(`${admin.firstName} ${admin.lastName}`)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{admin.firstName} {admin.lastName}</p>
                        <Badge><Shield className="h-3 w-3 mr-1" /> super_admin</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{admin.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Last login: {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : 'Never'}
                      </p>
                    </div>
                  </div>
                </ListRow>
              </CardContent>
            </Card>
          ))}
        </PageSection>
      )}

      <SimpleModal open={showForm} onClose={() => setShowForm(false)} title="Create Platform Admin">
        <FormStack>
          <FormRow>
            <FormField>
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </FormField>
            <FormField>
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </FormField>
          </FormRow>
          <FormField>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField>
            <Label>Password *</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
          </FormField>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!form.email || !form.password || !form.firstName || createMutation.isPending}
          >
            Create Admin
          </Button>
        </FormStack>
      </SimpleModal>
    </>
  );
}
