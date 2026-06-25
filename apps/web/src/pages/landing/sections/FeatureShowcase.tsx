import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FEATURES, type Feature } from '../data';
import { Reveal } from '../components/Reveal';
import { Eyebrow } from '../components/primitives';
import { DemoFrame } from '../demos';

/** The product story — alternating panels, each with a real animated demo. */
export function FeatureShowcase() {
  return (
    <section id="product" className="relative mx-auto max-w-6xl px-5 py-24 sm:py-28">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>The product</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-content sm:text-4xl">
            Don’t take our word for it. Watch it work.
          </h2>
          <p className="mt-4 text-pretty text-lg text-content-secondary">
            Five surfaces, one system. Each one is live below — not a screenshot.
          </p>
        </div>
      </Reveal>

      <div className="mt-20 flex flex-col gap-24 sm:gap-32">
        {FEATURES.map((f, i) => (
          <Panel key={f.id} feature={f} flip={i % 2 === 1} index={i} />
        ))}
      </div>
    </section>
  );
}

function Panel({ feature, flip, index }: { feature: Feature; flip: boolean; index: number }) {
  const Icon = feature.icon;
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      {/* Copy */}
      <Reveal from={flip ? 'right' : 'left'} className={cn(flip && 'lg:order-2')}>
        <Eyebrow>
          <Icon className="h-3.5 w-3.5" /> {feature.eyebrow}
        </Eyebrow>
        <h3 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-content sm:text-3xl">
          {feature.title}
        </h3>
        <p className="mt-4 text-pretty text-content-secondary">{feature.body}</p>
        <ul className="mt-6 space-y-2.5">
          {feature.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-content-secondary">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent/15 text-accent-200">
                <Check className="h-3 w-3" />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </Reveal>

      {/* Live demo — pins briefly while the copy scrolls past on large screens */}
      <Reveal from={flip ? 'left' : 'right'} className={cn(flip && 'lg:order-1')}>
        <div className="relative lg:sticky lg:top-28">
          {/* soft accent glow behind the frame */}
          <div aria-hidden className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,hsl(var(--accent)/0.12),transparent_70%)] blur-2xl" />
          <DemoFrame demo={feature.demo} className={cn('min-h-[18rem]', index === 0 && 'min-h-[20rem]')} />
        </div>
      </Reveal>
    </div>
  );
}
