import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FAQS } from '../data';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/primitives';

/** Accessible disclosure accordion — one item open at a time, keyboard-operable. */
export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-24 sm:py-28">
      <Reveal>
        <SectionHeading eyebrow="FAQ" title="The questions founders actually ask." />
      </Reveal>
      <Reveal className="mt-12" distance={16}>
        <div className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line/80 bg-surface/40">
          {FAQS.map((item, i) => (
            <Item key={item.q} q={item.q} a={item.a} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function Item({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div>
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
        >
          <span className="text-sm font-medium text-content sm:text-base">{q}</span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-content-tertiary transition-transform duration-300', open && 'rotate-180 text-accent-200')} />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-sm leading-relaxed text-content-secondary">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
