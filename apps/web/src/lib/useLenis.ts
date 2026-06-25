import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Buttery smooth scroll (Lenis) — scoped to long marketing pages via a hook rather
 * than mounted globally, so the app's internal scroll panes keep native behaviour.
 * Keeps GSAP ScrollTrigger in sync by updating it on each Lenis frame.
 */
export function useLenis(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [enabled]);
}
