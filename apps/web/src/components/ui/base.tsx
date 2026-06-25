import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils.js';

/**
 * Leaf primitives with no intra-kit dependencies. Living here (rather than in the
 * ui.tsx barrel) lets DataTable/Sheet import them without creating a circular
 * dependency between the barrel and its own re-exported children.
 */

export function IconButton({
  label, icon: Icon, className, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: LucideIcon }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-grid h-9 w-9 place-items-center rounded-md text-content-tertiary transition duration-2',
        'hover:bg-surface-2 hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
        className,
      )}
      {...props}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} />;
}
