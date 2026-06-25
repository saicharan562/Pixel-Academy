import { Quote } from 'lucide-react';
import { Marquee } from '@/components/ui/marquee';
import { TESTIMONIALS, type Testimonial } from '../data';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/primitives';

/** Premium quote cards in two opposed marquee rows. */
export function Testimonials() {
  const half = Math.ceil(TESTIMONIALS.length / 2);
  const rowA = TESTIMONIALS.slice(0, half);
  const rowB = TESTIMONIALS.slice(half);
  return (
    <section className="relative overflow-hidden py-24 sm:py-28">
      <Reveal>
        <SectionHeading
          eyebrow="Loved by operators"
          title="The teams that switched aren’t going back."
        />
      </Reveal>

      <div className="relative mt-14 flex flex-col gap-4">
        <Marquee className="mask-fade-edges [--duration:46s]" pauseOnHover>
          {rowA.map((t) => <Card key={t.name} t={t} />)}
        </Marquee>
        <Marquee className="mask-fade-edges [--duration:52s]" pauseOnHover reverse>
          {[...rowB, ...rowA.slice(0, 1)].map((t, i) => <Card key={t.name + i} t={t} />)}
        </Marquee>
      </div>
    </section>
  );
}

function Card({ t }: { t: Testimonial }) {
  return (
    <figure className="mx-3 flex w-[20rem] shrink-0 flex-col rounded-2xl border border-line/80 bg-surface/60 p-5 backdrop-blur-sm sm:w-[24rem]">
      <Quote className="h-5 w-5 text-accent/50" />
      <blockquote className="mt-3 flex-1 text-pretty text-sm leading-relaxed text-content-secondary">
        “{t.quote}”
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent-400 to-accent-700 text-xs font-semibold text-white">
          {t.initials}
        </span>
        <span>
          <span className="block text-sm font-medium text-content">{t.name}</span>
          <span className="block text-xs text-content-tertiary">{t.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}
