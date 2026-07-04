'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface AuthSplitStep {
  number: number;
  label: string;
}

export interface AuthSplitLayoutProps {
  badge: string;
  headline: string;
  subheadline?: string;
  steps: AuthSplitStep[];
  formTitle: string;
  formDescription: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  passwordLabel?: string;
  passwordPlaceholder?: string;
  submitLabel?: string;
  loading?: boolean;
  footer?: React.ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  emailRegister: React.InputHTMLAttributes<HTMLInputElement>;
  passwordRegister: React.InputHTMLAttributes<HTMLInputElement>;
  emailError?: string;
  passwordError?: string;
}

export function AuthSplitLayout({
  badge,
  headline,
  subheadline = 'Just 2 simple steps',
  steps,
  formTitle,
  formDescription,
  emailLabel = 'Email',
  emailPlaceholder = 'you@company.com',
  passwordLabel = 'Password',
  passwordPlaceholder = 'Password',
  submitLabel = 'Sign in',
  loading = false,
  footer,
  onSubmit,
  emailRegister,
  passwordRegister,
  emailError,
  passwordError,
}: AuthSplitLayoutProps) {
  const [showPassword, setShowPassword] = useState(false);
  const reduceMotion = useReducedMotion();
  const year = new Date().getFullYear();

  const panelMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, x: -24 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
      };

  const formMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] },
      };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left panel — branding & steps */}
      <motion.div
        className="relative hidden flex-col justify-between overflow-hidden bg-primary px-10 py-12 text-primary-foreground lg:flex lg:px-14 lg:py-16"
        {...panelMotion}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 L20 0 L40 20 L20 40 Z' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10">
          <Badge
            variant="outline"
            className="border-primary-foreground/25 bg-primary-foreground/10 px-4 py-1.5 text-sm text-primary-foreground"
          >
            {badge}
          </Badge>
        </div>

        <div className="relative z-10 max-w-md space-y-8">
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            {headline}
          </h1>
          <p className="text-sm text-primary-foreground/60">{subheadline}</p>
          <ol className="space-y-5">
            {steps.map((step, index) => (
              <li key={step.number} className="flex items-center gap-4">
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    index === 0
                      ? 'bg-primary-foreground text-primary'
                      : 'bg-primary-foreground/15 text-primary-foreground/70'
                  )}
                >
                  {step.number}
                </span>
                <span
                  className={cn(
                    'text-sm font-medium',
                    index === 0 ? 'text-primary-foreground' : 'text-primary-foreground/60'
                  )}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p className="relative z-10 text-xs text-primary-foreground/40">
          Powered by{' '}
          <a
            href="https://edicomedia.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary-foreground/60"
          >
            EditcoMedia
          </a>
        </p>
      </motion.div>

      {/* Right panel — form */}
      <motion.div
        className="flex min-h-screen flex-col bg-background"
        {...formMotion}
      >
        <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
          {/* Mobile header */}
          <div className="mb-8 lg:hidden">
            <Link href="/" className="font-display text-lg font-semibold tracking-tight">
              Agency ERP
            </Link>
            <Badge variant="outline" className="ml-3 text-xs">
              {badge}
            </Badge>
          </div>

          <div className="mx-auto w-full max-w-md">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {formTitle}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{formDescription}</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="auth-email">{emailLabel}</Label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder={emailPlaceholder}
                  className="h-11"
                  {...emailRegister}
                />
                {emailError && <p className="text-xs text-error">{emailError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-password">{passwordLabel}</Label>
                <div className="relative">
                  <Input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={passwordPlaceholder}
                    className="h-11 pr-10"
                    {...passwordRegister}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordError && <p className="text-xs text-error">{passwordError}</p>}
              </div>

              <Button
                type="submit"
                className="h-11 w-full text-sm font-semibold uppercase tracking-wide"
                disabled={loading}
              >
                {loading ? 'Signing in...' : submitLabel}
              </Button>
            </form>

            {footer && (
              <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
            )}
          </div>
        </div>

        <p className="px-6 pb-6 text-center text-xs text-muted-foreground lg:text-left lg:px-16">
          &copy; {year} Agency ERP
        </p>
      </motion.div>
    </div>
  );
}
