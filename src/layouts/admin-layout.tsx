import { Outlet } from 'react-router';
import { AdminShell } from '@/components/admin/admin-shell';
import { PageContainer } from '@/components/layout/page-layout';

export default function AdminLayout() {
  return (
    <AdminShell>
      <PageContainer>
        <Outlet />
      </PageContainer>
    </AdminShell>
  );
}
