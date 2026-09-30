import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cardReveal } from '@/lib/motion';

interface KpiCardProps {
  title: string;
  value: number | string;
  format?: 'currency' | 'number' | 'percent' | 'text';
  change?: number;
  icon?: React.ReactNode;
  className?: string;
}

export function KpiCard({ title, value, format = 'text', change, icon, className }: KpiCardProps) {
  const reduceMotion = useReducedMotion();

  const formattedValue =
    format === 'currency' ? formatCurrency(value as number) :
    format === 'number' ? formatNumber(value as number) :
    format === 'percent' ? `${value}%` :
    value;

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-display text-2xl font-semibold tracking-tight">{formattedValue}</p>
        {change !== undefined && (
          <span className={cn('flex items-center text-xs font-medium', change >= 0 ? 'text-success' : 'text-error')}>
            {change >= 0 ? <TrendingUp className="mr-0.5 h-3 w-3" /> : <TrendingDown className="mr-0.5 h-3 w-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
    </>
  );

  if (reduceMotion) {
    return (
      <div className={cn('rounded-lg border bg-card p-5 lg:p-6 shadow-card transition-shadow duration-300 hover:shadow-lg', className)}>
        {inner}
      </div>
    );
  }

  return (
    <motion.div
      className={cn('rounded-lg border bg-card p-5 lg:p-6 shadow-card', className)}
      variants={cardReveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-20px' }}
      whileHover={{ y: -4, boxShadow: '0 10px 28px rgba(0,0,0,0.09)', transition: { duration: 0.22 } }}
    >
      {inner}
    </motion.div>
  );
}
