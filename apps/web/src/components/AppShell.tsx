import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell, ChevronsLeft, Command as CommandIcon, LogOut, PanelLeft, Search,
} from 'lucide-react';
import { useAuth } from '../lib/auth.js';
import { useMotion } from '../motion/index.js';
import { NAV_ITEMS } from '../nav.js';
import { Avatar, IconButton, KBD, Tooltip } from './ui.js';
import { CommandPalette } from './CommandPalette.js';
import { cn } from '../lib/utils.js';

const RAIL_KEY = 'pixel.rail.collapsed';

function useClickOutside<T extends HTMLElement>(onOut: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOut();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onOut]);
  return ref;
}

export function AppShell() {
  const { user, logout, can } = useAuth();
  const { pathname } = useLocation();
  const { variants, prefersReduced } = useMotion();

  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem(RAIL_KEY) === '1');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setMenuOpen(false));

  useEffect(() => { localStorage.setItem(RAIL_KEY, collapsed ? '1' : '0'); }, [collapsed]);

  // Global ⌘K / Ctrl+K.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const visibleItems = NAV_ITEMS.filter((item) => item.permission === null || can(item.permission));
  const active = visibleItems.find((i) => (i.path === '/' ? pathname === '/' : pathname.startsWith(i.path))) ?? visibleItems[0];

  return (
    <div className="flex min-h-screen">
      {/* ── Rail ── */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 256 }}
        transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36 }}
        className="glass sticky top-0 z-30 flex h-screen flex-col border-r border-line"
      >
        <div className={cn('flex items-center gap-2.5 px-4 pb-3 pt-4', collapsed && 'justify-center px-0')}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent-400 to-accent-700 text-sm font-bold text-white shadow-glow">PA</div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight text-content">Pixel Academy</div>
              <div className="truncate text-2xs text-content-tertiary">Operations Platform</div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 px-3" aria-label="Primary">
          {visibleItems.map((item) => {
            const isActive = item.path === active?.path;
            const Icon = item.Icon;
            const link = (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors duration-1 focus-visible:ring-2 focus-visible:ring-accent/60',
                  collapsed && 'justify-center px-0',
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-accent/14 ring-1 ring-inset ring-accent/25"
                    transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className={cn('relative z-10 h-[18px] w-[18px] shrink-0 transition-colors', isActive ? 'text-accent-300' : 'text-content-tertiary group-hover:text-content-secondary')} />
                {!collapsed && (
                  <>
                    <span className={cn('relative z-10 flex-1 transition-colors', isActive ? 'font-medium text-content' : 'text-content-secondary group-hover:text-content')}>{item.label}</span>
                    <span className={cn('relative z-10 font-mono text-2xs tracking-widest', isActive ? 'text-accent-300/70' : 'text-content-tertiary/60')}>{item.code}</span>
                  </>
                )}
              </NavLink>
            );
            return collapsed ? <Tooltip key={item.path} label={item.label} side="bottom">{link}</Tooltip> : link;
          })}
        </nav>

        <div className="p-3">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-content-tertiary transition-colors duration-1 hover:bg-surface-2 hover:text-content-secondary', collapsed && 'justify-center px-0')}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronsLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </motion.aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-line px-6 py-2.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
            <PanelLeft className="h-4 w-4 text-content-tertiary" />
            <span className="text-content-tertiary">Workspace</span>
            <span className="text-content-tertiary/50">/</span>
            <span className="font-medium text-content">{active?.label}</span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-lg border border-line bg-surface-2 py-1.5 pl-3 pr-2 text-sm text-content-tertiary transition-colors duration-1 hover:border-line-strong hover:text-content-secondary sm:flex"
            >
              <Search className="h-4 w-4" />
              <span className="pr-6">Search…</span>
              <span className="flex items-center gap-0.5"><KBD><CommandIcon className="h-2.5 w-2.5" /></KBD><KBD>K</KBD></span>
            </button>
            <IconButton label="Open command palette" icon={CommandIcon} className="sm:hidden" onClick={() => setPaletteOpen(true)} />
            <IconButton label="Notifications" icon={Bell} />

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-lg p-0.5 pr-2 transition-colors duration-1 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <Avatar name={user?.fullName} size="sm" />
                <span className="hidden text-left lg:block">
                  <span className="block text-xs font-medium leading-tight text-content">{user?.fullName}</span>
                  <span className="block text-2xs leading-tight text-content-tertiary">{user?.role}</span>
                </span>
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.14 }}
                    role="menu"
                    className="glass-strong absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl p-1.5 shadow-lg"
                  >
                    <div className="border-b border-line px-3 py-2">
                      <p className="truncate text-sm font-medium text-content">{user?.fullName}</p>
                      <p className="truncate text-xs text-content-tertiary">{user?.email}</p>
                    </div>
                    <button
                      role="menuitem"
                      onClick={() => { setMenuOpen(false); void logout(); }}
                      className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-content-secondary transition-colors duration-1 hover:bg-danger/12 hover:text-danger"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              variants={variants.fadeUp}
              initial="hidden"
              animate="show"
              exit="exit"
              className="mx-auto max-w-7xl px-6 py-8"
            >
              <Suspense fallback={<div className="space-y-4"><div className="skeleton h-9 w-48 rounded-md" /><div className="skeleton h-64 rounded-xl" /></div>}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
