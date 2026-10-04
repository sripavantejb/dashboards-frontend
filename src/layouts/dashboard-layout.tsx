import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-layout';
import { PageLoading } from '@/components/shared/page-states';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { Organization } from '@/types';

/** Agency ERP shell — BDAs (non–sales-admin SalesEmployees) are redirected to /bda. */
export default function DashboardLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, updateOrganization } = useAuthStore();
  const { data } = useQuery({
    queryKey: ['session-organization'],
    queryFn: () => api.data<{ organization: Organization | null }>('/auth/me'),
    staleTime: 5 * 60_000,
  });
  useEffect(() => {
    if (data?.organization) updateOrganization({ name: data.organization.name, logo: data.organization.logo });
  }, [data, updateOrganization]);

  const salesMe = useQuery({
    queryKey: ['sales', '/me'],
    queryFn: () => api.data<{ isSalesAdmin: boolean }>('/sales-crm/me'),
    retry: false,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!salesMe.isFetched || salesMe.isError || !salesMe.data) return;
    if (!salesMe.data.isSalesAdmin) {
      navigate('/bda', { replace: true });
    }
  }, [salesMe.isFetched, salesMe.isError, salesMe.data, navigate]);

  if (salesMe.isLoading) return <PageLoading />;
  if (salesMe.data && !salesMe.data.isSalesAdmin) return null;

  return (
    <AppShell>
      <PageContainer>
        <Outlet />
      </PageContainer>
    </AppShell>
  );
}
