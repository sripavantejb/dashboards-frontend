'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/dashboard" className="hover:text-foreground transition-colors duration-200">Home</Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          <span>/</span>
          {item.href ? (
            <Link href={item.href} className={cn('hover:text-foreground transition-colors duration-200', pathname === item.href && 'text-foreground font-medium')}>
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  const content = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight leading-tight">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-2xl">{description}</p>
        )}
      </div>
      {action && (
        <motion.div
          className="flex shrink-0 items-center gap-2 w-full sm:w-auto"
          initial={reduceMotion ? false : { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {action}
        </motion.div>
      )}
    </div>
  );

  if (reduceMotion) return content;

  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {content}
    </motion.header>
  );
}
