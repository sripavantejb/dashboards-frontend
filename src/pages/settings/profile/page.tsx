import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { PageHeader } from '@/components/layout/page-header';
import { FormField, FormRow, FormStack, PageNarrow } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { toast } from 'sonner';

export default function ProfileSettingsPage() {
  const { user, setAuth, organization } = useAuthStore();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [initialized, setInitialized] = useState(false);

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get<{ firstName: string; lastName: string; phone?: string; email: string }>('/auth/me');
      if (res.data && !initialized) {
        setProfile({ firstName: res.data.firstName, lastName: res.data.lastName, phone: res.data.phone || '' });
        setInitialized(true);
      }
      return res;
    },
  });

  const updateProfile = useMutation({
    mutationFn: () => api.patch('/auth/me', profile),
    onSuccess: (res) => {
      if (res.success && res.data && user) {
        const u = res.data as { firstName: string; lastName: string; fullName: string; phone?: string };
        setAuth({ ...user, firstName: u.firstName, lastName: u.lastName, fullName: u.fullName, phone: u.phone }, organization, localStorage.getItem('accessToken') || '');
        toast.success('Profile updated');
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      } else {
        toast.error(res.error?.message || 'Update failed');
      }
    },
  });

  const changePassword = useMutation({
    mutationFn: () => api.post('/auth/change-password', {
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
    }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Password changed');
        setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      } else {
        toast.error(res.error?.message || 'Password change failed');
      }
    },
  });

  if (isLoading) return <><PageHeader title="Profile Settings" /><PageLoading /></>;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <>
      <PageHeader title="Profile Settings" description="Manage your account information" />

      <PageNarrow>
      <Card>
        <CardContent className="pt-5 lg:pt-6">
        <FormStack>
          <h3 className="font-medium">Personal Information</h3>
          <FormField>
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled />
          </FormField>
          <FormRow>
            <FormField>
              <Label>First Name</Label>
              <Input value={profile.firstName} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
            </FormField>
            <FormField>
              <Label>Last Name</Label>
              <Input value={profile.lastName} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
            </FormField>
          </FormRow>
          <FormField>
            <Label>Phone</Label>
            <Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
          </FormField>
          <Button className="w-full sm:w-auto" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? 'Saving...' : 'Save Profile'}
          </Button>
        </FormStack>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 lg:pt-6">
        <FormStack>
          <h3 className="font-medium">Change Password</h3>
          <FormField>
            <Label>Current Password</Label>
            <Input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))} />
          </FormField>
          <FormRow>
            <FormField>
              <Label>New Password</Label>
              <Input type="password" value={passwords.newPassword} onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} />
            </FormField>
            <FormField>
              <Label>Confirm Password</Label>
              <Input type="password" value={passwords.confirm} onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))} />
            </FormField>
          </FormRow>
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            disabled={!passwords.currentPassword || !passwords.newPassword || passwords.newPassword !== passwords.confirm || changePassword.isPending}
            onClick={() => changePassword.mutate()}
          >
            Change Password
          </Button>
        </FormStack>
        </CardContent>
      </Card>
      </PageNarrow>
    </>
  );
}
