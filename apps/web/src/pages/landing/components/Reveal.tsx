import { type ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Direction the element travels in from. */
  from?: 'up' | 'down' | 'left' | 'right' | 'none';
  delay?: number;
  /** Travel distance in px (ignored under reduced motion). */
  distance?: number;
  once?: boolean;
  as?: 'div' | 'span' | 'li' | 'section';
};

/**
 * Scroll-into-view reveal — the workhorse for the marketing page. Built on
 * Motion's `whileInView` so it is declarative and never leaks listeners, and
 * fully reduced-motion aware: when the user prefers reduced motion we drop all
 * displacement and just cross-fade instantly.
 */
export function Reveal({
  children, className, from = 'up', delay = 0, distance = 28, once = true, as = 'div',
}: RevealProps) {
  const reduce = useReducedMotion();
  const offset = reduce ? 0 : distance;
  const axis = from === 'left' ? { x: -offset } : from === 'right' ? { x: offset }
    : from === 'down' ? { y: -offset } : from === 'none' ? {} : { y: offset };

  const variants: Variants = {
    hidden: { opacity: 0, ...axis },
    show: {
      opacity: 1, x: 0, y: 0,
      transition: { duration: reduce ? 0.2 : 0.7, ease: EASE, delay: reduce ? 0 : delay },
    },
  };

  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount: 0.3, margin: '0px 0px -10% 0px' }}
    >
      {children}
    </MotionTag>
  );
}

/** Staggered container — pair with <RevealItem/> children. */
export function RevealGroup({
  children, className, stagger = 0.08, once = true,
}: { children: ReactNode; className?: string; stagger?: number; once?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount: 0.2 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : stagger } } }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children, className, distance = 24,
}: { children: ReactNode; className?: string; distance?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : distance },
        show: { opacity: 1, y: 0, transition: { duration: reduce ? 0.2 : 0.6, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}
