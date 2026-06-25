import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Bot, FileText, Sparkles } from 'lucide-react';

const ANSWER = 'Three invoices are overdue this week — ₹1,24,000 in total. The oldest is PA/2026/0391 (Nucleus Media), 12 days past due.';

/** A grounded AI assistant exchange — question, typed answer, and a cited source. */
export function AssistantDemo() {
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(reduce ? ANSWER.length : 0);

  useEffect(() => {
    if (reduce) return;
    setTyped(0);
    const id = window.setInterval(() => {
      setTyped((n) => {
        if (n >= ANSWER.length) { window.clearInterval(id); return n; }
        return n + 2;
      });
    }, 28);
    return () => window.clearInterval(id);
  }, [reduce]);

  const done = typed >= ANSWER.length;

  return (
    <div className="flex flex-col gap-3 p-5">
      {/* user question */}
      <div className="self-end rounded-2xl rounded-br-sm bg-accent/15 px-3.5 py-2 text-xs text-content">
        Which invoices are overdue this week?
      </div>
      {/* assistant answer */}
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent-400 to-accent-700 text-white">
          <Bot className="h-4 w-4" />
        </span>
        <div className="rounded-2xl rounded-tl-sm bg-surface-2/70 px-3.5 py-2.5">
          <p className="text-xs leading-relaxed text-content-secondary">
            {ANSWER.slice(0, typed)}
            {!done && <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 bg-accent" />}
          </p>
          {done && (
            <motion.div
              initial={{ opacity: 0, y: reduce ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-2 flex items-center gap-1.5 rounded-lg border border-line/70 bg-surface px-2 py-1.5 text-2xs text-content-tertiary"
            >
              <FileText className="h-3 w-3 text-accent-200" />
              Source: <span className="font-medium text-content-secondary">Invoices · 3 records</span>
            </motion.div>
          )}
        </div>
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-2xs text-content-tertiary">
        <Sparkles className="h-3 w-3" /> Read-only · permission-scoped · cites its source
      </p>
    </div>
  );
}
