'use client';

import { ScrollSection, ScrollStagger, ScrollStaggerItem } from './landing-motion';
import { stats } from './landing-data';

export function LandingStats() {
  return (
    <ScrollSection className="border-y bg-surface-soft" as="div">
      <ScrollStagger className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-12 sm:grid-cols-4 lg:px-6">
        {stats.map((stat) => (
          <ScrollStaggerItem key={stat.label} className="text-center">
            <p className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </ScrollStaggerItem>
        ))}
      </ScrollStagger>
    </ScrollSection>
  );
}
