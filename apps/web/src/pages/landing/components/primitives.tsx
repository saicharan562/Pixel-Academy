import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Magnetic } from './MagneticButton';

/** Small pill label that sits above section headings. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1',
        'text-2xs font-medium uppercase tracking-[0.18em] text-accent-200',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Centred section header: eyebrow + title + optional lede. */
export function SectionHeading({
  eyebrow, title, lede, align = 'center', className,
}: {
  eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode;
  align?: 'center' | 'left'; className?: string;
}) {
  return (
    <div className={cn(align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl', className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-content sm:text-4xl">
        {title}
      </h2>
      {lede ? <p className="mt-4 text-pretty text-lg text-content-secondary">{lede}</p> : null}
    </div>
  );
}

/** Primary gradient CTA — magnetic, with an arrow that nudges on hover. */
export function PrimaryCTA({
  to, children, className, icon = true,
}: { to: string; children: ReactNode; className?: string; icon?: boolean }) {
  return (
    <Magnetic className="inline-block">
      <Link
        to={to}
        className={cn(
          'group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-6 py-3',
          'text-sm font-semibold text-white shadow-glow transition-transform duration-2 active:translate-y-px',
          'bg-gradient-to-br from-accent-400 via-accent to-accent-700',
          className,
        )}
      >
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
        <span className="relative">{children}</span>
        {icon ? <ArrowRight className="relative h-4 w-4 transition-transform duration-2 group-hover:translate-x-0.5" /> : null}
      </Link>
    </Magnetic>
  );
}

/** Secondary, low-emphasis link button. */
export function GhostCTA({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-line-strong/70 bg-surface/40 px-5 py-3',
        'text-sm font-medium text-content-secondary backdrop-blur transition-colors hover:border-accent/40 hover:text-content',
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** Glass card shell reused across feature/demo panels. */
export function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-line/80 bg-surface/60 backdrop-blur-xl', className)}>
      {children}
    </div>
  );
}
