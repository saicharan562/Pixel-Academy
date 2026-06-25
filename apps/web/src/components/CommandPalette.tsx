import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, LogOut, Search, type LucideIcon } from 'lucide-react';
import { useAuth } from '../lib/auth.js';
import { NAV_ITEMS } from '../nav.js';
import { KBD } from './ui.js';
import { cn } from '../lib/utils.js';

interface Command { id: string; label: string; hint?: string; Icon: LucideIcon; run: () => void; group: string }

/** Case-insensitive subsequence fuzzy score; higher is better, -1 = no match. */
function fuzzyScore(query: string, text: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0; let score = 0; let streak = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) { qi++; streak++; score += streak + (ti === 0 ? 4 : 0); }
    else streak = 0;
  }
  return qi === q.length ? score : -1;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { can, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => { navigate(path); onClose(); };
    const nav: Command[] = NAV_ITEMS
      .filter((i) => i.permission === null || can(i.permission))
      .map((i) => ({ id: `nav:${i.path}`, label: i.label, hint: i.desc, Icon: i.Icon, group: 'Navigate', run: go(i.path) }));
    const actions: Command[] = [
      { id: 'act:signout', label: 'Sign out', hint: 'End your session', Icon: LogOut, group: 'Actions', run: () => { void logout(); onClose(); } },
    ];
    return [...nav, ...actions];
  }, [can, logout, navigate, onClose]);

  const results = useMemo(() => {
    if (!query) return commands;
    return commands
      .map((c) => ({ c, s: Math.max(fuzzyScore(query, c.label), fuzzyScore(query, c.hint ?? '') - 2) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);
  }, [commands, query]);

  useEffect(() => { if (open) { setQuery(''); setActive(0); } }, [open]);
  useEffect(() => { setActive(0); }, [query]);

  // Global hotkey: ⌘K / Ctrl+K handled by the parent (AppShell). Here we handle
  // in-list navigation only.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); results[active]?.run(); }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let lastGroup = '';

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          onKeyDown={onKeyDown}
          className="glass-strong fixed left-1/2 top-[18vh] z-[91] w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl shadow-lg focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="h-4 w-4 shrink-0 text-content-tertiary" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or jump to…"
              className="h-12 w-full bg-transparent text-sm text-content placeholder:text-content-tertiary focus:outline-none"
            />
            <KBD>esc</KBD>
          </div>

          <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
            {results.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-content-tertiary">No results for “{query}”.</p>
            )}
            {results.map((c, i) => {
              const header = c.group !== lastGroup ? c.group : null;
              lastGroup = c.group;
              return (
                <div key={c.id}>
                  {header && <div className="px-3 pb-1 pt-3 text-2xs font-semibold uppercase tracking-wider text-content-tertiary">{header}</div>}
                  <button
                    data-idx={i}
                    onMouseMove={() => setActive(i)}
                    onClick={() => c.run()}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-1',
                      i === active ? 'bg-accent/14 text-content' : 'text-content-secondary',
                    )}
                  >
                    <c.Icon className={cn('h-[18px] w-[18px]', i === active ? 'text-accent-300' : 'text-content-tertiary')} />
                    <span className="flex-1">
                      {c.label}
                      {c.hint && <span className="ml-2 text-xs text-content-tertiary">{c.hint}</span>}
                    </span>
                    {i === active && <ArrowRight className="h-4 w-4 text-content-tertiary" />}
                  </button>
                </div>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
