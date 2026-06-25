import { useReducedMotion, type Transition, type Variants } from 'motion/react';

/**
 * One coherent motion language. Durations/easings mirror the design tokens
 * (120 / 200 / 320ms; ease-out / spring). Every consumer is reduced-motion
 * aware via `useMotion()` — when the user prefers reduced motion we return
 * instant, displacement-free variants so nothing flies around the screen.
 */

export const EASE_OUT: Transition['ease'] = [0.22, 1, 0.36, 1];
export const EASE_SPRING: Transition = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 };

export const transition = {
  fast: { duration: 0.12, ease: EASE_OUT } satisfies Transition,
  base: { duration: 0.2, ease: EASE_OUT } satisfies Transition,
  slow: { duration: 0.32, ease: EASE_OUT } satisfies Transition,
  spring: EASE_SPRING,
};

const reduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export const variants = {
  fadeUp: {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: transition.slow },
    exit: { opacity: 0, y: -8, transition: transition.base },
  } satisfies Variants,
  fade: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: transition.base },
    exit: { opacity: 0, transition: transition.fast },
  } satisfies Variants,
  scaleIn: {
    hidden: { opacity: 0, scale: 0.97, y: 8 },
    show: { opacity: 1, scale: 1, y: 0, transition: EASE_SPRING },
    exit: { opacity: 0, scale: 0.98, transition: transition.fast },
  } satisfies Variants,
  sheet: {
    hidden: { opacity: 0, x: 32 },
    show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 320, damping: 34 } },
    exit: { opacity: 0, x: 32, transition: transition.base },
  } satisfies Variants,
  listItem: {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: transition.base },
  } satisfies Variants,
};

export const staggerContainer = (stagger = 0.045): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger } },
});

/** Resolve a variant set against the user's reduced-motion preference. */
export function useMotion() {
  const prefersReduced = useReducedMotion();
  const pick = (v: Variants): Variants => (prefersReduced ? reduced : v);
  return {
    prefersReduced: !!prefersReduced,
    variants: {
      fadeUp: pick(variants.fadeUp),
      fade: pick(variants.fade),
      scaleIn: pick(variants.scaleIn),
      sheet: prefersReduced ? reduced : variants.sheet,
      listItem: pick(variants.listItem),
    },
    stagger: (s?: number) => (prefersReduced ? staggerContainer(0) : staggerContainer(s)),
  };
}
