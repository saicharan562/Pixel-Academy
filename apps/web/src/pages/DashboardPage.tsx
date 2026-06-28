import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight, ArrowUpRight, Building2, FolderKanban, IndianRupee, ListChecks, Plus,
  Repeat, ShieldCheck, TrendingUp, Users, type LucideIcon,
} from 'lucide-react';
import {
  CLIENT_STATUS, PROJECT_STATUS, TASK_STATUS, PERMISSIONS, type PermissionKey,
} from '@pixel/shared';
import { useAuth } from '../lib/auth.js';
import { useRich3D } from '../lib/capabilities.js';
import { formatINR } from '../lib/format.js';
import { AnimatedCounter, FadeItem, Lift, Stagger } from '../components/motion.js';
import { Avatar, Badge, Card, EmptyState, Skeleton, Sparkline, type Tone } from '../components/ui.js';
import { useClients } from '../features/clients/api.js';
import { useProjects } from '../features/projects/api.js';
import { useTasks, type TaskRow } from '../features/tasks/api.js';
import { isOrgDashboard, useDashboard } from '../features/reports/api.js';

const Hero3D = lazy(() => import('../components/three/Hero3D.js').then((m) => ({ default: m.Hero3D })));

const taskTone: Record<string, Tone> = {
  todo: 'slate', in_progress: 'blue', blocked: 'red', review: 'amber', done: 'green',
};

function countBy<T extends string>(rows: { status: T }[], order: readonly T[]): number[] {
  return order.map((s) => rows.filter((r) => r.status === s).length);
}

export function DashboardPage() {
  const { user, permissions, can } = useAuth();
  const rich = useRich3D();

  const clients = useClients({});
  const projects = useProjects({});
  const tasks = useTasks({});
  const dashboard = useDashboard();
  const loading = clients.isLoading || projects.isLoading || tasks.isLoading;
  const org = isOrgDashboard(dashboard.data) ? dashboard.data : null;

  const clientRows = clients.data?.data ?? [];
  const projectRows = projects.data?.data ?? [];
  const taskRows = tasks.data?.data ?? [];

  const doneTasks = taskRows.filter((t) => t.status === 'done').length;
  const activeClients = clientRows.filter((c) => c.status === 'active').length;
  const activeProjects = projectRows.filter((p) => p.status === 'active').length;

  interface Kpi {
    label: string; value: number; series: number[]; perm: PermissionKey | null;
    to: string; Icon: LucideIcon; foot: string; tone: 'accent' | 'success' | 'danger';
  }
  const allKpis: Kpi[] = [
    { label: 'Clients', value: clientRows.length, series: countBy(clientRows, CLIENT_STATUS), perm: PERMISSIONS.CLIENT_VIEW, to: '/clients', Icon: Building2, foot: `${activeClients} active`, tone: 'accent' },
    { label: 'Projects', value: projectRows.length, series: countBy(projectRows, PROJECT_STATUS), perm: PERMISSIONS.PROJECT_VIEW, to: '/projects', Icon: FolderKanban, foot: `${activeProjects} in delivery`, tone: 'success' },
    { label: 'Tasks', value: taskRows.length, series: countBy(taskRows, TASK_STATUS), perm: PERMISSIONS.TASK_VIEW, to: '/tasks', Icon: ListChecks, foot: `${doneTasks} completed`, tone: 'accent' },
    { label: 'Permissions', value: permissions.size, series: [2, 4, 3, 6, 5, permissions.size || 1], perm: null, to: '#', Icon: ShieldCheck, foot: `${user?.role} clearance`, tone: 'success' },
  ];
  const kpis = allKpis.filter((k) => k.perm === null || can(k.perm));

  const recentTasks = [...taskRows].slice(-6).reverse();
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  const quickActions = [
    { label: 'New client', to: '/clients', perm: PERMISSIONS.CLIENT_CREATE, Icon: Building2 },
    { label: 'New project', to: '/projects', perm: PERMISSIONS.PROJECT_CREATE, Icon: FolderKanban },
    { label: 'New task', to: '/tasks', perm: PERMISSIONS.TASK_CREATE, Icon: ListChecks },
  ].filter((a) => can(a.perm));

  return (
    <div className="space-y-8">
      {/* Greeting + 3D accent */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="relative h-full overflow-hidden p-7">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
            <p className="text-sm text-content-tertiary">Good to see you,</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Welcome back, <span className="text-aurora">{firstName}</span>.
            </h1>
            <p className="mt-2 max-w-md text-sm text-content-tertiary">
              Here's the pulse of your workspace — accounts, delivery and workstreams, all in one place.
            </p>
            {quickActions.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {quickActions.map((a) => (
                  <Link
                    key={a.label} to={a.to}
                    className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3.5 py-2 text-sm text-content-secondary transition-colors duration-2 hover:border-accent/40 hover:text-content"
                  >
                    <Plus className="h-4 w-4 text-accent-300" /> {a.label}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
          <Card className="relative h-full min-h-[200px] overflow-hidden">
            <div className="absolute left-4 top-4 z-10">
              <p className="text-2xs font-semibold uppercase tracking-wider text-content-tertiary">Live core</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-content-secondary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Systems nominal
              </p>
            </div>
            {rich ? (
              <Suspense fallback={<div className="h-full min-h-[200px]" />}>
                <div className="h-full min-h-[200px]"><Hero3D /></div>
              </Suspense>
            ) : (
              <div className="grid h-full min-h-[200px] place-items-center">
                <div className="h-28 w-28 rounded-full bg-gradient-to-br from-accent-400 to-accent-700 opacity-80 blur-[2px]" />
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Executive KPIs — revenue, MRR, utilization (org-wide roles only) */}
      {org && (
        <section>
          <h2 className="mb-3 text-2xs font-semibold uppercase tracking-wider text-content-tertiary">Executive overview</h2>
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FadeItem>
              <Card className="p-5">
                <div className="flex items-center gap-2 text-content-tertiary">
                  <IndianRupee className="h-4 w-4" />
                  <p className="text-2xs font-medium uppercase tracking-wider">Revenue (MTD)</p>
                </div>
                <p className="nums mt-2 text-2xl font-semibold text-content">{formatINR(org.revenueThisMonthInr)}</p>
              </Card>
            </FadeItem>
            <FadeItem>
              <Card className="p-5">
                <div className="flex items-center gap-2 text-content-tertiary">
                  <Repeat className="h-4 w-4" />
                  <p className="text-2xs font-medium uppercase tracking-wider">MRR</p>
                </div>
                <p className="nums mt-2 text-2xl font-semibold text-content">{formatINR(org.mrrInr)}</p>
              </Card>
            </FadeItem>
            <FadeItem>
              <Card className="p-5">
                <div className="flex items-center gap-2 text-content-tertiary">
                  <Users className="h-4 w-4" />
                  <p className="text-2xs font-medium uppercase tracking-wider">Team utilization</p>
                </div>
                <p className="nums mt-2 text-2xl font-semibold text-content">{org.teamUtilizationPct}%</p>
              </Card>
            </FadeItem>
            <FadeItem>
              <Card className="p-5">
                <div className="flex items-center gap-2 text-content-tertiary">
                  <FolderKanban className="h-4 w-4" />
                  <p className="text-2xs font-medium uppercase tracking-wider">Delayed projects</p>
                </div>
                <p className="nums mt-2 text-2xl font-semibold text-content">{org.delayedProjects}</p>
                <p className="mt-1 text-xs text-content-tertiary">{formatINR(org.outstandingReceivablesInr)} outstanding</p>
              </Card>
            </FadeItem>
          </Stagger>
        </section>
      )}

      {/* KPI cards */}
      <section>
        <h2 className="mb-3 text-2xs font-semibold uppercase tracking-wider text-content-tertiary">Overview</h2>
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <FadeItem key={k.label}>
              <Lift>
                <Link to={k.to} className="block">
                  <Card interactive className="group p-5">
                    <div className="flex items-start justify-between">
                      <div className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface-2 text-accent-300">
                        <k.Icon className="h-[18px] w-[18px]" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-content-tertiary opacity-0 transition-all duration-2 group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-2xs font-medium uppercase tracking-wider text-content-tertiary">{k.label}</p>
                        <p className="nums mt-1 text-3xl font-semibold tracking-tight text-content">
                          {loading ? <Skeleton className="h-8 w-12" /> : <AnimatedCounter value={k.value} />}
                        </p>
                      </div>
                      <Sparkline data={k.series.some((n) => n > 0) ? k.series : [1, 1]} tone={k.tone} className="mb-1" />
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-xs text-content-tertiary">
                      <TrendingUp className="h-3.5 w-3.5 text-success" /> {k.foot}
                    </p>
                  </Card>
                </Link>
              </Lift>
            </FadeItem>
          ))}
        </Stagger>
      </section>

      {/* Activity + distribution */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-content">Recent workstream activity</h2>
            {can(PERMISSIONS.TASK_VIEW) && (
              <Link to="/tasks" className="inline-flex items-center gap-1 text-xs text-accent-300 transition-colors hover:text-accent-200">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : recentTasks.length === 0 ? (
            <EmptyState icon={ListChecks} title="No activity yet" description="Tasks you and your team create will surface here." />
          ) : (
            <ul className="divide-y divide-line">
              {recentTasks.map((t: TaskRow) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={t.assignee?.fullName ?? '—'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-content">{t.title}</p>
                    <p className="truncate text-xs text-content-tertiary">{t.project.name} · {t.assignee?.fullName ?? 'Unassigned'}</p>
                  </div>
                  <Badge tone={taskTone[t.status] ?? 'slate'}>{t.status.replace('_', ' ')}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-content">Task distribution</h2>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
          ) : (
            <div className="space-y-3">
              {TASK_STATUS.map((s) => {
                const n = taskRows.filter((t) => t.status === s).length;
                const pct = taskRows.length ? Math.round((n / taskRows.length) * 100) : 0;
                return (
                  <DistRow key={s} label={s.replace('_', ' ')} pct={pct} count={n} tone={taskTone[s] ?? 'slate'} />
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

function DistRow({ label, pct, count, tone }: { label: string; pct: number; count: number; tone: Tone }) {
  const bar: Record<Tone, string> = {
    slate: 'bg-content-tertiary', green: 'bg-success', amber: 'bg-warning', red: 'bg-danger', blue: 'bg-info', violet: 'bg-accent',
  };
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="capitalize text-content-secondary">{label}</span>
        <span className="nums text-content-tertiary">{count}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className={`h-full rounded-full ${bar[tone]}`}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
