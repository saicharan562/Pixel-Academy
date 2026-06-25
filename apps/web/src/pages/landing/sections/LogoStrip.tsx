import { Marquee } from '@/components/ui/marquee';
import { LOGOS } from '../data';

/** Trust strip — a marquee of (placeholder) agency names that use the platform. */
export function LogoStrip() {
  return (
    <section className="border-y border-line/60 bg-surface/30 py-10">
      <p className="mb-6 text-center text-2xs uppercase tracking-[0.25em] text-content-tertiary">
        Trusted by webinar-led studios across India
      </p>
      <Marquee className="mask-fade-edges [--duration:38s]">
        {LOGOS.map((name) => (
          <span
            key={name}
            className="mx-8 select-none text-lg font-semibold tracking-tight text-content-tertiary/80 transition-colors hover:text-content-secondary"
          >
            {name}
          </span>
        ))}
      </Marquee>
    </section>
  );
}
