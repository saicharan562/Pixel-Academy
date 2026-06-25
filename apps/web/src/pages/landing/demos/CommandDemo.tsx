import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CalendarCheck, FileText, Plus, Search, Ticket, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { icon: Plus, label: 'New invoice', hint: 'Finance' },
  { icon: Users, label: 'Add client', hint: 'CRM' },
  { icon: CalendarCheck, label: 'Apply for leave', hint: 'People' },
  { icon: FileText, label: 'Export GSTR-1', hint: 'Reports' },
  { icon: Ticket, label: 'Open a ticket', hint: 'Support' },
];

/** The ⌘K palette — selection cycles to show "everything, one keystroke away". */
export function CommandDemo() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % ITEMS.length), 1100);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 rounded-lg border border-line/70 bg-surface-2/60 px-3 py-2">
        <Search className="h-4 w-4 text-content-tertiary" />
        <span className="text-xs text-content-secondary">Type a command or search…</span>
        <kbd className="ml-auto rounded border border-line bg-surface px-1.5 py-0.5 text-2xs text-content-tertiary">⌘K</kbd>
      </div>
      <div className="mt-2 space-y-0.5">
        {ITEMS.map((it, i) => (
          <div
            key={it.label}
            className={cn(
              'relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors',
              i === active ? 'text-content' : 'text-content-secondary',
            )}
          >
            {i === active && (
              <motion.span
                layoutId={reduce ? undefined : 'cmd-active'}
                className="absolute inset-0 -z-0 rounded-lg bg-accent/12 ring-1 ring-accent/25"
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              />
            )}
            <it.icon className="relative h-4 w-4 text-accent-200" />
            <span className="relative font-medium">{it.label}</span>
            <span className="relative ml-auto text-2xs text-content-tertiary">{it.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
