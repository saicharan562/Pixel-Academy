import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

type Card = { id: string; title: string; tag: string };
const COLUMNS = ['To do', 'In progress', 'Done'] as const;

const BASE: Record<string, Card[]> = {
  'To do': [{ id: 'a', title: 'Storyboard webinar', tag: 'Design' }, { id: 'b', title: 'Draft GST invoice', tag: 'Finance' }],
  'In progress': [{ id: 'c', title: 'Edit reel — Lumen', tag: 'Video' }],
  'Done': [{ id: 'd', title: 'Client kickoff call', tag: 'CRM' }],
};

const tagTone: Record<string, string> = {
  Design: 'text-accent-200 bg-accent/12',
  Finance: 'text-success bg-success/12',
  Video: 'text-info bg-info/12',
  CRM: 'text-warning bg-warning/12',
};

/**
 * A live Kanban that loops a card To do → In progress → Done, demonstrating the
 * board's drag flow. Under reduced motion the card sits statically in "Done".
 */
export function KanbanDemo() {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(reduce ? 2 : 0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setStage((s) => (s + 1) % 3), 1600);
    return () => window.clearInterval(id);
  }, [reduce]);

  const moving: Card = { id: 'b', title: 'Draft GST invoice', tag: 'Finance' };
  const cols: Record<string, Card[]> = {
    'To do': [BASE['To do'][0], ...(stage === 0 ? [moving] : [])],
    'In progress': [...BASE['In progress'], ...(stage === 1 ? [moving] : [])],
    'Done': [...BASE['Done'], ...(stage === 2 ? [moving] : [])],
  };

  return (
    <div className="grid grid-cols-3 gap-2.5 p-4">
      {COLUMNS.map((col) => (
        <div key={col} className="rounded-xl bg-surface-2/50 p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-2xs font-medium uppercase tracking-wider text-content-tertiary">{col}</span>
            <span className="text-2xs text-content-tertiary">{cols[col].length}</span>
          </div>
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {cols[col].map((c) => (
                <motion.div
                  key={c.id}
                  layout={!reduce}
                  layoutId={!reduce ? c.id : undefined}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className={cn(
                    'rounded-lg border bg-surface px-2.5 py-2 shadow-sm',
                    c.id === moving.id ? 'border-accent/50 ring-1 ring-accent/30' : 'border-line/70',
                  )}
                >
                  <p className="text-xs font-medium text-content">{c.title}</p>
                  <span className={cn('mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium', tagTone[c.tag])}>
                    {c.tag}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}
