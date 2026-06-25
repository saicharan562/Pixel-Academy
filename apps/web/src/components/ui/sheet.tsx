import { type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { IconButton } from './base.js';

/**
 * Slide-over Sheet (right edge) built on Radix Dialog — focus-trapped, ESC to
 * close, scroll-locked. Used for record detail so the list stays in context.
 */
export function Sheet({
  open, onClose, title, subtitle, children, footer, width = 'md',
}: {
  open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode;
  children: ReactNode; footer?: ReactNode; width?: 'md' | 'lg';
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className={cn(
            'glass-strong fixed inset-y-0 right-0 z-50 flex w-full flex-col shadow-lg focus:outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right data-[state=open]:duration-300 data-[state=closed]:duration-200',
            width === 'lg' ? 'sm:max-w-xl' : 'sm:max-w-md',
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-lg font-semibold text-content">{title}</Dialog.Title>
              {subtitle && <Dialog.Description className="mt-0.5 truncate text-sm text-content-tertiary">{subtitle}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close panel" icon={X} />
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {footer && <footer className="border-t border-line px-6 py-4">{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function SheetSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-content-tertiary">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SheetField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-sm text-content-tertiary">{label}</span>
      <span className="min-w-0 truncate text-right text-sm text-content">{children}</span>
    </div>
  );
}
