import { useAuthStore } from '@/stores/auth';
import { PageHeader } from '@/components/layout/page-header';
import { FormRow, PageGrid } from '@/components/layout/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Building2, Bell, Shield } from 'lucide-react';
import { Link } from 'react-router';

export default function SettingsPage() {
  const { user, organization } = useAuthStore();

  const sections = [
    { title: 'Profile', description: 'Update your name, phone, and password', href: '/settings/profile', icon: User },
    { title: 'Organization', description: organization?.name || 'Manage organization settings', href: '/settings/profile', icon: Building2 },
    { title: 'Notifications', description: 'Configure notification preferences', href: '/notifications', icon: Bell },
    { title: 'Security', description: 'Password and session management', href: '/settings/profile', icon: Shield },
  ];

  return (
    <>
      <PageHeader title="Settings" description="Manage your account and organization" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <FormRow>
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="text-sm font-medium">{user?.fullName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Role</p>
            <p className="text-sm font-medium capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Organization</p>
            <p className="text-sm font-medium">{organization?.name || '—'}</p>
          </div>
          </FormRow>
        </CardContent>
      </Card>

      <PageGrid cols="2">
        {sections.map((s) => (
          <Card key={s.title} className="hover:shadow-card transition-shadow">
            <CardContent className="pt-5 lg:pt-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-soft">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                  <Link to={s.href}>
                    <Button variant="link" className="px-0 h-auto mt-2">Configure →</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </PageGrid>
    </>
  );
}
