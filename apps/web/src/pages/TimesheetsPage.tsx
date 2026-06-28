import { useMemo, useState, type FormEvent } from 'react';
import { Check, Clock, Plus, Send, Trash2, X } from 'lucide-react';
import {
  TIMESHEET_STATUS, PERMISSIONS,
  type TimesheetStatus, type CreateTimesheetInput,
} from '@pixel/shared';
import { useAuth } from '../lib/auth.js';
import { ApiRequestError } from '../lib/api.js';
import { useToast } from '../components/ui/toast.js';
import { titleCase, formatDate } from '../lib/format.js';
import {
  Badge, Button, DataTable, EmptyState, ErrorNote, Input, Modal, PageHeader,
  Select, type Column, type Tone,
} from '../components/ui.js';
import {
  useTimesheets, useCreateTimesheet, useSubmitTimesheet, useDecideTimesheet, useDeleteTimesheet,
  type TimesheetRow,
} from '../features/timesheets/api.js';
import { useProjects } from '../features/projects/api.js';

const statusTone: Record<TimesheetStatus, Tone> = {
  draft: 'slate', submitted: 'amber', approved: 'green', rejected: 'red',
};

/** 135 → "2h 15m" */
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ') || '0m';
}

export function TimesheetsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const canApprove = can(PERMISSIONS.TIMESHEET_APPROVE);

  const [status, setStatus] = useState<TimesheetStatus | ''>('');
  const [projectId, setProjectId] = useState('');
  const [logging, setLogging] = useState(false);

  const projects = useProjects({});
  const { data, isLoading, error } = useTimesheets({
    status: status || undefined,
    projectId: projectId || undefined,
  });
  const submit = useSubmitTimesheet();
  const decide = useDecideTimesheet();
  const del = useDeleteTimesheet();
  const rows = data?.data ?? [];

  const totals = useMemo(() => {
    const minutes = rows.reduce((acc, r) => acc + r.minutes, 0);
    const byStatus = Object.fromEntries(TIMESHEET_STATUS.map((s) => [s, 0])) as Record<TimesheetStatus, number>;
    rows.forEach((r) => { byStatus[r.status] += r.minutes; });
    return { minutes, byStatus };
  }, [rows]);

  function onSubmit(id: string) {
    submit.mutate(id, {
      onSuccess: () => toast.success('Submitted for approval'),
      onError: (e) => toast.error('Submit failed', e instanceof ApiRequestError ? e.displayMessage : undefined),
    });
  }
  function onDecide(id: string, decision: 'approved' | 'rejected') {
    decide.mutate({ id, decision }, {
      onSuccess: () => toast.success(decision === 'approved' ? 'Timesheet approved' : 'Timesheet rejected'),
      onError: (e) => toast.error('Action failed', e instanceof ApiRequestError ? e.displayMessage : undefined),
    });
  }
  function onDelete(id: string) {
    if (!confirm('Delete this entry?')) return;
    del.mutate(id, {
      onSuccess: () => toast.success('Entry deleted'),
      onError: (e) => toast.error('Delete failed', e instanceof ApiRequestError ? e.displayMessage : undefined),
    });
  }

  const columns: Column<TimesheetRow>[] = [
    { key: 'workDate', header: 'Date', sortValue: (t) => t.workDate, render: (t) => <span className="text-content-secondary">{formatDate(t.workDate)}</span> },
    { key: 'user', header: 'Member', collapse: true, render: (t) => <span className="text-content-secondary">{t.user.fullName}</span> },
    {
      key: 'against', header: 'Logged against',
      render: (t) => (
        <span className="text-content">
          {t.task?.title ?? t.project?.name ?? '—'}
          {t.note && <span className="ml-2 text-xs text-content-tertiary">· {t.note}</span>}
        </span>
      ),
    },
    { key: 'minutes', header: 'Duration', sortValue: (t) => t.minutes, render: (t) => <span className="nums font-medium text-content">{formatDuration(t.minutes)}</span> },
    { key: 'status', header: 'Status', sortValue: (t) => TIMESHEET_STATUS.indexOf(t.status), render: (t) => <Badge tone={statusTone[t.status]} dot>{titleCase(t.status)}</Badge> },
    {
      key: 'actions', header: '', render: (t) => (
        <div className="flex items-center justify-end gap-1.5">
          {t.status === 'draft' && can(PERMISSIONS.TIMESHEET_EDIT) && (
            <Button size="sm" variant="secondary" icon={Send} loading={submit.isPending} onClick={() => onSubmit(t.id)}>Submit</Button>
          )}
          {t.status === 'submitted' && canApprove && (
            <>
              <Button size="sm" variant="secondary" icon={Check} loading={decide.isPending} onClick={() => onDecide(t.id, 'approved')}>Approve</Button>
              <Button size="sm" variant="secondary" icon={X} loading={decide.isPending} onClick={() => onDecide(t.id, 'rejected')}>Reject</Button>
            </>
          )}
          {(t.status === 'draft' || t.status === 'rejected') && can(PERMISSIONS.TIMESHEET_DELETE) && (
            <Button size="sm" variant="danger" icon={Trash2} loading={del.isPending} onClick={() => onDelete(t.id)} aria-label="Delete entry" />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Time tracking"
        subtitle="Log hours against tasks and projects, submit for approval"
        action={can(PERMISSIONS.TIMESHEET_CREATE) && <Button icon={Plus} onClick={() => setLogging(true)}>Log time</Button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Total logged" value={formatDuration(totals.minutes)} />
        <SummaryTile label="Submitted" value={formatDuration(totals.byStatus.submitted)} tone="amber" />
        <SummaryTile label="Approved" value={formatDuration(totals.byStatus.approved)} tone="green" />
        <SummaryTile label="Draft" value={formatDuration(totals.byStatus.draft)} tone="slate" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select aria-label="Filter by project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-52">
          <option value="">All projects</option>
          {projects.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as TimesheetStatus | '')} className="w-40">
          <option value="">All statuses</option>
          {TIMESHEET_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </Select>
      </div>

      {error ? (
        <ErrorNote message={(error as ApiRequestError).displayMessage} />
      ) : (
        <DataTable
          columns={columns} rows={rows} getRowId={(t) => t.id} isLoading={isLoading}
          empty={
            <EmptyState
              icon={Clock}
              title={status || projectId ? 'No matching entries' : 'No time logged yet'}
              description={status || projectId ? 'Adjust your filters to see more.' : 'Log your first time entry to start tracking billable work.'}
              action={can(PERMISSIONS.TIMESHEET_CREATE) && !status && !projectId ? <Button icon={Plus} onClick={() => setLogging(true)}>Log time</Button> : undefined}
            />
          }
        />
      )}

      {logging && <LogTimeModal onClose={() => setLogging(false)} />}
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  const dot: Record<string, string> = { amber: 'bg-warning', green: 'bg-success', slate: 'bg-content-tertiary' };
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <p className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-content-tertiary">
        {tone && <span className={`h-1.5 w-1.5 rounded-full ${dot[tone] ?? 'bg-content-tertiary'}`} />}
        {label}
      </p>
      <p className="nums mt-1.5 text-2xl font-semibold text-content">{value}</p>
    </div>
  );
}

function LogTimeModal({ onClose }: { onClose: () => void }) {
  const create = useCreateTimesheet();
  const toast = useToast();
  const projects = useProjects({});
  const [err, setErr] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ projectId: '', workDate: today, hours: '', minutes: '', note: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const minutes = (Number(form.hours) || 0) * 60 + (Number(form.minutes) || 0);
    if (minutes < 1) { setErr('Enter a duration of at least 1 minute.'); return; }
    if (!form.projectId) { setErr('Select a project.'); return; }
    const input: CreateTimesheetInput = {
      projectId: form.projectId, workDate: form.workDate, minutes,
      note: form.note.trim() || undefined,
    };
    try { await create.mutateAsync(input); toast.success('Time logged', `${minutes} min`); onClose(); }
    catch (e2) { setErr(e2 instanceof ApiRequestError ? e2.displayMessage : 'Failed to log time'); }
  }

  return (
    <Modal open onClose={onClose} title="Log time" description="Record hours worked against a project.">
      <form onSubmit={onSubmit} className="space-y-3.5">
        <Select label="Project" value={form.projectId} onChange={set('projectId')} required>
          <option value="">Select project…</option>
          {projects.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input label="Date" type="date" value={form.workDate} onChange={set('workDate')} required />
          <Input label="Hours" type="number" min={0} max={24} value={form.hours} onChange={set('hours')} placeholder="0" />
          <Input label="Minutes" type="number" min={0} max={59} value={form.minutes} onChange={set('minutes')} placeholder="0" />
        </div>
        <Input label="Note" hint="Optional" value={form.note} onChange={set('note')} placeholder="What did you work on?" />
        {err && <ErrorNote message={err} />}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Log time</Button>
        </div>
      </form>
    </Modal>
  );
}
