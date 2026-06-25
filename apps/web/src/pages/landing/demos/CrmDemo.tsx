import { motion, useReducedMotion } from 'motion/react';
import { Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROWS = [
  { name: 'Lumen Studios', gstin: '29ABCDE1234F1Z5', city: 'Bengaluru', tag: 'Active', tone: 'success' },
  { name: 'Webinar Republic', gstin: '27PQRSX5678G2Z1', city: 'Mumbai', tag: 'Active', tone: 'success' },
  { name: 'Nucleus Media', gstin: '07LMNOP9012H3Z9', city: 'New Delhi', tag: 'Proposal', tone: 'warning' },
  { name: 'GrowthBy', gstin: '33TUVWX3456J4Z7', city: 'Chennai', tag: 'Active', tone: 'success' },
  { name: 'Orbit Creative', gstin: '36YZABC7890K5Z3', city: 'Hyderabad', tag: 'Onboarding', tone: 'info' },
];

const toneCls: Record<string, string> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  info: 'bg-info/15 text-info',
};

/** A faux CRM table whose rows stream in — "the audited client book". */
export function CrmDemo() {
  const reduce = useReducedMotion();
  return (
    <div className="w-full">
      {/* toolbar */}
      <div className="flex items-center gap-2 border-b border-line/70 px-4 py-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-surface-2/70 px-3 py-1.5 text-content-tertiary">
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Search 248 clients…</span>
        </div>
        <span className="rounded-md bg-accent/15 px-2 py-1 text-2xs font-medium text-accent-200">+ New client</span>
      </div>
      {/* head */}
      <div className="grid grid-cols-[1.4fr_1.4fr_0.9fr_0.8fr] gap-3 px-4 py-2 text-2xs uppercase tracking-wider text-content-tertiary">
        <span>Client</span><span className="hidden sm:block">GSTIN</span><span>City</span><span>Status</span>
      </div>
      {/* rows */}
      <div className="divide-y divide-line/50">
        {ROWS.map((r, i) => (
          <motion.div
            key={r.name}
            className="grid grid-cols-[1.4fr_1.4fr_0.9fr_0.8fr] items-center gap-3 px-4 py-2.5 nums"
            initial={{ opacity: 0, y: reduce ? 0 : 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-content">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-accent/15 text-2xs font-semibold text-accent-200">
                {r.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="truncate">{r.name}</span>
            </span>
            <span className="hidden truncate font-mono text-xs text-content-secondary sm:flex sm:items-center sm:gap-1">
              <Check className="h-3 w-3 text-success" /> {r.gstin}
            </span>
            <span className="truncate text-xs text-content-secondary">{r.city}</span>
            <span>
              <span className={cn('rounded-full px-2 py-0.5 text-2xs font-medium', toneCls[r.tone])}>{r.tag}</span>
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
