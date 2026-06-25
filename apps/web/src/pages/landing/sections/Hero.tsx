import { Suspense, lazy, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Command, IndianRupee, Sparkles } from 'lucide-react';
import { Spotlight } from '@/components/ui/spotlight';
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text';
import { Marquee } from '@/components/ui/marquee';
import { useRich3D } from '@/lib/capabilities';
import { MODULES } from '../data';
import { PrimaryCTA, GhostCTA } from '../components/primitives';
import { HeroFallback } from '../three/HeroFallback';

// Heavy three.js scene — split into its own chunk, only ever fetched when rich 3D is allowed.
const HeroCanvas = lazy(() => import('../three/HeroCanvas'));

export function Hero() {
  const rich = useRich3D();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  // Parallax the copy/visual apart as the hero scrolls away (disabled when reduced).
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);
  const visualY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 80]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, reduce ? 1 : 0]);

  return (
    <section ref={ref} id="top" className="relative min-h-[100svh] overflow-hidden">
      {/* Backdrop: aurora wash + spotlight + grid, all masked toward the edges */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid mask-radial-faded opacity-40" />
        <div className="absolute left-1/2 top-[-10%] h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,hsl(var(--accent)/0.22),transparent_60%)] blur-2xl" />
        {!reduce && <Spotlight className="-top-40 left-10 md:left-1/3" fill="hsl(245 80% 63%)" />}
      </div>

      <div className="relative mx-auto grid min-h-[100svh] w-full max-w-6xl grid-cols-1 items-center gap-8 px-5 pb-24 pt-28 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
        {/* Copy */}
        <motion.div style={{ y: copyY, opacity: fade }}>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center rounded-full border border-line bg-surface/50 px-1 py-1 backdrop-blur"
          >
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-accent-200">New</span>
            <AnimatedShinyText className="px-2.5 text-xs">The operating system for Indian agencies</AnimatedShinyText>
          </motion.div>

          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-content sm:text-5xl lg:text-6xl"
          >
            Run your entire agency
            <span className="text-flow"> from one screen.</span>
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 max-w-xl text-pretty text-lg text-content-secondary"
          >
            Clients, projects, GST-native invoicing, attendance, tickets and an AI assistant —
            one audited platform built for India’s webinar-led creative teams.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <PrimaryCTA to="/login">Launch the app</PrimaryCTA>
            <GhostCTA to="#product">See it in action</GhostCTA>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-content-tertiary"
          >
            <span className="flex items-center gap-1.5"><IndianRupee className="h-3.5 w-3.5 text-accent-200" /> GST-native</span>
            <span className="flex items-center gap-1.5"><Command className="h-3.5 w-3.5 text-accent-200" /> ⌘K everything</span>
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-accent-200" /> AI built in</span>
          </motion.div>
        </motion.div>

        {/* Visual */}
        <motion.div style={{ y: visualY, opacity: fade }} className="relative h-[44vh] min-h-[20rem] lg:h-[60vh]">
          {rich ? (
            <Suspense fallback={<HeroFallback />}>
              <HeroCanvas progress={scrollYProgress} />
            </Suspense>
          ) : (
            <HeroFallback />
          )}

          {/* Floating product chrome */}
          {!reduce && (
            <>
              <FloatingChip className="left-0 top-6" delay={0.5}>
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Invoice paid · ₹1,28,000
              </FloatingChip>
              <FloatingChip className="bottom-10 right-0" delay={0.8}>
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Task → Done
              </FloatingChip>
            </>
          )}
        </motion.div>
      </div>

      {/* Module marquee */}
      <div className="absolute inset-x-0 bottom-5 z-10">
        <Marquee className="mask-fade-edges [--duration:34s]" pauseOnHover>
          {MODULES.map((m) => (
            <span key={m} className="mx-5 text-xs uppercase tracking-[0.2em] text-content-tertiary">{m}</span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}

function FloatingChip({ children, className, delay }: { children: React.ReactNode; className?: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`animate-float-soft glass absolute flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-content shadow-lg ${className ?? ''}`}
    >
      {children}
    </motion.div>
  );
}
