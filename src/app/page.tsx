import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/landing-page';

export const metadata: Metadata = {
  title: 'Agency ERP — The Operating System for Modern Agencies',
  description:
    'Production-ready SaaS for marketing agencies. CRM, sales pipeline, cold calling, proposals, finance, analytics, and multi-tenant platform — powered by EditcoMedia.',
};

export default function Home() {
  return <LandingPage />;
}
