import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { cardReveal } from '@/lib/motion';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const reduceMotion = useReducedMotion();
    const baseClass = cn('rounded-lg border bg-card text-card-foreground shadow-card', className);

    if (reduceMotion) {
      return (
        <div
          ref={ref}
          className={cn(baseClass, 'transition-shadow duration-300 hover:shadow-lg')}
          {...props}
        >
          {children}
        </div>
      );
    }

    return (
      <motion.div
        className={baseClass}
        variants={cardReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        whileHover={{
          y: -3,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          transition: { duration: 0.22 },
        }}
      >
        <div ref={ref} {...props}>
          {children}
        </div>
      </motion.div>
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 p-5 lg:p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('font-display text-lg font-semibold leading-none tracking-tight', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-5 pb-5 pt-0 lg:px-6 lg:pb-6', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
