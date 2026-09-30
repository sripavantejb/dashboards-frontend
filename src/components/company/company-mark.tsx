import { cn } from '@/lib/utils';

/** Company logo, falling back to the first letter of its name. */
export function CompanyMark({ name, logo, className }: { name?: string; logo?: string; className?: string }) {
  if (logo) {
    return <img src={logo} alt={name ? `${name} logo` : 'Company logo'} className={cn('h-8 w-8 shrink-0 rounded-md bg-card object-contain', className)} />;
  }
  return (
    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground', className)}>
      {(name || 'E').charAt(0).toUpperCase()}
    </span>
  );
}
