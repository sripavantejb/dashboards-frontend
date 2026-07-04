'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollSection, ScrollReveal } from './landing-motion';

export function LandingCta() {
  return (
    <ScrollSection className="relative overflow-hidden bg-primary px-4 py-20 sm:py-28 lg:px-6">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,hsl(var(--accent)/0.25),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <ScrollReveal direction="up">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-primary-foreground sm:text-4xl lg:text-5xl">
            Ready to run your agency like a product company?
          </h2>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.1}>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-primary-foreground/70">
            Request access to Agency ERP and our team will walk you through the platform,
            understand your agency needs, and set up your workspace.
          </p>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.2}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              variant="secondary"
              className="w-full bg-background text-foreground hover:bg-background/90 sm:w-auto"
              asChild
            >
              <a href="#request-access">
                Request access
                <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
              asChild
            >
              <a href="/login">Sign in</a>
            </Button>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.3}>
          <p className="mt-6 text-sm text-primary-foreground/50">
            Powered by{' '}
            <a
              href="https://edicomedia.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-primary-foreground/70"
            >
              EditcoMedia
            </a>
            {' '}— Marketing &amp; Technology Solutions
          </p>
        </ScrollReveal>
      </div>
    </ScrollSection>
  );
}
