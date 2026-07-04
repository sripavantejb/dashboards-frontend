import { cn } from '@/lib/utils';

/** Root wrapper for every dashboard page — consistent vertical rhythm */
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex w-full max-w-7xl mx-auto flex-col gap-6 lg:gap-8', className)}>
      {children}
    </div>
  );
}

/** Major content block below the page header */
export function PageSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-4 lg:gap-5', className)}>
      {children}
    </section>
  );
}

type GridCols = '1' | '2' | '3' | '4' | 'auto';

const gridCols: Record<GridCols, string> = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  auto: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
};

export function PageGrid({
  children,
  cols = '2',
  className,
}: {
  children: React.ReactNode;
  cols?: GridCols;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4 lg:gap-6', gridCols[cols], className)}>
      {children}
    </div>
  );
}

/** Filter bar, search row, or inline actions below the header */
export function PageToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4', className)}>
      {children}
    </div>
  );
}

/** Vertical stack for forms and detail panels */
export function FormStack({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {children}
    </div>
  );
}

/** Standard form field group */
export function FormField({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {children}
    </div>
  );
}

/** Two-column form row on sm+ */
export function FormRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>
      {children}
    </div>
  );
}

/** Card list item with consistent padding and alignment */
export function ListRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 lg:p-5', className)}>
      {children}
    </div>
  );
}

/** Narrow content pages (forms, settings) */
export function PageNarrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex w-full max-w-2xl flex-col gap-4 lg:gap-6', className)}>
      {children}
    </div>
  );
}

/** Modal / dialog footer actions */
export function FormActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-3', className)}>
      {children}
    </div>
  );
}
