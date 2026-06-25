import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

/**
 * Magnetic wrapper — the element drifts toward the cursor and springs back on
 * leave. Tasteful, low-amplitude, and a no-op under reduced motion (renders a
 * plain wrapper, no pointer math). Wrap any CTA/link.
 */
export function Magnetic({
  children, className, strength = 0.35,
}: { children: ReactNode; className?: string; strength?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  if (reduce) return <div className={className}>{children}</div>;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={reset}
    >
      {children}
    </motion.div>
  );
}
