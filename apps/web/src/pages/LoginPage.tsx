import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Lock, Mail, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '../lib/auth.js';
import { ApiRequestError } from '../lib/api.js';
import { useMotion } from '../motion/index.js';
import { Button, Input } from '../components/ui.js';

const REMEMBER_KEY = 'pixel.lastEmail';

const highlights = [
  { Icon: Zap, title: 'Real-time ops core', body: 'Clients, projects and workstreams synced the moment they change.' },
  { Icon: ShieldCheck, title: 'Role-aware by design', body: 'Two-layer RBAC keeps every record scoped to who should see it.' },
  { Icon: Sparkles, title: 'Built for India', body: 'GST-native billing, INR-first finance, WhatsApp-ready comms.' },
];

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const { prefersReduced } = useMotion();
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? 'admin@pixelacademy.local');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => !!localStorage.getItem(REMEMBER_KEY));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      if (remember) localStorage.setItem(REMEMBER_KEY, email);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden border-r border-line bg-overlay lg:block">
        <div className="absolute inset-0 -z-0">
          <div className={`absolute -left-24 top-10 h-96 w-96 rounded-full bg-accent/20 blur-[120px] ${prefersReduced ? '' : 'animate-aurora-1'}`} />
          <div className={`absolute bottom-0 right-0 h-96 w-96 rounded-full bg-info/15 blur-[120px] ${prefersReduced ? '' : 'animate-aurora-2'}`} />
          <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(hsl(var(--text-1))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--text-1))_1px,transparent_1px)] [background-size:44px_44px]" />
        </div>
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-700 font-bold text-white shadow-glow">PA</div>
            <span className="text-lg font-semibold tracking-tight">Pixel Academy</span>
          </div>

          <div className="max-w-md">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight">
              The operating system for <span className="text-aurora">webinar-led businesses</span>.
            </h2>
            <div className="mt-8 space-y-5">
              {highlights.map((h, i) => (
                <motion.div
                  key={h.title}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: prefersReduced ? 0 : 0.15 + i * 0.1, duration: 0.4 }}
                  className="flex gap-3.5"
                >
                  <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-accent-300">
                    <h.Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-content">{h.title}</p>
                    <p className="mt-0.5 text-sm text-content-tertiary">{h.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="text-xs text-content-tertiary">© {new Date().getFullYear()} Pixel Academy · Operations Platform</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 lg:hidden">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-700 font-bold text-white shadow-glow">PA</div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-content-tertiary">Sign in to your operations workspace.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Input
              label="Email" type="email" autoComplete="username" icon={Mail}
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
            <Input
              label="Password" type="password" autoComplete="current-password" icon={Lock}
              value={password} onChange={(e) => setPassword(e.target.value)} required
            />

            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-content-secondary">
                <input
                  type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-line-strong bg-surface-2 text-accent focus:ring-accent/40"
                />
                Remember me
              </label>
              <button type="button" className="text-sm text-accent-300 transition-colors hover:text-accent-200">
                Forgot password?
              </button>
            </div>

            {error && (
              <motion.div
                key={error}
                initial={{ opacity: 0, x: prefersReduced ? 0 : [-6, 6, -4, 4, 0] }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
              >
                {error}
              </motion.div>
            )}

            <Button type="submit" size="lg" loading={submitting} className="w-full">
              {submitting ? 'Signing in…' : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-content-tertiary">
            <Link to="/welcome" className="transition-colors hover:text-content">← Back to home</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
