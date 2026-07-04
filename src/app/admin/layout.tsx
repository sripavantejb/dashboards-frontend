'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { PageContainer } from '@/components/layout/page-layout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      <PageContainer>{children}</PageContainer>
    </AdminShell>
  );
}
