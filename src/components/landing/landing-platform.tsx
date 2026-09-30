import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollSection, ScrollStagger, ScrollStaggerItem, ScrollReveal, ScrollHoverLift } from './landing-motion';
import { platformCapabilities } from './landing-data';

export function LandingPlatform() {
  return (
    <section id="platform">
      <ScrollSection className="border-t bg-background px-4 py-20 sm:py-28 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">Infrastructure</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Built on enterprise-grade architecture
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Agency ERP is a true multi-tenant SaaS — not a single-tenant tool with a login page.
              Security, isolation, and scalability are built into the foundation.
            </p>
          </div>

          <ScrollStagger className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {platformCapabilities.map((cap) => (
              <ScrollStaggerItem key={cap.title}>
                <ScrollHoverLift className="h-full">
                  <Card className="h-full">
                    <CardHeader>
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5">
                        <cap.icon className="h-5 w-5 text-foreground" />
                      </div>
                      <CardTitle className="text-base">{cap.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="leading-relaxed">{cap.description}</CardDescription>
                    </CardContent>
                  </Card>
                </ScrollHoverLift>
              </ScrollStaggerItem>
            ))}
          </ScrollStagger>

          <ScrollReveal direction="scale" className="mt-16">
            <div className="rounded-2xl border bg-surface-soft p-8 sm:p-10">
              <ScrollStagger className="grid gap-8 sm:grid-cols-3">
                {[
                  { title: 'Next.js 15', desc: 'Modern React frontend with App Router' },
                  { title: 'Node.js + MongoDB', desc: 'Scalable REST API with Mongoose ODM' },
                  { title: 'JWT + RBAC', desc: 'Secure auth with granular permissions' },
                ].map((item) => (
                  <ScrollStaggerItem key={item.title}>
                    <div>
                      <p className="font-display text-3xl font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </ScrollStaggerItem>
                ))}
              </ScrollStagger>
            </div>
          </ScrollReveal>
        </div>
      </ScrollSection>
    </section>
  );
}
