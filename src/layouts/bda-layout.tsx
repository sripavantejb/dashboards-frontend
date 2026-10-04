import { useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BdaShell } from '@/components/bda/bda-shell';
import { PageContainer } from '@/components/layout/page-layout';
import { PageLoading } from '@/components/shared/page-states';
import { api } from '@/lib/api';
import { bdaBasePath } from '@/lib/bda-path';
import { useAuthStore } from '@/stores/auth';
import type { Organization } from '@/types';
import BdaLoginPage from '@/pages/bda/login';

type SalesMe = {
  employee: { employeeCode?: string; _id: string };
  isSalesAdmin: boolean;
  modules: Record<string, boolean>;
  name: string;
};

/** Dedicated BDA portal shell — sales employees only; sales admins go to ERP Sales CRM. */
export default function BdaLayout() {
  const navigate = useNavigate();
  const { orgSlug = '' } = useParams<{ orgSlug: string }>();
  const { isAuthenticated, hasHydrated, user, organization, updateOrganization } = useAuthStore();
  const basePath = bdaBasePath(orgSlug);

  const sessionOrg = useQuery({
    queryKey: ['session-organization'],
    queryFn: () => api.data<{ organization: Organization | null }>('/auth/me'),
    staleTime: 5 * 60_000,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (sessionOrg.data?.organization) {
      const org = sessionOrg.data.organization;
      updateOrganization({ name: org.name, logo: org.logo, slug: org.slug });
    }
  }, [sessionOrg.data, updateOrganization]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;
    const ownSlug = organization?.slug || sessionOrg.data?.organization?.slug;
    if (ownSlug && orgSlug && ownSlug !== orgSlug) {
      navigate(bdaBasePath(ownSlug), { replace: true });
    }
  }, [hasHydrated, isAuthenticated, organization?.slug, sessionOrg.data?.organization?.slug, orgSlug, navigate]);

  const me = useQuery({
    queryKey: ['sales', '/me'],
    queryFn: () => api.data<SalesMe>('/sales-crm/me'),
    retry: false,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isAuthenticated || !me.isFetched) return;
    if (me.isError) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (me.data?.isSalesAdmin) {
      navigate('/sales-crm', { replace: true });
    }
  }, [isAuthenticated, me.isFetched, me.isError, me.data, navigate]);

  if (!hasHydrated) return null;
  if (!isAuthenticated) return <BdaLoginPage />;

  if (me.isLoading || !me.data) return <PageLoading />;
  if (me.isError || me.data.isSalesAdmin) return null;

  const slug = organization?.slug || orgSlug;

  return (
    <BdaShell
      modules={me.data.modules}
      employeeCode={me.data.employee?.employeeCode}
      displayName={me.data.name || user?.email || 'BDA'}
      basePath={basePath}
      orgSlug={slug}
    >
      <PageContainer className="max-w-[96rem]">
        <Outlet />
      </PageContainer>
    </BdaShell>
  );
}
