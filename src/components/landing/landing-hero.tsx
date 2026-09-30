import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LandingDashboardPreview } from './landing-dashboard-preview';
import { HeroStagger, HeroStaggerItem, ScrollParallax } from './landing-motion';
import { Link } from 'react-router';

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(var(--accent)/0.12),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-16 sm:pt-20 lg:px-6 lg:pb-12 lg:pt-28">
        <HeroStagger className="mx-auto max-w-4xl text-center">
          <HeroStaggerItem>
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm">
              Enterprise SaaS for Marketing Agencies
            </Badge>
          </HeroStaggerItem>

          <HeroStaggerItem>
            <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              The operating system for{' '}
              <span className="text-accent">modern agencies</span>
            </h1>
          </HeroStaggerItem>

          <HeroStaggerItem>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Agency ERP unifies your entire sales cycle — from lead capture and cold calling
              to proposals, project delivery, and financial reporting — in one production-ready platform.
            </p>
          </HeroStaggerItem>

          <HeroStaggerItem>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <a href="#request-access">
                  Request access
                  <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </HeroStaggerItem>

          <HeroStaggerItem>
            <p className="mt-4 text-xs text-muted-foreground">
              Available by request · Our team will set up your workspace
            </p>
          </HeroStaggerItem>
        </HeroStagger>

        <ScrollParallax speed={0.12} className="relative mx-auto mt-16 max-w-4xl">
          <LandingDashboardPreview />
        </ScrollParallax>
      </div>
    </section>
  );
}
