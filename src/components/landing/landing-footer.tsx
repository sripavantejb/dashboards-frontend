import { footerLinks } from './landing-data';
import { ScrollSection, ScrollStagger, ScrollStaggerItem } from './landing-motion';
import { Link } from 'react-router';

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <ScrollSection as="footer" className="border-t bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
        <ScrollStagger className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <ScrollStaggerItem className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="font-display text-lg font-semibold tracking-tight">
              Agency ERP
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Enterprise-grade SaaS platform for marketing and technology agencies.
              CRM, pipeline, finance, and analytics — unified.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Powered by{' '}
              <a
                href="https://edicomedia.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:underline"
              >
                EditcoMedia
              </a>
            </p>
          </ScrollStaggerItem>

          <ScrollStaggerItem>
            <p className="text-sm font-semibold">Product</p>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </ScrollStaggerItem>

          <ScrollStaggerItem>
            <p className="text-sm font-semibold">Platform</p>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.platform.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </ScrollStaggerItem>

          <ScrollStaggerItem>
            <p className="text-sm font-semibold">Get started</p>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  {'external' in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </ScrollStaggerItem>
        </ScrollStagger>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {year} Agency ERP. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built by Editco Media — Marketing &amp; Technology Solutions
          </p>
        </div>
      </div>
    </ScrollSection>
  );
}
