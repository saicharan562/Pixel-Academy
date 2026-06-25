import { AnimatedCounter } from '@/components/motion';
import { motion, useReducedMotion } from 'motion/react';

const LINES = [
  { item: 'Webinar production — 4 sessions', qty: 4, rate: 18000 },
  { item: 'Reel editing retainer', qty: 1, rate: 24000 },
  { item: 'Landing page design', qty: 1, rate: 32000 },
];

/** A faux invoice that computes its CGST/SGST split and total in front of you. */
export function InvoiceDemo() {
  const reduce = useReducedMotion();
  const subtotal = LINES.reduce((s, l) => s + l.qty * l.rate, 0); // 128000
  const cgst = Math.round(subtotal * 0.09);
  const sgst = Math.round(subtotal * 0.09);
  const total = subtotal + cgst + sgst;

  return (
    <div className="p-5 nums">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xs uppercase tracking-wider text-content-tertiary">Tax invoice</p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-content">PA/2026/0418</p>
        </div>
        <span className="rounded-md bg-success/15 px-2 py-1 text-2xs font-medium text-success">Intra-state · KA</span>
      </div>

      <div className="mt-4 space-y-1.5">
        {LINES.map((l, i) => (
          <motion.div
            key={l.item}
            className="flex items-center justify-between text-xs"
            initial={{ opacity: 0, x: reduce ? 0 : -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: reduce ? 0 : i * 0.12 }}
          >
            <span className="truncate pr-2 text-content-secondary">{l.item}</span>
            <span className="shrink-0 font-medium text-content">₹{(l.qty * l.rate).toLocaleString('en-IN')}</span>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 space-y-1.5 border-t border-line/70 pt-3 text-xs">
        <Row label="Subtotal" value={subtotal} muted />
        <Row label="CGST @ 9%" value={cgst} muted />
        <Row label="SGST @ 9%" value={sgst} muted />
        <div className="flex items-center justify-between pt-2 text-base">
          <span className="font-semibold text-content">Total</span>
          <span className="font-semibold text-accent-200">
            ₹<AnimatedCounter value={total} />
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-content-tertiary' : 'text-content-secondary'}>{label}</span>
      <span className="font-medium text-content-secondary">₹{value.toLocaleString('en-IN')}</span>
    </div>
  );
}
