import { useEffect } from 'react';
import Lenis from 'lenis';
import { useReducedMotion } from 'motion/react';
import { gsap, ScrollTrigger } from '@/lib/gsap';

/**
 * Single source of smooth scroll for the marketing page. One Lenis instance,
 * driven by GSAP's ticker so ScrollTrigger and Lenis never fight over rAF, and
 * `ScrollTrigger.update` fired on every Lenis scroll. Under prefers-reduced-motion
 * we skip Lenis entirely — native scroll, and every scrubbed trigger elsewhere
 * collapses to a static reveal. StrictMode-safe: fully torn down on unmount.
 */
export function useLandingScroll(): void {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Recompute trigger geometry once Lenis is live and after fonts/layout settle.
    const refresh = () => ScrollTrigger.refresh();
    const t = window.setTimeout(refresh, 200);

    return () => {
      window.clearTimeout(t);
      gsap.ticker.remove(tick);
      lenis.off('scroll', ScrollTrigger.update);
      lenis.destroy();
    };
  }, [reduce]);
}
