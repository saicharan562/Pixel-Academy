import { useRef } from 'react';
import { useInView, useReducedMotion } from 'motion/react';
import { useSpring, animated } from '@react-spring/web';
import { METRICS } from '../data';
import { Reveal } from '../components/Reveal';

/** Big outcome numbers that count up the first time they enter the viewport. */
export function Metrics() {
  return (
    <section className="relative overflow-hidden border-y border-line/60 py-24 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-dotfield opacity-[0.5] mask-radial-faded" />
      <div className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-content sm:text-4xl">
            The numbers founders feel by month one.
          </h2>
        </Reveal>
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
          {METRICS.map((m) => (
            <Stat key={m.label} {...m} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ value, suffix, label, sub }: (typeof METRICS)[number]) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const decimals = !Number.isInteger(value);
  const spring = useSpring({
    from: { n: 0 },
    n: inView || reduce ? value : 0,
    immediate: !!reduce,
    config: { tension: 90, friction: 28 },
  });

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl font-semibold tracking-tight text-content nums sm:text-5xl">
        <animated.span>
          {spring.n.to((n) => (decimals ? n.toFixed(2) : Math.floor(n).toLocaleString('en-IN')))}
        </animated.span>
        <span className="text-accent-200">{suffix}</span>
      </div>
      <p className="mx-auto mt-3 max-w-[12rem] text-sm font-medium text-content-secondary">{label}</p>
      <p className="mx-auto mt-1 max-w-[12rem] text-xs text-content-tertiary">{sub}</p>
    </div>
  );
}
