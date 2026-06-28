import { useState, type FormEvent } from 'react';
import { Check, Plane, Plus, X } from 'lucide-react';
import { LEAVE_STATUS, PERMISSIONS, type LeaveStatus, type CreateLeaveRequestInput } from '@pixel/shared';
import { useAuth } from '../lib/auth.js';
import { ApiRequestError } from '../lib/api.js';
import { useToast } from '../components/ui/toast.js';
import { titleCase, formatDate } from '../lib/format.js';
import {
  Avatar, Badge, Button, DataTable, EmptyState, ErrorNote, Input, Modal, PageHeader,
  Select, type Column, type Tone,
} from '../components/ui.js';
import {
  useLeaveRequests, useLeaveTypes, useCreateLeaveRequest, useDecideLeaveRequest,
  type LeaveRequestRow,
} from '../features/leaves/api.js';

const statusTone: Record<string, Tone> = { pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'slate' };

export function LeavesPage() {
  const { can } = useAuth();
  const toast = useToast();
  const canApprove = can(PERMISSIONS.LEAVE_APPROVE);

  const [status, setStatus] = useState<LeaveStatus | ''>('');
  const [requesting, setRequesting] = useState(false);
  const { data, isLoading, error } = useLeaveRequests({ status: status || undefined });
  const decide = useDecideLeaveRequest();
  const rows = data?.data ?? [];

  function onDecide(id: string, decision: 'approved' | 'rejected') {
    decide.mutate({ id, decision }, {
      onSuccess: () => toast.success(decision === 'approved' ? 'Leave approved' : 'Leave rejected'),
      onError: (e) => toast.error('Action failed', e instanceof ApiRequestError ? e.message : undefined),
    });
  }

  const columns: Column<LeaveRequestRow>[] = [
    {
      key: 'user', header: 'Member', sortValue: (l) => l.user.fullName.toLowerCase(),
      render: (l) => <span className="inline-flex items-center gap-2"><Avatar name={l.user.fullName} size="sm" /><span className="text-content-secondary">{l.user.fullName}</span></span>,
    },
    { key: 'type', header: 'Type', collapse: true, render: (l) => <span className="text-content">{l.leaveType.name}{!l.leaveType.isPaid && <span className="ml-1.5 text-xs text-content-tertiary">(unpaid)</span>}</span> },
    { key: 'dates', header: 'Dates', render: (l) => <span className="text-content-secondary">{formatDate(l.startDate)} → {formatDate(l.endDate)}</span> },
    { key: 'days', header: 'Days', sortValue: (l) => Number(l.days), render: (l) => <span className="nums font-medium text-content">{l.days}</span> },
    { key: 'status', header: 'Status', sortValue: (l) => LEAVE_STATUS.indexOf(l.status), render: (l) => <Badge tone={statusTone[l.status] ?? 'slate'} dot>{titleCase(l.status)}</Badge> },
    {
      key: 'actions', header: '', render: (l) => (
        <div className="flex items-center justify-end gap-1.5">
          {l.status === 'pending' && canApprove && (
            <>
              <Button size="sm" variant="secondary" icon={Check} loading={decide.isPending} onClick={() => onDecide(l.id, 'approved')}>Approve</Button>
              <Button size="sm" variant="secondary" icon={X} loading={decide.isPending} onClick={() => onDecide(l.id, 'rejected')}>Reject</Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Leaves"
        subtitle="Requests, approvals and balances"
        action={can(PERMISSIONS.LEAVE_CREATE) && <Button icon={Plus} onClick={() => setRequesting(true)}>Request leave</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as LeaveStatus | '')} className="w-44">
          <option value="">All statuses</option>
          {LEAVE_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </Select>
      </div>
      {error ? (
        <ErrorNote message={(error as ApiRequestError).message} />
      ) : (
        <DataTable
          columns={columns} rows={rows} getRowId={(l) => l.id} isLoading={isLoading}
          empty={
            <EmptyState
              icon={Plane}
              title={status ? 'No matching requests' : 'No leave requests'}
              description={status ? 'Adjust your filter to see more.' : 'Submitted leave requests will appear here.'}
              action={can(PERMISSIONS.LEAVE_CREATE) && !status ? <Button icon={Plus} onClick={() => setRequesting(true)}>Request leave</Button> : undefined}
            />
          }
        />
      )}
      {requesting && <RequestLeaveModal onClose={() => setRequesting(false)} />}
    </div>
  );
}

function RequestLeaveModal({ onClose }: { onClose: () => void }) {
  const create = useCreateLeaveRequest();
  const toast = useToast();
  const types = useLeaveTypes();
  const [err, setErr] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ leaveTypeId: '', startDate: today, endDate: today, reason: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.leaveTypeId) { setErr('Select a leave type.'); return; }
    if (form.endDate < form.startDate) { setErr('End date must be on or after start date.'); return; }
    const input: CreateLeaveRequestInput = {
      leaveTypeId: form.leaveTypeId, startDate: form.startDate, endDate: form.endDate,
      reason: form.reason.trim() || undefined,
    };
    try { await create.mutateAsync(input); toast.success('Leave requested'); onClose(); }
    catch (e2) { setErr(e2 instanceof ApiRequestError ? e2.message : 'Failed to request leave'); }
  }

  return (
    <Modal open onClose={onClose} title="Request leave" description="Submit a leave request for approval.">
      <form onSubmit={onSubmit} className="space-y-3.5">
        <Select label="Leave type" value={form.leaveTypeId} onChange={set('leaveTypeId')} required>
          <option value="">Select type…</option>
          {types.data?.map((t) => <option key={t.id} value={t.id}>{t.name}{t.isPaid ? '' : ' (unpaid)'}</option>)}
        </Select>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Start date" type="date" value={form.startDate} onChange={set('startDate')} required />
          <Input label="End date" type="date" value={form.endDate} onChange={set('endDate')} required />
        </div>
        <Input label="Reason" hint="Optional" value={form.reason} onChange={set('reason')} placeholder="Reason for leave" />
        {err && <ErrorNote message={err} />}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Submit request</Button>
        </div>
      </form>
    </Modal>
  );
}
