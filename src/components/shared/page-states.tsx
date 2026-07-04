'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function PageLoading({ rows = 4 }: { rows?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          className="h-16 rounded-lg bg-surface-card"
          initial={reduceMotion ? false : { opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.85, 0.4] }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 1.4, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }
          }
        />
      ))}
    </div>
  );
}

export function PageError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-10 w-10 text-error mb-3" />
          <p className="text-sm font-medium">{message || 'Failed to load data'}</p>
          <p className="text-xs text-muted-foreground mt-1">Check your connection and try again.</p>
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function EmptyState({ message }: { message: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {message}
        </CardContent>
      </Card>
    </motion.div>
  );
}
