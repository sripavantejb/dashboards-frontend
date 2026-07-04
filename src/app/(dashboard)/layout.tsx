'use client';

import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-layout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );
}
