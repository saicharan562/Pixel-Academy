import { useState, type FormEvent } from 'react';
import { FolderKanban, Plus, Search, Trash2 } from 'lucide-react';
import {
  PROJECT_STATUS, MILESTONE_STATUS, PERMISSIONS,
  type ProjectStatus, type MilestoneStatus, type CreateProjectInput,
} from '@pixel/shared';
import { useAuth } from '../lib/auth.js';
import { ApiRequestError } from '../lib/api.js';
import { useToast } from '../components/ui/toast.js';
import { formatINR, titleCase } from '../lib/format.js';
import {
  Avatar, Badge, Button, DataTable, EmptyState, ErrorNote, Field, Input, Modal, PageHeader,
  SegmentedControl, Select, Sheet, SheetSection, Spinner, type Column, type Tone,
} from '../components/ui.js';
import {
  useProjects, useProject, useCreateProject, useDeleteProject,
  useAddMilestone, useUpdateMilestone, useDeleteMilestone, type ProjectRow,
} from '../features/projects/api.js';
import { useClientOptions, useUserOptions } from '../features/lookups/api.js';

const statusTone: Record<ProjectStatus, Tone> = {
  planned: 'slate', active: 'green', on_hold: 'amber', completed: 'blue', cancelled: 'red',
};
const msTone: Record<MilestoneStatus, Tone> = { open: 'slate', in_progress: 'blue', done: 'green' };

export function ProjectsPage() {
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error } = useProjects({ search: search || undefined, status: status || undefined });
  const rows = data?.data ?? [];

  const columns: Column<ProjectRow>[] = [
    {
      key: 'name', header: 'Project', sortValue: (p) => p.name.toLowerCase(),
      render: (p) => (
        <div>
          <div className="font-medium text-content">{p.name}</div>
          {p.code && <div className="font-mono text-xs text-content-tertiary">{p.code}</div>}
        </div>
      ),
    },
    { key: 'client', header: 'Client', collapse: true, sortValue: (p) => p.client.displayName.toLowerCase(), render: (p) => <span className="text-content-secondary">{p.client.displayName}</span> },
    {
      key: 'manager', header: 'Manager', collapse: true,
      render: (p) => <span className="inline-flex items-center gap-2"><Avatar name={p.manager.fullName} size="sm" /><span className="text-content-secondary">{p.manager.fullName}</span></span>,
    },
    { key: 'budget', header: 'Budget', align: 'right', collapse: true, sortValue: (p) => Number(p.budgetInr ?? 0), render: (p) => <span className="nums text-content-secondary">{formatINR(p.budgetInr)}</span> },
    { key: 'status', header: 'Status', sortValue: (p) => p.status, render: (p) => <Badge tone={statusTone[p.status]} dot>{titleCase(p.status)}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Engagements, milestones and budgets"
        action={can(PERMISSIONS.PROJECT_CREATE) ? <Button icon={Plus} onClick={() => setCreating(true)}>New project</Button> : undefined}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <Input icon={Search} placeholder="Search projects…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search projects" />
        </div>
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus | '')} className="w-40">
          <option value="">All statuses</option>
          {PROJECT_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </Select>
        <div className="ml-auto">
          <SegmentedControl
            ariaLabel="Row density" value={density} onChange={setDensity}
            options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]}
          />
        </div>
      </div>

      {error ? (
        <ErrorNote message={(error as ApiRequestError).displayMessage} />
      ) : (
        <DataTable
          columns={columns} rows={rows} getRowId={(p) => p.id} onRowClick={(p) => setSelectedId(p.id)}
          isLoading={isLoading} density={density}
          empty={
            <EmptyState
              icon={FolderKanban}
              title={search || status ? 'No matching projects' : 'No projects yet'}
              description={search || status ? 'Adjust your filters to see more.' : 'Spin up your first engagement to track milestones and budgets.'}
              action={can(PERMISSIONS.PROJECT_CREATE) && !search && !status ? <Button icon={Plus} onClick={() => setCreating(true)}>New project</Button> : undefined}
            />
          }
        />
      )}

      {creating && <CreateProjectModal onClose={() => setCreating(false)} />}
      <ProjectSheet id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const create = useCreateProject();
  const toast = useToast();
  const clients = useClientOptions();
  const users = useUserOptions();
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ clientId: '', name: '', code: '', managerId: '', status: 'planned' as ProjectStatus, budgetInr: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const input: CreateProjectInput = {
      clientId: form.clientId, name: form.name, code: form.code || undefined,
      managerId: form.managerId, status: form.status,
      budgetInr: form.budgetInr ? Number(form.budgetInr) : undefined,
    };
    try { await create.mutateAsync(input); toast.success('Project created', form.name); onClose(); }
    catch (e2) { setErr(e2 instanceof ApiRequestError ? e2.displayMessage : 'Failed to create project'); }
  }

  return (
    <Modal open onClose={onClose} title="New project" description="Create an engagement and assign its manager." size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Client" value={form.clientId} onChange={set('clientId')} required>
            <option value="">Select client…</option>
            {clients.data?.data.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </Select>
          <Select label="Manager" value={form.managerId} onChange={set('managerId')} required>
            <option value="">Select manager…</option>
            {users.data?.data.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </Select>
          <Input label="Name" value={form.name} onChange={set('name')} required />
          <Input label="Code" hint="Optional" value={form.code} onChange={set('code')} placeholder="PRJ-001" />
          <Input label="Budget (₹)" hint="Optional" type="number" min="0" value={form.budgetInr} onChange={set('budgetInr')} />
          <Select label="Status" value={form.status} onChange={set('status')}>
            {PROJECT_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </Select>
        </div>
        {err && <ErrorNote message={err} />}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Create project</Button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { can } = useAuth();
  const toast = useToast();
  const { data, isLoading } = useProject(id);
  const del = useDeleteProject();
  const addMs = useAddMilestone(id ?? '');
  const updMs = useUpdateMilestone(id ?? '');
  const delMs = useDeleteMilestone(id ?? '');
  const [msName, setMsName] = useState('');

  async function onDelete() {
    if (!id || !confirm('Soft-delete this project?')) return;
    try { await del.mutateAsync(id); toast.success('Project deleted'); onClose(); }
    catch (e) { toast.error('Delete failed', e instanceof ApiRequestError ? e.displayMessage : undefined); }
  }
  async function onAddMilestone(e: FormEvent) {
    e.preventDefault();
    if (!msName) return;
    try { await addMs.mutateAsync({ name: msName, status: 'open', orderIndex: data?.milestones.length ?? 0 }); setMsName(''); toast.success('Milestone added'); }
    catch (e2) { toast.error('Could not add milestone', e2 instanceof ApiRequestError ? e2.displayMessage : undefined); }
  }

  return (
    <Sheet
      open={!!id} onClose={onClose} width="lg"
      title={data?.name ?? 'Project'} subtitle={data?.client.displayName}
      footer={
        <div className="flex items-center justify-between">
          {can(PERMISSIONS.PROJECT_DELETE) ? <Button variant="danger" size="sm" icon={Trash2} loading={del.isPending} onClick={() => void onDelete()}>Delete</Button> : <span />}
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {isLoading || !data ? <Spinner /> : (
        <>
          <SheetSection title="Overview">
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="Status" value={<Badge tone={statusTone[data.status]} dot>{titleCase(data.status)}</Badge>} />
              <Field label="Budget" value={<span className="nums">{formatINR(data.budgetInr)}</span>} />
              <Field label="Manager" value={data.manager.fullName} />
              <Field label="Code" value={data.code ?? '—'} />
            </div>
          </SheetSection>

          <SheetSection title={`Members · ${data.members.length}`}>
            {data.members.length === 0 ? (
              <p className="text-sm text-content-tertiary">No members assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.members.map((m) => (
                  <span key={m.userId} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 py-1 pl-1 pr-3 text-sm">
                    <Avatar name={m.user.fullName} size="sm" /> <span className="text-content-secondary">{m.user.fullName}</span>
                  </span>
                ))}
              </div>
            )}
          </SheetSection>

          <SheetSection title={`Milestones · ${data.milestones.length}`}>
            <ul className="space-y-1.5">
              {data.milestones.length === 0 && <li className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-content-tertiary">No milestones yet.</li>}
              {data.milestones.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
                  <span className="font-medium text-content">{m.name}</span>
                  <span className="flex items-center gap-2">
                    {can(PERMISSIONS.MILESTONE_EDIT) ? (
                      <select
                        value={m.status}
                        onChange={(e) => updMs.mutate({ id: m.id, status: e.target.value as MilestoneStatus })}
                        className="h-7 rounded-md border border-line bg-surface px-2 text-xs text-content [&>option]:bg-surface"
                        aria-label={`Status for ${m.name}`}
                      >
                        {MILESTONE_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                      </select>
                    ) : <Badge tone={msTone[m.status]}>{titleCase(m.status)}</Badge>}
                    {can(PERMISSIONS.MILESTONE_DELETE) && (
                      <button onClick={() => void delMs.mutate(m.id)} aria-label={`Delete ${m.name}`} className="text-danger transition-colors hover:text-danger/80"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {can(PERMISSIONS.MILESTONE_CREATE) && (
              <form onSubmit={onAddMilestone} className="mt-3 flex gap-2">
                <input placeholder="New milestone…" value={msName} onChange={(e) => setMsName(e.target.value)}
                  className="h-9 flex-1 rounded-md border border-line bg-surface-2 px-3 text-sm text-content placeholder:text-content-tertiary focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/25" />
                <Button type="submit" variant="secondary" size="sm" loading={addMs.isPending}>Add</Button>
              </form>
            )}
          </SheetSection>
        </>
      )}
    </Sheet>
  );
}
