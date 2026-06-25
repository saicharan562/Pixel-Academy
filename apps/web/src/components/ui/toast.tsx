import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, TriangleAlert, X, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils.js';

type ToastTone = 'success' | 'error' | 'info' | 'warning';
interface Toast { id: number; tone: ToastTone; title: string; description?: string }

interface ToastApi {
  show: (tone: ToastTone, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const config: Record<ToastTone, { icon: LucideIcon; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'text-success' },
  error: { icon: XCircle, cls: 'text-danger' },
  info: { icon: Info, cls: 'text-info' },
  warning: { icon: TriangleAlert, cls: 'text-warning' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback((tone: ToastTone, title: string, description?: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, tone, title, description }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const api = useMemo<ToastApi>(() => ({
    show,
    success: (t, d) => show('success', t, d),
    error: (t, d) => show('error', t, d),
    info: (t, d) => show('info', t, d),
    warning: (t, d) => show('warning', t, d),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2" role="region" aria-label="Notifications">
          <AnimatePresence initial={false}>
            {toasts.map((t) => {
              const { icon: Icon, cls } = config[t.tone];
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="glass-strong pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg"
                  role="status"
                >
                  <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', cls)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-content">{t.title}</p>
                    {t.description && <p className="mt-0.5 text-xs text-content-tertiary">{t.description}</p>}
                  </div>
                  <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-content-tertiary transition-colors hover:text-content">
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
