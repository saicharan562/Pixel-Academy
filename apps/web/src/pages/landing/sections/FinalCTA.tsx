import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { BorderBeam } from '@/components/ui/border-beam';
import { Reveal } from '../components/Reveal';
import { Magnetic } from '../components/MagneticButton';

/** Full-bleed closing CTA. */
export function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 sm:pb-28">
      <Reveal>
        <div className="relative grain overflow-hidden rounded-[2rem] border border-accent/30 bg-gradient-to-br from-accent-600/25 via-accent/10 to-surface px-6 py-20 text-center sm:px-12">
          <BorderBeam size={260} duration={12} colorFrom="hsl(245 84% 70%)" colorTo="hsl(247 70% 48%)" />
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,hsl(var(--accent)/0.3),transparent_65%)] blur-2xl" />
          <h2 className="relative mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight text-content sm:text-5xl">
            Your agency’s operating system is one click away.
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-pretty text-content-secondary">
            Sign in with your admin account and run clients, projects, GST invoicing and AI from a single screen.
          </p>
          <div className="relative mt-9 flex flex-wrap items-center justify-center gap-3">
            <Magnetic>
              <Link to="/login">
                <ShimmerButton background="hsl(245 80% 63%)" className="shadow-glow">
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    Launch the app <ArrowRight className="h-4 w-4" />
                  </span>
                </ShimmerButton>
              </Link>
            </Magnetic>
            <a href="#pricing" className="text-sm font-medium text-content-secondary transition-colors hover:text-content">
              See pricing →
            </a>
          </div>
          <p className="relative mt-6 text-2xs uppercase tracking-wider text-content-tertiary">
            GST-native · WhatsApp-first · built in India
          </p>
        </div>
      </Reveal>
    </section>
  );
}
