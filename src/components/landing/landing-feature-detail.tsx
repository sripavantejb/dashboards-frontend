import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollSection, ScrollReveal } from './landing-motion';
import { detailedFeatures } from './landing-data';

export function LandingFeatureDetail() {
  return (
    <section id="modules" className="bg-surface-soft">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28 lg:px-6">
        <ScrollSection className="mx-auto max-w-3xl text-center" as="div">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Deep Dive</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Production-ready features, explained in detail
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Every module in Agency ERP is fully functional — not a placeholder.
            Here is what you get out of the box.
          </p>
        </ScrollSection>

        <div className="mt-20 space-y-24 sm:space-y-32">
          {detailedFeatures.map((feature, index) => {
            const isReversed = index % 2 === 1;

            return (
              <div key={feature.id} id={feature.id} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <ScrollReveal direction={isReversed ? 'right' : 'left'}>
                  <div className="relative overflow-hidden rounded-2xl border bg-background p-8 shadow-card lg:p-10">
                    <div
                      className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl"
                      aria-hidden
                    />
                    <div className="relative">
                      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10">
                        <feature.icon className="h-7 w-7 text-accent" />
                      </div>
                      <Badge variant="outline" className="mb-4">
                        {feature.badge}
                      </Badge>
                      <h3 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                        {feature.title}
                      </h3>
                      <p className="mt-4 leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                      {feature.metrics && (
                        <div className="mt-6 flex flex-wrap gap-3">
                          {feature.metrics.map((m) => (
                            <div
                              key={m.label}
                              className="rounded-lg border bg-surface-soft px-4 py-2.5"
                            >
                              <p className="text-xs text-muted-foreground">{m.label}</p>
                              <p className="mt-0.5 text-sm font-semibold">{m.value}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollReveal>

                <ScrollReveal direction={isReversed ? 'left' : 'right'} delay={0.1}>
                  <div>
                    <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                      What&apos;s included
                    </p>
                    <ul className="space-y-4">
                      {feature.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10">
                            <Check className="h-3 w-3 text-accent" />
                          </span>
                          <span className="text-sm leading-relaxed text-foreground sm:text-base">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </ScrollReveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
