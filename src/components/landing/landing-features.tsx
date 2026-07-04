'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollSection, ScrollStagger, ScrollStaggerItem, ScrollHoverLift } from './landing-motion';
import { overviewFeatures } from './landing-data';

export function LandingFeaturesOverview() {
  return (
    <section id="features">
      <ScrollSection className="mx-auto max-w-6xl px-4 py-20 sm:py-28 lg:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Platform Overview</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Every module your agency needs, fully integrated
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Agency ERP replaces scattered spreadsheets, disconnected CRMs, and manual follow-up
            trackers with a single, cohesive platform — purpose-built for marketing and technology agencies.
          </p>
        </div>

        <ScrollStagger className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {overviewFeatures.map((feature) => (
            <ScrollStaggerItem key={feature.title}>
              <ScrollHoverLift className="h-full">
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10">
                      <feature.icon className="h-5 w-5 text-accent" />
                    </div>
                    <CardTitle className="text-base leading-snug">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="leading-relaxed">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </ScrollHoverLift>
            </ScrollStaggerItem>
          ))}
        </ScrollStagger>
      </ScrollSection>
    </section>
  );
}
