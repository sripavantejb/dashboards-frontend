'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { LandingNav } from './landing-nav';
import { LandingHero } from './landing-hero';
import { LandingStats } from './landing-stats';
import { LandingFeaturesOverview } from './landing-features';
import { LandingFeatureDetail } from './landing-feature-detail';
import { LandingHowItWorks } from './landing-how-it-works';
import { LandingPlatform } from './landing-platform';
import { LandingRequestForm } from './landing-request-form';
import { LandingCta } from './landing-cta';
import { LandingFooter } from './landing-footer';
import { ScrollProgress } from './landing-motion';

export function LandingPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <LandingNav />
      <main>
        <LandingHero />
        <LandingStats />
        <LandingFeaturesOverview />
        <LandingFeatureDetail />
        <LandingHowItWorks />
        <LandingPlatform />
        <LandingRequestForm />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
