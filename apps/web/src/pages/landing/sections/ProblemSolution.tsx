import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/primitives';
import { MODULES } from '../data';

const CHAOS = [
  'WhatsApp approvals', 'Sheets for GST', '4 invoicing tools', 'Lost client context',
  'Attendance in DMs', 'Tickets in email', 'No audit trail', 'Tasks everywhere',
];

/** The tension: scattered ops tools → collapse into one platform. */
export function ProblemSolution() {
  return (
    <section id="platform" className="relative mx-auto max-w-6xl px-5 py-24 sm:py-32">
      <Reveal>
        <SectionHeading
          eyebrow="The problem"
          title={<>Your agency runs on <span className="text-content-tertiary line-through decoration-danger/50">twelve tabs</span> and a prayer.</>}
          lede="Context lives in WhatsApp, money lives in spreadsheets, and nothing is auditable. Every handoff loses something."
        />
      </Reveal>

      <div className="mt-16 grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
        {/* Chaos */}
        <Reveal from="left" className="relative">
          <div className="flex flex-wrap gap-2.5 rounded-2xl border border-danger/20 bg-danger/[0.04] p-6">
            {CHAOS.map((c, i) => (
              <span
                key={c}
                className={cn(
                  'rounded-lg border border-line/70 bg-surface px-3 py-1.5 text-xs text-content-secondary shadow-sm',
                  i % 3 === 0 && '-rotate-2', i % 4 === 0 && 'rotate-2',
                )}
              >
                {c}
              </span>
            ))}
          </div>
          <p className="mt-3 text-center text-2xs uppercase tracking-wider text-danger/80">Before · scattered</p>
        </Reveal>

        {/* Arrow */}
        <Reveal className="hidden lg:block" distance={0}>
          <div className="grid h-12 w-12 place-items-center rounded-full border border-accent/30 bg-accent/10 text-accent-200">
            <ArrowRight className="h-5 w-5" />
          </div>
        </Reveal>

        {/* Solution constellation */}
        <Reveal from="right">
          <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/[0.08] to-transparent p-6">
            <div className="grid grid-cols-3 gap-2">
              {MODULES.slice(0, 9).map((m) => (
                <span
                  key={m}
                  className="rounded-lg border border-line/60 bg-surface/80 px-2 py-2 text-center text-2xs font-medium text-content-secondary"
                >
                  {m}
                </span>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-accent/15 py-2 text-center text-xs font-semibold text-accent-200">
              One login · fully audited
            </div>
          </div>
          <p className="mt-3 text-center text-2xs uppercase tracking-wider text-accent-200/90">After · one platform</p>
        </Reveal>
      </div>
    </section>
  );
}
