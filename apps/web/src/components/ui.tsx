import {
  forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes,
  type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'motion/react';
import { Loader2, X, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils.js';

/**
 * Pixel Academy primitive kit — composes entirely from the design tokens.
 * Every interactive element has hover / press / focus-visible states; motion is
 * 120–200ms; numbers use tabular figures. Modal/Sheet are built on Radix for
 * focus-trapping and a11y. Re-exported barrels keep import paths stable.
 */

export { DataTable, type Column } from './ui/data-table.js';
export { Sheet, SheetSection, SheetField } from './ui/sheet.js';
export { Sparkline } from './ui/sparkline.js';
export { IconButton, Skeleton } from './ui/base.js';

import { IconButton } from './ui/base.js';

/* ───────────────────────────── Layout ───────────────────────────── */

export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-content">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-content-tertiary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children, className, interactive = false,
}: { children: ReactNode; className?: string; interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface shadow-sm',
        interactive && 'transition duration-2 ease-out hover:border-line-strong hover:shadow-md',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ───────────────────────────── Button ───────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-foreground shadow-sm hover:bg-accent-600 active:bg-accent-700',
  secondary: 'bg-surface-2 text-content border border-line hover:bg-surface-3 hover:border-line-strong',
  outline: 'border border-line-strong text-content-secondary hover:bg-surface-2 hover:text-content',
  danger: 'bg-danger text-white shadow-sm hover:brightness-110 active:brightness-95',
  ghost: 'text-content-secondary hover:bg-surface-2 hover:text-content',
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-9 px-4 text-sm rounded-md gap-2',
  lg: 'h-11 px-6 text-base rounded-lg gap-2',
  icon: 'h-9 w-9 rounded-md',
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant; size?: ButtonSize; loading?: boolean; icon?: LucideIcon;
  }
>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition duration-2 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        buttonSizes[size], buttonVariants[variant], className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {size !== 'icon' && children}
    </button>
  );
});

/* ───────────────────────────── Fields ───────────────────────────── */

const fieldBase =
  'w-full rounded-md border border-line bg-surface-2 px-3 text-sm text-content placeholder:text-content-tertiary outline-none transition duration-2 ' +
  'focus:border-accent/70 focus:ring-2 focus:ring-accent/25 disabled:opacity-50';

function FieldFrame({
  label, hint, error, htmlFor, children,
}: { label?: string; hint?: string; error?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-medium text-content-secondary">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-content-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string; icon?: LucideIcon }
>(function Input({ label, hint, error, icon: Icon, className, id, ...props }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldFrame label={label} hint={hint} error={error} htmlFor={fieldId}>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary" />}
        <input
          ref={ref}
          id={fieldId}
          className={cn(fieldBase, 'h-9', Icon && 'pl-9', error && 'border-danger/70 focus:border-danger focus:ring-danger/25', className)}
          {...props}
        />
      </div>
    </FieldFrame>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string; error?: string }
>(function Textarea({ label, hint, error, className, id, ...props }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldFrame label={label} hint={hint} error={error} htmlFor={fieldId}>
      <textarea ref={ref} id={fieldId} className={cn(fieldBase, 'min-h-[88px] py-2 leading-relaxed', className)} {...props} />
    </FieldFrame>
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string; error?: string }
>(function Select({ label, hint, error, className, children, id, ...props }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldFrame label={label} hint={hint} error={error} htmlFor={fieldId}>
      <select ref={ref} id={fieldId} className={cn(fieldBase, 'h-9 [&>option]:bg-surface', className)} {...props}>
        {children}
      </select>
    </FieldFrame>
  );
});

/* ───────────────────────── Badges & status ───────────────────────── */

export type Tone = 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'violet';
const toneStyles: Record<Tone, string> = {
  slate: 'bg-surface-3 text-content-secondary ring-line',
  green: 'bg-success/12 text-success ring-success/25',
  amber: 'bg-warning/12 text-warning ring-warning/25',
  red: 'bg-danger/12 text-danger ring-danger/25',
  blue: 'bg-info/12 text-info ring-info/25',
  violet: 'bg-accent/14 text-accent-300 ring-accent/25',
};

export function Badge({ children, tone = 'slate', dot = false }: { children: ReactNode; tone?: Tone; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1', toneStyles[tone])}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusDot({ tone = 'slate', pulse = false }: { tone?: Tone; pulse?: boolean }) {
  const color: Record<Tone, string> = {
    slate: 'bg-content-tertiary', green: 'bg-success', amber: 'bg-warning',
    red: 'bg-danger', blue: 'bg-info', violet: 'bg-accent',
  };
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', color[tone])} />}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', color[tone])} />
    </span>
  );
}

export function KBD({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-line-strong bg-surface-2 px-1.5 font-mono text-2xs text-content-secondary">
      {children}
    </kbd>
  );
}

export function Avatar({ name, size = 'md' }: { name?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-11 w-11 text-base' }[size];
  const initials = (name ?? '·').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '·';
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-400 to-accent-700 font-semibold text-white shadow-sm', dims)}>
      {initials}
    </span>
  );
}

/* ─────────────────────── Segmented control ─────────────────────── */

export function SegmentedControl<T extends string>({
  options, value, onChange, ariaLabel,
}: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; ariaLabel: string }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition duration-2',
              active ? 'text-content' : 'text-content-tertiary hover:text-content-secondary',
            )}
          >
            {active && (
              <motion.span layoutId={`seg-${ariaLabel}`} className="absolute inset-0 rounded-md bg-surface-3 shadow-xs"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── Tooltip ───────────────────────────── */

export function Tooltip({ label, children, side = 'top' }: { label: string; children: ReactNode; side?: 'top' | 'bottom' }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-line-strong bg-overlay px-2 py-1 text-2xs text-content-secondary opacity-0 shadow-md transition duration-1 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100',
          side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        )}
      >
        {label}
      </span>
    </span>
  );
}

/* ───────────────────── Loading / empty / error ───────────────────── */

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12 text-content-tertiary" role="status" aria-label="Loading">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export function EmptyState({
  icon: Icon, title, description, action,
}: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line py-16 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-surface-2 text-content-tertiary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-content">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-content-tertiary">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
      {message}
    </div>
  );
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-2xs font-medium uppercase tracking-wide text-content-tertiary">{label}</div>
      <div className="mt-0.5 truncate text-sm text-content">{value}</div>
    </div>
  );
}

/* ───────────────────────────── Modal ───────────────────────────── */

export function Modal({
  open, onClose, title, description, children, size = 'md',
}: {
  open: boolean; onClose: () => void; title: string; description?: string;
  children: ReactNode; size?: 'md' | 'lg';
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className={cn(
            'glass-strong fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-lg focus:outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
            size === 'lg' ? 'max-w-2xl' : 'max-w-md',
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-content">{title}</Dialog.Title>
              {description && <Dialog.Description className="mt-1 text-sm text-content-tertiary">{description}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close" icon={X} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ───────────────────── Legacy table shell (kept) ───────────────────── */

export function TableShell({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <Card className="overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-surface-2 text-left text-2xs uppercase tracking-wider text-content-tertiary">
          {head}
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </Card>
  );
}
