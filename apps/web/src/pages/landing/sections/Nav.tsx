import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_LINKS } from '../data';
import { PrimaryCTA } from '../components/primitives';

/** Sticky glass nav that condenses once the visitor scrolls off the hero. */
export function Nav() {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={reduce ? false : { y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 sm:pt-4"
    >
      <nav
        className={cn(
          'flex w-full max-w-6xl items-center justify-between rounded-full px-4 py-2.5 transition-all duration-300 sm:px-5',
          scrolled ? 'glass shadow-md' : 'border border-transparent bg-transparent',
        )}
      >
        <a href="#top" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent-400 to-accent-700 text-sm font-bold text-white">P</span>
          <span className="text-sm font-semibold tracking-tight text-content">Pixel Academy</span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-sm text-content-secondary transition-colors hover:bg-white/5 hover:text-content"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden rounded-full px-3 py-1.5 text-sm text-content-secondary transition-colors hover:text-content sm:block">
            Sign in
          </Link>
          <div className="hidden sm:block">
            <PrimaryCTA to="/login" className="px-4 py-2 text-xs">Launch the app</PrimaryCTA>
          </div>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-content md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="glass absolute inset-x-4 top-[4.5rem] rounded-2xl p-3 md:hidden"
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm text-content-secondary hover:bg-white/5 hover:text-content"
              >
                {l.label}
              </a>
            ))}
            <Link to="/login" onClick={() => setOpen(false)} className="mt-1 block rounded-lg bg-accent/15 px-3 py-2.5 text-center text-sm font-medium text-accent-200">
              Launch the app
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
