import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BdaShell } from '@/components/bda/bda-shell';
import { PageContainer } from '@/components/layout/page-layout';
import { PageLoading } from '@/components/shared/page-states';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { Organization } from '@/types';

type SalesMe = {
  employee: { employeeCode?: string; _id: string };
  isSalesAdmin: boolean;
  modules: Record<string, boolean>;
  name: string;
};

/** Dedicated BDA portal shell — sales employees only; sales admins go to ERP Sales CRM. */
export default function BdaLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, hasHydrated, user, updateOrganization } = useAuthStore();

  const sessionOrg = useQuery({
    queryKey: ['session-organization'],
    queryFn: () => api.data<{ organization: Organization | null }>('/auth/me'),
    staleTime: 5 * 60_000,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (sessionOrg.data?.organization) {
      updateOrganization({ name: sessionOrg.data.organization.name, logo: sessionOrg.data.organization.logo });
    }
  }, [sessionOrg.data, updateOrganization]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) navigate('/login');
  }, [hasHydrated, isAuthenticated, navigate]);

  const me = useQuery({
    queryKey: ['sales', '/me'],
    queryFn: () => api.data<SalesMe>('/sales-crm/me'),
    retry: false,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!me.isFetched) return;
    if (me.isError) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (me.data?.isSalesAdmin) {
      navigate('/sales-crm', { replace: true });
    }
  }, [me.isFetched, me.isError, me.data, navigate]);

  if (!hasHydrated || !isAuthenticated) return null;
  if (me.isLoading || !me.data) return <PageLoading />;
  if (me.isError || me.data.isSalesAdmin) return null;

  return (
    <BdaShell
      modules={me.data.modules}
      employeeCode={me.data.employee?.employeeCode}
      displayName={me.data.name || user?.email || 'BDA'}
    >
      <PageContainer className="max-w-[96rem]">
        <Outlet />
      </PageContainer>
    </BdaShell>
  );
}
