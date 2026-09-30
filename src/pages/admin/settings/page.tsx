import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus, Trash2, Settings, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { FormField, FormRow, FormStack } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageLoading } from '@/components/shared/page-states';
import { formatDate } from '@/lib/utils';
import type { PlatformSettings, RegistrationInvite } from '@/types';

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter (5 users)',
  professional: 'Professional (25 users)',
  enterprise: 'Enterprise (999 users)',
};

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    organizationName: '',
    plan: 'starter',
    expiresInDays: 7,
  });

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get<PlatformSettings>('/admin/settings'),
  });

  const { data: invitesData } = useQuery({
    queryKey: ['admin-invites'],
    queryFn: () => api.get<RegistrationInvite[]>('/admin/invites'),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (updates: Partial<PlatformSettings>) => api.patch('/admin/settings', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Settings updated');
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: () => api.post<RegistrationInvite>('/admin/invites', inviteForm),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
      setShowInviteForm(false);
      setInviteForm({ email: '', organizationName: '', plan: 'starter', expiresInDays: 7 });
      if (res.data?.token) {
        const link = `${window.location.origin}/register?invite=${res.data.token}`;
        navigator.clipboard.writeText(link);
        toast.success('Invite created — link copied to clipboard');
      }
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/invites/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
      toast.success('Invite revoked');
    },
  });

  const settings = settingsData?.data;
  const invites = invitesData?.data || [];

  if (isLoading) return <PageLoading rows={4} />;

  return (
    <>
      <PageHeader
        title="Platform Settings"
        description="Registration mode, subscription plans, and invite links"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" /> Registration Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex items-center justify-between rounded-lg border p-4 cursor-pointer">
            <div>
              <p className="font-medium text-sm">Invite-only registration</p>
              <p className="text-xs text-muted-foreground">Only users with an invite link can register</p>
            </div>
            <input
              type="checkbox"
              checked={settings?.inviteOnlyMode ?? true}
              onChange={(e) => updateSettingsMutation.mutate({ inviteOnlyMode: e.target.checked })}
              className="h-4 w-4"
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border p-4 cursor-pointer">
            <div>
              <p className="font-medium text-sm">Allow public registration</p>
              <p className="text-xs text-muted-foreground">Anyone can sign up without an invite (overrides invite-only when enabled)</p>
            </div>
            <input
              type="checkbox"
              checked={settings?.allowPublicRegistration ?? false}
              onChange={(e) => updateSettingsMutation.mutate({ allowPublicRegistration: e.target.checked })}
              className="h-4 w-4"
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription Plans</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {Object.entries(settings?.plans || {}).map(([key, plan]) => (
            <div key={key} className="rounded-lg border p-4">
              <Badge className="mb-2 capitalize">{key}</Badge>
              <p className="font-medium">{plan.label}</p>
              <p className="text-xs text-muted-foreground mt-1">Up to {plan.maxUsers} users</p>
              <p className="text-sm font-semibold mt-2">₹{plan.monthlyPrice.toLocaleString('en-IN')}/mo</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" /> Registration Invites
          </CardTitle>
          <Button size="sm" onClick={() => setShowInviteForm(true)}>
            <Plus className="h-3 w-3 mr-1" /> Create Invite
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No active invites</p>
          ) : (
            invites.map((invite) => {
              const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?invite=${invite.token}`;
              return (
                <div key={invite._id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{invite.plan}</Badge>
                      {invite.email && <span className="text-sm">{invite.email}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {invite.organizationName || 'Any organization'} · Expires {formatDate(invite.expiresAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(link);
                        toast.success('Invite link copied');
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy Link
                    </Button>
                    <Button size="sm" variant="ghost" className="text-error" onClick={() => revokeInviteMutation.mutate(invite._id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <SimpleModal open={showInviteForm} onClose={() => setShowInviteForm(false)} title="Create Registration Invite">
        <FormStack>
          <FormField>
            <Label>Email (optional — locks invite to this email)</Label>
            <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} />
          </FormField>
          <FormField>
            <Label>Organization Name (optional pre-fill)</Label>
            <Input value={inviteForm.organizationName} onChange={(e) => setInviteForm({ ...inviteForm, organizationName: e.target.value })} />
          </FormField>
          <FormRow>
            <FormField>
              <Label>Plan</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={inviteForm.plan}
                onChange={(e) => setInviteForm({ ...inviteForm, plan: e.target.value })}
              >
                {Object.entries(PLAN_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </FormField>
            <FormField>
              <Label>Expires in (days)</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={inviteForm.expiresInDays}
                onChange={(e) => setInviteForm({ ...inviteForm, expiresInDays: Number(e.target.value) })}
              />
            </FormField>
          </FormRow>
          <Button onClick={() => createInviteMutation.mutate()} disabled={createInviteMutation.isPending}>
            Create & Copy Link
          </Button>
        </FormStack>
      </SimpleModal>
    </>
  );
}
