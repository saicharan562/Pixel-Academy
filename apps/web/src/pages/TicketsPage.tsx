import { useState, type FormEvent } from 'react';
import { LifeBuoy, Pencil, Plus, Send } from 'lucide-react';
import {
  TICKET_STATUS, TICKET_TRANSITIONS, PRIORITY, PERMISSIONS,
  type TicketStatus, type Priority, type CreateTicketInput, type UpdateTicketInput,
} from '@pixel/shared';
import { useAuth } from '../lib/auth.js';
import { ApiRequestError } from '../lib/api.js';
import { useToast } from '../components/ui/toast.js';
import { titleCase, formatDate } from '../lib/format.js';
import {
  Avatar, Badge, Button, DataTable, EmptyState, ErrorNote, Field, Input, Modal, PageHeader,
  Select, Sheet, SheetSection, Spinner, type Column, type Tone,
} from '../components/ui.js';
import {
  useTickets, useTicket, useCreateTicket, useUpdateTicket, useTransitionTicket, useAddTicketComment,
  type TicketRow, type TicketDetail,
} from '../features/tickets/api.js';
import { useClientOptions, useUserOptions } from '../features/lookups/api.js';

const statusTone: Record<TicketStatus, Tone> = {
  open: 'blue', in_progress: 'amber', waiting_client: 'slate', resolved: 'green', closed: 'slate', escalated: 'red',
};
const prioTone: Record<Priority, Tone> = { low: 'slate', medium: 'blue', high: 'amber', urgent: 'red' };
const openStatuses: TicketStatus[] = ['open', 'in_progress', 'waiting_client', 'escalated'];

/** SLA badge: breached (past due + still open) / due soon (<4h) / on track. */
function SlaCell({ t }: { t: TicketRow }) {
  if (!t.resolutionDueAt || !openStatuses.includes(t.status)) return <span className="text-content-tertiary">—</span>;
  const due = new Date(t.resolutionDueAt).getTime();
  const now = Date.now();
  if (due < now) return <Badge tone="red" dot>Breached</Badge>;
  if (due - now < 4 * 60 * 60 * 1000) return <Badge tone="amber" dot>Due soon</Badge>;
  return <Badge tone="green" dot>On track</Badge>;
}

export function TicketsPage() {
  const { can } = useAuth();
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error } = useTickets({ status: status || undefined, priority: priority || undefined });
  const rows = data?.data ?? [];

  const columns: Column<TicketRow>[] = [
    { key: 'ticketNo', header: 'Ticket', sortValue: (t) => t.ticketNo, render: (t) => <span className="nums font-medium text-content">{t.ticketNo}</span> },
    { key: 'subject', header: 'Subject', sortValue: (t) => t.subject.toLowerCase(), render: (t) => <span className="text-content">{t.subject}</span> },
    { key: 'client', header: 'Client', collapse: true, render: (t) => <span className="text-content-secondary">{t.client.displayName}</span> },
    {
      key: 'assignee', header: 'Assignee', collapse: true,
      render: (t) => t.assignee ? <span className="inline-flex items-center gap-2"><Avatar name={t.assignee.fullName} size="sm" /><span className="text-content-secondary">{t.assignee.fullName}</span></span> : <span className="text-content-tertiary">Unassigned</span>,
    },
    { key: 'priority', header: 'Priority', sortValue: (t) => PRIORITY.indexOf(t.priority), render: (t) => <Badge tone={prioTone[t.priority]}>{t.priority}</Badge> },
    { key: 'sla', header: 'SLA', render: (t) => <SlaCell t={t} /> },
    { key: 'status', header: 'Status', sortValue: (t) => TICKET_STATUS.indexOf(t.status), render: (t) => <Badge tone={statusTone[t.status]} dot>{titleCase(t.status)}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title="Tickets"
        subtitle="Support requests, SLA tracking and resolution flow"
        action={can(PERMISSIONS.TICKET_CREATE) && <Button icon={Plus} onClick={() => setCreating(true)}>New ticket</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as TicketStatus | '')} className="w-44">
          <option value="">All statuses</option>
          {TICKET_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </Select>
        <Select aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority | '')} className="w-40">
          <option value="">All priorities</option>
          {PRIORITY.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
        </Select>
      </div>
      {error ? (
        <ErrorNote message={(error as ApiRequestError).displayMessage} />
      ) : (
        <DataTable
          columns={columns} rows={rows} getRowId={(t) => t.id} onRowClick={(t) => setSelectedId(t.id)} isLoading={isLoading}
          empty={
            <EmptyState
              icon={LifeBuoy}
              title={status || priority ? 'No matching tickets' : 'No tickets yet'}
              description={status || priority ? 'Adjust your filters to see more.' : 'Support requests will appear here.'}
              action={can(PERMISSIONS.TICKET_CREATE) && !status && !priority ? <Button icon={Plus} onClick={() => setCreating(true)}>New ticket</Button> : undefined}
            />
          }
        />
      )}
      {creating && <CreateTicketModal onClose={() => setCreating(false)} />}
      <TicketSheet id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const create = useCreateTicket();
  const toast = useToast();
  const clients = useClientOptions();
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ clientId: '', subject: '', priority: 'medium' as Priority, description: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.clientId) { setErr('Select a client.'); return; }
    const input: CreateTicketInput = {
      clientId: form.clientId, subject: form.subject, priority: form.priority,
      description: form.description.trim() || undefined,
    };
    try { await create.mutateAsync(input); toast.success('Ticket created', form.subject); onClose(); }
    catch (e2) { setErr(e2 instanceof ApiRequestError ? e2.displayMessage : 'Failed to create ticket'); }
  }

  return (
    <Modal open onClose={onClose} title="New ticket" description="Raise a support request for a client.">
      <form onSubmit={submit} className="space-y-3.5">
        <Select label="Client" value={form.clientId} onChange={set('clientId')} required>
          <option value="">Select client…</option>
          {clients.data?.data.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
        </Select>
        <Input label="Subject" value={form.subject} onChange={set('subject')} required />
        <Select label="Priority" value={form.priority} onChange={set('priority')}>
          {PRIORITY.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
        </Select>
        <Input label="Description" hint="Optional" value={form.description} onChange={set('description')} placeholder="What does the client need?" />
        {err && <ErrorNote message={err} />}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Create ticket</Button>
        </div>
      </form>
    </Modal>
  );
}

function TicketSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { can } = useAuth();
  const toast = useToast();
  const { data, isLoading } = useTicket(id);
  const transition = useTransitionTicket(id ?? '');
  const addComment = useAddTicketComment(id ?? '');
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);

  function changeStatus(status: TicketStatus) {
    transition.mutate({ status }, {
      onSuccess: () => toast.success('Status updated', titleCase(status)),
      onError: (e) => toast.error('Update failed', e instanceof ApiRequestError ? e.displayMessage : undefined),
    });
  }
  async function postComment(e: FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    try { await addComment.mutateAsync(comment.trim()); setComment(''); }
    catch (e2) { toast.error('Comment failed', e2 instanceof ApiRequestError ? e2.displayMessage : undefined); }
  }

  const nextStatuses = data ? (TICKET_TRANSITIONS[data.status] ?? []) as TicketStatus[] : [];

  return (
    <Sheet
      open={!!id} onClose={onClose}
      title={data?.subject ?? 'Ticket'} subtitle={data ? `${data.ticketNo} · ${data.client.displayName}` : undefined}
      footer={
        <div className="flex items-center justify-between">
          {can(PERMISSIONS.TICKET_EDIT) ? <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button> : <span />}
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {isLoading || !data ? <Spinner /> : (
        <>
          <SheetSection title="Details">
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="Priority" value={<Badge tone={prioTone[data.priority]}>{data.priority}</Badge>} />
              <Field label="Status" value={<Badge tone={statusTone[data.status]} dot>{titleCase(data.status)}</Badge>} />
              <Field label="Assignee" value={data.assignee?.fullName ?? 'Unassigned'} />
              <Field label="Resolution due" value={data.resolutionDueAt ? formatDate(data.resolutionDueAt) : '—'} />
            </div>
            {can(PERMISSIONS.TICKET_EDIT) && nextStatuses.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {nextStatuses.map((s) => (
                  <Button key={s} size="sm" variant="secondary" loading={transition.isPending} onClick={() => changeStatus(s)}>
                    {titleCase(s)}
                  </Button>
                ))}
              </div>
            )}
          </SheetSection>

          <SheetSection title={`Activity · ${data.events.length}`}>
            <ul className="space-y-2.5">
              {data.events.map((ev) => (
                <li key={ev.id} className="rounded-lg border border-line bg-surface-2 px-3 py-2">
                  <div className="flex items-center justify-between text-xs text-content-tertiary">
                    <span className="font-medium text-content-secondary">{ev.actor?.fullName ?? 'System'} · {titleCase(ev.type)}</span>
                    <span>{formatDate(ev.createdAt)}</span>
                  </div>
                  {typeof ev.payload?.body === 'string' && <p className="mt-1 text-sm text-content">{ev.payload.body}</p>}
                </li>
              ))}
              {data.events.length === 0 && <li className="text-sm text-content-tertiary">No activity yet.</li>}
            </ul>
            <form onSubmit={postComment} className="mt-3 flex items-center gap-2">
              <Input aria-label="Add comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" className="flex-1" />
              <Button type="submit" size="sm" icon={Send} loading={addComment.isPending} aria-label="Post comment" />
            </form>
          </SheetSection>
        </>
      )}
      {editing && data && <EditTicketModal ticket={data} onClose={() => setEditing(false)} />}
    </Sheet>
  );
}

function EditTicketModal({ ticket, onClose }: { ticket: TicketDetail; onClose: () => void }) {
  const upd = useUpdateTicket(ticket.id);
  const toast = useToast();
  const users = useUserOptions();
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: ticket.subject, priority: ticket.priority, assigneeId: ticket.assigneeId ?? '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const input: UpdateTicketInput = { subject: form.subject, priority: form.priority, assigneeId: form.assigneeId || null };
    try { await upd.mutateAsync(input); toast.success('Ticket updated'); onClose(); }
    catch (e2) { setErr(e2 instanceof ApiRequestError ? e2.displayMessage : 'Failed to update ticket'); }
  }

  return (
    <Modal open onClose={onClose} title="Edit ticket" description="Update the ticket details.">
      <form onSubmit={submit} className="space-y-3.5">
        <Input label="Subject" value={form.subject} onChange={set('subject')} required />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Priority" value={form.priority} onChange={set('priority')}>
            {PRIORITY.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
          </Select>
          <Select label="Assignee" hint="Optional" value={form.assigneeId} onChange={set('assigneeId')}>
            <option value="">Unassigned</option>
            {users.data?.data.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </Select>
        </div>
        {err && <ErrorNote message={err} />}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={upd.isPending}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}
