'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollSection, ScrollStagger, ScrollStaggerItem, ScrollHoverLift } from './landing-motion';
import { workflowSteps } from './landing-data';

export function LandingHowItWorks() {
  return (
    <section id="how-it-works">
      <ScrollSection className="mx-auto max-w-6xl px-4 py-20 sm:py-28 lg:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Getting Started</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            From signup to scaled operations in four steps
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Agency ERP is designed for fast onboarding. Your team can be up and running
            with imported leads and an active pipeline on day one.
          </p>
        </div>

        <ScrollStagger className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {workflowSteps.map((step) => (
            <ScrollStaggerItem key={step.step}>
              <ScrollHoverLift className="h-full">
                <Card className="relative h-full overflow-hidden">
                  <CardHeader>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-xs font-medium text-accent">{step.step}</span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                        <step.icon className="h-4 w-4 text-accent" />
                      </div>
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="leading-relaxed">{step.description}</CardDescription>
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
