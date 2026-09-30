import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-layout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { Organization } from '@/types';

export default function DashboardLayout() {
  const updateOrganization = useAuthStore((s) => s.updateOrganization);
  // Picks up logo / name changes made by an admin since this user signed in.
  const { data } = useQuery({
    queryKey: ['session-organization'],
    queryFn: () => api.data<{ organization: Organization | null }>('/auth/me'),
    staleTime: 5 * 60_000,
  });
  useEffect(() => {
    if (data?.organization) updateOrganization({ name: data.organization.name, logo: data.organization.logo });
  }, [data, updateOrganization]);

  return (
    <AppShell>
      <PageContainer>
        <Outlet />
      </PageContainer>
    </AppShell>
  );
}
