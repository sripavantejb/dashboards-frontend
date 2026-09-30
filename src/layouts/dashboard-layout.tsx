import { Outlet } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-layout';

export default function DashboardLayout() {
  return (
    <AppShell>
      <PageContainer>
        <Outlet />
      </PageContainer>
    </AppShell>
  );
}
