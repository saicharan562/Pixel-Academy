import { useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Columns3, ListChecks, Plus, Table2, Trash2 } from 'lucide-react';
import {
  TASK_STATUS, PRIORITY, TASK_TRANSITIONS, PERMISSIONS,
  type TaskStatus, type Priority, type CreateTaskInput,
} from '@pixel/shared';
import { useAuth } from '../lib/auth.js';
import { ApiRequestError } from '../lib/api.js';
import { useToast } from '../components/ui/toast.js';
import { titleCase } from '../lib/format.js';
import {
  Avatar, Badge, Button, DataTable, EmptyState, ErrorNote, Field, Input, Modal, PageHeader,
  SegmentedControl, Select, Sheet, SheetSection, Spinner, type Column, type Tone,
} from '../components/ui.js';
import {
  useTasks, useTask, useCreateTask, useUpdateTask, useDeleteTask, useMoveTask, type TaskRow,
} from '../features/tasks/api.js';
import { useProjects } from '../features/projects/api.js';
import { useUserOptions } from '../features/lookups/api.js';
import { cn } from '../lib/utils.js';

const statusTone: Record<TaskStatus, Tone> = { todo: 'slate', in_progress: 'blue', blocked: 'red', review: 'amber', done: 'green' };
const prioTone: Record<Priority, Tone> = { low: 'slate', medium: 'blue', high: 'amber', urgent: 'red' };

export function TasksPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [view, setView] = useState<'table' | 'board'>('table');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [projectId, setProjectId] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const projects = useProjects({});
  const { data, isLoading, error } = useTasks({ status: status || undefined, projectId: projectId || undefined });
  const move = useMoveTask();
  const rows = data?.data ?? [];

  const columns: Column<TaskRow>[] = [
    { key: 'title', header: 'Task', sortValue: (t) => t.title.toLowerCase(), render: (t) => <span className="font-medium text-content">{t.title}</span> },
    { key: 'project', header: 'Project', collapse: true, sortValue: (t) => t.project.name.toLowerCase(), render: (t) => <span className="text-content-secondary">{t.project.name}</span> },
    {
      key: 'assignee', header: 'Assignee', collapse: true,
      render: (t) => t.assignee ? <span className="inline-flex items-center gap-2"><Avatar name={t.assignee.fullName} size="sm" /><span className="text-content-secondary">{t.assignee.fullName}</span></span> : <span className="text-content-tertiary">Unassigned</span>,
    },
    { key: 'priority', header: 'Priority', sortValue: (t) => PRIORITY.indexOf(t.priority), render: (t) => <Badge tone={prioTone[t.priority]}>{t.priority}</Badge> },
    { key: 'status', header: 'Status', sortValue: (t) => TASK_STATUS.indexOf(t.status), render: (t) => <Badge tone={statusTone[t.status]} dot>{titleCase(t.status)}</Badge> },
  ];

  function onDrop(taskId: string, from: TaskStatus, to: TaskStatus) {
    if (from === to) return;
    if (!(TASK_TRANSITIONS[from] ?? []).includes(to)) {
      toast.warning('Move not allowed', `Can't go ${titleCase(from)} → ${titleCase(to)}.`);
      return;
    }
    move.mutate({ id: taskId, status: to }, {
      onError: (e) => toast.error('Move failed', e instanceof ApiRequestError ? e.message : undefined),
    });
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Workstreams, dependencies and status flow"
        action={
          <div className="flex items-center gap-3">
            <SegmentedControl
              ariaLabel="View"
              value={view}
              onChange={setView}
              options={[
                { value: 'table', label: <span className="flex items-center gap-1.5"><Table2 className="h-3.5 w-3.5" /> Table</span> },
                { value: 'board', label: <span className="flex items-center gap-1.5"><Columns3 className="h-3.5 w-3.5" /> Board</span> },
              ]}
            />
            {can(PERMISSIONS.TASK_CREATE) && <Button icon={Plus} onClick={() => setCreating(true)}>New task</Button>}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select aria-label="Filter by project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-52">
          <option value="">All projects</option>
          {projects.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus | '')} className="w-40">
          <option value="">All statuses</option>
          {TASK_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </Select>
      </div>

      {error ? (
        <ErrorNote message={(error as ApiRequestError).message} />
      ) : view === 'table' ? (
        <DataTable
          columns={columns} rows={rows} getRowId={(t) => t.id} onRowClick={(t) => setSelectedId(t.id)}
          isLoading={isLoading}
          empty={
            <EmptyState
              icon={ListChecks}
              title={status || projectId ? 'No matching tasks' : 'No tasks yet'}
              description={status || projectId ? 'Adjust your filters to see more.' : 'Create your first task to start tracking work.'}
              action={can(PERMISSIONS.TASK_CREATE) && !status && !projectId ? <Button icon={Plus} onClick={() => setCreating(true)}>New task</Button> : undefined}
            />
          }
        />
      ) : (
        <Board rows={rows} loading={isLoading} canDrag={can(PERMISSIONS.TASK_EDIT)} onOpen={setSelectedId} onDrop={onDrop} />
      )}

      {creating && <CreateTaskModal onClose={() => setCreating(false)} />}
      <TaskSheet id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

/* ───────────────────────────── Kanban ───────────────────────────── */

function Board({
  rows, loading, canDrag, onOpen, onDrop,
}: {
  rows: TaskRow[]; loading: boolean; canDrag: boolean;
  onOpen: (id: string) => void; onDrop: (taskId: string, from: TaskStatus, to: TaskStatus) => void;
}) {
  const [over, setOver] = useState<TaskStatus | null>(null);
  const grouped = useMemo(() => {
    const map = Object.fromEntries(TASK_STATUS.map((s) => [s, [] as TaskRow[]])) as Record<TaskStatus, TaskRow[]>;
    rows.forEach((t) => map[t.status].push(t));
    return map;
  }, [rows]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {TASK_STATUS.map((s) => <div key={s} className="h-64 rounded-xl border border-line bg-surface-2/40" />)}
      </div>
    );
  }

  const handleDrop = (e: DragEvent, to: TaskStatus) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData('text/task-id');
    const from = e.dataTransfer.getData('text/task-from') as TaskStatus;
    if (id && from) onDrop(id, from, to);
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {TASK_STATUS.map((s) => (
        <div
          key={s}
          onDragOver={(e) => { if (canDrag) { e.preventDefault(); setOver(s); } }}
          onDragLeave={() => setOver((o) => (o === s ? null : o))}
          onDrop={(e) => handleDrop(e, s)}
          className={cn(
            'flex min-h-[16rem] flex-col rounded-xl border bg-surface/60 p-2 transition-colors duration-1',
            over === s ? 'border-accent/50 bg-accent/[0.05]' : 'border-line',
          )}
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="flex items-center gap-2 text-sm font-medium text-content"><Badge tone={statusTone[s]} dot>{titleCase(s)}</Badge></span>
            <span className="nums text-xs text-content-tertiary">{grouped[s].length}</span>
          </div>
          <div className="flex flex-1 flex-col gap-2 p-1">
            {grouped[s].length === 0 && <div className="rounded-lg border border-dashed border-line py-6 text-center text-xs text-content-tertiary">Empty</div>}
            {grouped[s].map((t) => (
              <motion.button
                layout
                key={t.id}
                draggable={canDrag}
                onDragStart={(e) => {
                  const dt = (e as unknown as DragEvent).dataTransfer;
                  dt.setData('text/task-id', t.id);
                  dt.setData('text/task-from', t.status);
                  dt.effectAllowed = 'move';
                }}
                onClick={() => onOpen(t.id)}
                className={cn(
                  'group rounded-lg border border-line bg-surface-2 p-3 text-left shadow-xs transition-colors duration-1 hover:border-line-strong',
                  canDrag && 'cursor-grab active:cursor-grabbing',
                )}
              >
                <p className="text-sm font-medium text-content">{t.title}</p>
                <p className="mt-0.5 truncate text-xs text-content-tertiary">{t.project.name}</p>
                <div className="mt-2.5 flex items-center justify-between">
                  <Badge tone={prioTone[t.priority]}>{t.priority}</Badge>
                  {t.assignee ? <Avatar name={t.assignee.fullName} size="sm" /> : <span className="text-2xs text-content-tertiary">Unassigned</span>}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Create / detail ───────────────────────── */

function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const create = useCreateTask();
  const toast = useToast();
  const projects = useProjects({});
  const users = useUserOptions();
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ projectId: '', title: '', assigneeId: '', priority: 'medium' as Priority, dueDate: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const input: CreateTaskInput = {
      projectId: form.projectId, title: form.title, priority: form.priority, status: 'todo',
      assigneeId: form.assigneeId || undefined, dueDate: form.dueDate || undefined,
    };
    try { await create.mutateAsync(input); toast.success('Task created', form.title); onClose(); }
    catch (e2) { setErr(e2 instanceof ApiRequestError ? e2.message : 'Failed to create task'); }
  }

  return (
    <Modal open onClose={onClose} title="New task" description="Add a task to a project workstream.">
      <form onSubmit={submit} className="space-y-3.5">
        <Select label="Project" value={form.projectId} onChange={set('projectId')} required>
          <option value="">Select project…</option>
          {projects.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Input label="Title" value={form.title} onChange={set('title')} required />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Assignee" hint="Optional" value={form.assigneeId} onChange={set('assigneeId')}>
            <option value="">Unassigned</option>
            {users.data?.data.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </Select>
          <Select label="Priority" value={form.priority} onChange={set('priority')}>
            {PRIORITY.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
          </Select>
          <Input label="Due date" hint="Optional" type="date" value={form.dueDate} onChange={set('dueDate')} />
        </div>
        {err && <ErrorNote message={err} />}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Create task</Button>
        </div>
      </form>
    </Modal>
  );
}

function TaskSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { can } = useAuth();
  const toast = useToast();
  const { data, isLoading } = useTask(id);
  const upd = useUpdateTask(id ?? '');
  const del = useDeleteTask();

  function changeStatus(status: TaskStatus) {
    upd.mutate({ status }, {
      onSuccess: () => toast.success('Status updated', titleCase(status)),
      onError: (e) => toast.error('Update failed', e instanceof ApiRequestError ? e.message : undefined),
    });
  }
  async function onDelete() {
    if (!id || !confirm('Soft-delete this task?')) return;
    try { await del.mutateAsync(id); toast.success('Task deleted'); onClose(); }
    catch (e) { toast.error('Delete failed', e instanceof ApiRequestError ? e.message : undefined); }
  }

  return (
    <Sheet
      open={!!id} onClose={onClose}
      title={data?.title ?? 'Task'} subtitle={data?.project.name}
      footer={
        <div className="flex items-center justify-between">
          {can(PERMISSIONS.TASK_DELETE) ? <Button variant="danger" size="sm" icon={Trash2} loading={del.isPending} onClick={() => void onDelete()}>Delete</Button> : <span />}
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {isLoading || !data ? <Spinner /> : (
        <>
          <SheetSection title="Details">
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="Assignee" value={data.assignee?.fullName ?? 'Unassigned'} />
              <Field label="Priority" value={<Badge tone={prioTone[data.priority]}>{data.priority}</Badge>} />
              <div>
                <div className="text-2xs font-medium uppercase tracking-wide text-content-tertiary">Status</div>
                {can(PERMISSIONS.TASK_EDIT) ? (
                  <select
                    value={data.status}
                    onChange={(e) => changeStatus(e.target.value as TaskStatus)}
                    className="mt-1 h-8 rounded-md border border-line bg-surface-2 px-2 text-sm text-content [&>option]:bg-surface"
                    aria-label="Task status"
                  >
                    {TASK_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                  </select>
                ) : <div className="mt-1"><Badge tone={statusTone[data.status]} dot>{titleCase(data.status)}</Badge></div>}
              </div>
            </div>
            {data.description && (
              <p className="mt-4 rounded-lg border border-line bg-surface-2 p-3 text-sm text-content-secondary">{data.description}</p>
            )}
          </SheetSection>

          {data.subtasks.length > 0 && (
            <SheetSection title={`Subtasks · ${data.subtasks.length}`}>
              <ul className="space-y-1.5">
                {data.subtasks.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
                    <span className="text-content">{s.title}</span><Badge tone={statusTone[s.status]}>{titleCase(s.status)}</Badge>
                  </li>
                ))}
              </ul>
            </SheetSection>
          )}

          {data.dependencies.length > 0 && (
            <SheetSection title={`Depends on · ${data.dependencies.length}`}>
              <ul className="space-y-1.5">
                {data.dependencies.map((d) => (
                  <li key={d.dependsOnTaskId} className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
                    <span className="text-content">{d.dependsOn.title}</span><Badge tone={statusTone[d.dependsOn.status]}>{titleCase(d.dependsOn.status)}</Badge>
                  </li>
                ))}
              </ul>
            </SheetSection>
          )}
        </>
      )}
    </Sheet>
  );
}
