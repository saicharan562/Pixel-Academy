import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Check } from 'lucide-react';
import { IconButton } from './ui.js';
import { formatDate } from '../lib/format.js';
import {
  useNotifications, useUnreadCount, useMarkRead, useMarkAllRead, entityPath,
  type NotificationRow,
} from '../features/notifications/api.js';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const unread = useUnreadCount();
  const list = useNotifications({});
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const count = unread.data?.count ?? 0;
  const rows = list.data?.data ?? [];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  function onOpen(n: NotificationRow) {
    if (!n.readAt) markRead.mutate(n.id);
    const path = entityPath(n.entityType);
    if (path) { navigate(path); setOpen(false); }
  }

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <IconButton label="Notifications" icon={Bell} onClick={() => setOpen((o) => !o)} />
        {count > 0 && (
          <span className="nums pointer-events-none absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-2xs font-semibold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-surface-2 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
              <span className="text-sm font-semibold text-content">Notifications</span>
              {count > 0 && (
                <button onClick={() => markAll.mutate()} className="inline-flex items-center gap-1 text-xs text-accent-300 transition-colors hover:text-accent-200">
                  <Check className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {rows.length === 0 ? (
                <p className="px-3.5 py-8 text-center text-sm text-content-tertiary">You're all caught up.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {rows.slice(0, 12).map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => onOpen(n)}
                        className="flex w-full gap-2.5 px-3.5 py-2.5 text-left transition-colors duration-1 hover:bg-surface-3"
                      >
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-accent'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-content">{n.title}</span>
                          {n.body && <span className="block truncate text-xs text-content-tertiary">{n.body}</span>}
                          <span className="block text-2xs text-content-tertiary">{formatDate(n.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
