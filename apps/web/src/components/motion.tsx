import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useSpring, animated } from '@react-spring/web';

/** Physics count-up that renders instantly under reduced-motion. */
export function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const spring = useSpring({
    from: { n: 0 }, to: { n: value }, immediate: !!reduce,
    config: { tension: 110, friction: 26 }, reset: false,
  });
  return <animated.span className={className}>{spring.n.to((n) => Math.floor(n).toLocaleString('en-IN'))}</animated.span>;
}

/** Container that staggers its <FadeItem/> children in. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.05 } } }}
    >
      {children}
    </motion.div>
  );
}

export function FadeItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{ hidden: { opacity: 0, y: reduce ? 0 : 14 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Hover-lift wrapper (no-op under reduced motion). */
export function Lift({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}
