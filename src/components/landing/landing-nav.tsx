import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NavLinkMotion } from './landing-motion';
import { Link } from 'react-router';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Modules', href: '#modules' },
  { label: 'Platform', href: '#platform' },
  { label: 'Request Access', href: '#request-access' },
];

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <motion.header
      className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md"
      initial={reduceMotion ? undefined : { y: -20, opacity: 0 }}
      animate={reduceMotion ? undefined : { y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-6">
        <Link to="/" className="font-display text-lg font-semibold tracking-tight">
          Agency ERP
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <NavLinkMotion key={link.href} href={link.href}>
              {link.label}
            </NavLinkMotion>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <a href="#request-access">Request access</a>
          </Button>
        </div>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md border md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      <div
        className={cn(
          'overflow-hidden border-t bg-background transition-all duration-300 md:hidden',
          mobileOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0 border-t-0'
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-soft hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t pt-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <a href="#request-access" onClick={() => setMobileOpen(false)}>Request access</a>
            </Button>
          </div>
        </nav>
      </div>
    </motion.header>
  );
}
