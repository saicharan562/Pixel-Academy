import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';
import { cn } from '@/lib/utils';
import { PLANS, type Plan } from '../data';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/primitives';

/** Transparent ₹ pricing with a monthly/annual toggle and a BorderBeam highlight. */
export function Pricing() {
  const [annual, setAnnual] = useState(true);
  return (
    <section id="pricing" className="relative mx-auto max-w-6xl px-5 py-24 sm:py-28">
      <Reveal>
        <SectionHeading
          eyebrow="Pricing"
          title="Priced in ₹. No per-invoice fees. No surprises."
          lede="Every plan is billed per workspace. GST applies. Annual saves ~20%."
        />
      </Reveal>

      <Reveal className="mt-8 flex justify-center" distance={12}>
        <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface/60 p-1 text-sm">
          <Toggle active={!annual} onClick={() => setAnnual(false)}>Monthly</Toggle>
          <Toggle active={annual} onClick={() => setAnnual(true)}>
            Annual <span className="ml-1 rounded-full bg-success/15 px-1.5 py-0.5 text-2xs font-medium text-success">−20%</span>
          </Toggle>
        </div>
      </Reveal>

      <div className="mt-12 grid items-stretch gap-5 lg:grid-cols-3">
        {PLANS.map((p, i) => (
          <Reveal key={p.name} delay={i * 0.08} className={cn(p.featured && 'lg:-mt-4 lg:mb-0')}>
            <Tier plan={p} annual={annual} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative rounded-full px-4 py-1.5 font-medium transition-colors',
        active ? 'text-content' : 'text-content-tertiary hover:text-content-secondary',
      )}
    >
      {active && <motion.span layoutId="price-toggle" className="absolute inset-0 -z-10 rounded-full bg-accent/15 ring-1 ring-accent/30" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
      <span className="relative flex items-center">{children}</span>
    </button>
  );
}

function Tier({ plan, annual }: { plan: Plan; annual: boolean }) {
  const price = annual ? plan.price.annual : plan.price.monthly;
  return (
    <div
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-2xl border p-6',
        plan.featured ? 'border-accent/40 bg-gradient-to-b from-accent/[0.08] to-surface/60 shadow-glow' : 'border-line/80 bg-surface/50',
      )}
    >
      {plan.featured && <BorderBeam size={140} duration={8} colorFrom="hsl(245 84% 70%)" colorTo="hsl(247 70% 48%)" />}
      {plan.featured && (
        <span className="absolute right-5 top-6 rounded-full bg-accent px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-white">
          Most popular
        </span>
      )}
      <h3 className="text-lg font-semibold text-content">{plan.name}</h3>
      <p className="mt-1 text-sm text-content-tertiary">{plan.tagline}</p>
      <div className="mt-5 flex items-end gap-1 nums">
        <span className="text-4xl font-semibold tracking-tight text-content">₹{price.toLocaleString('en-IN')}</span>
        <span className="mb-1 text-sm text-content-tertiary">/mo</span>
      </div>
      <p className="mt-1 text-2xs text-content-tertiary">{annual ? 'billed annually' : 'billed monthly'} · excl. GST</p>

      <Link
        to="/login"
        className={cn(
          'mt-6 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors',
          plan.featured
            ? 'bg-gradient-to-br from-accent-400 to-accent-700 text-white shadow-glow hover:brightness-110'
            : 'border border-line-strong/70 text-content hover:border-accent/40 hover:bg-accent/5',
        )}
      >
        {plan.cta}
      </Link>

      <ul className="mt-6 space-y-2.5 border-t border-line/60 pt-6">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-content-secondary">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-200" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
