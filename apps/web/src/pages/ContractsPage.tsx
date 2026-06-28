import { useState, type FormEvent } from 'react';
import { FileSignature, Plus, Trash2 } from 'lucide-react';
import { CONTRACT_STATUS, PERMISSIONS, type ContractStatus, type CreateContractInput, type UpdateContractInput } from '@pixel/shared';
import { useAuth } from '../lib/auth.js';
import { ApiRequestError } from '../lib/api.js';
import { useToast } from '../components/ui/toast.js';
import { titleCase, formatDate, formatINR } from '../lib/format.js';
import {
  Badge, Button, DataTable, EmptyState, ErrorNote, Input, Modal, PageHeader,
  Select, type Column, type Tone,
} from '../components/ui.js';
import {
  useContracts, useCreateContract, useUpdateContract, useDeleteContract, type ContractRow,
} from '../features/contracts/api.js';
import { useClientOptions } from '../features/lookups/api.js';

const statusTone: Record<ContractStatus, Tone> = {
  draft: 'slate', active: 'green', expiring: 'amber', expired: 'red', terminated: 'slate',
};

const DAY = 24 * 60 * 60 * 1000;
/** Days until end date; negative = past. */
function daysLeft(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / DAY);
}

export function ContractsPage() {
  const { can } = useAuth();
  const [status, setStatus] = useState<ContractStatus | ''>('');
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<ContractRow | null>(null);
  const { data, isLoading, error } = useContracts({ status: status || undefined });
  const rows = data?.data ?? [];

  const columns: Column<ContractRow>[] = [
    { key: 'title', header: 'Contract', sortValue: (c) => c.title.toLowerCase(), render: (c) => <span className="font-medium text-content">{c.title}</span> },
    { key: 'client', header: 'Client', collapse: true, render: (c) => <span className="text-content-secondary">{c.client.displayName}</span> },
    { key: 'value', header: 'Value', sortValue: (c) => Number(c.valueInr), render: (c) => <span className="nums text-content">{c.valueInr ? formatINR(c.valueInr) : '—'}</span> },
    { key: 'term', header: 'Term', render: (c) => <span className="text-content-secondary">{formatDate(c.startDate)} → {formatDate(c.endDate)}</span> },
    {
      key: 'ends', header: 'Ends in', sortValue: (c) => daysLeft(c.endDate),
      render: (c) => {
        if (['expired', 'terminated'].includes(c.status)) return <span className="text-content-tertiary">—</span>;
        const d = daysLeft(c.endDate);
        if (d < 0) return <Badge tone="red" dot>Overdue</Badge>;
        if (d <= 30) return <Badge tone="amber" dot>{d}d left</Badge>;
        return <span className="nums text-content-secondary">{d}d</span>;
      },
    },
    { key: 'autoRenew', header: 'Renew', collapse: true, render: (c) => c.autoRenew ? <Badge tone="blue">Auto</Badge> : <span className="text-content-tertiary">No</span> },
    { key: 'status', header: 'Status', sortValue: (c) => CONTRACT_STATUS.indexOf(c.status), render: (c) => <Badge tone={statusTone[c.status]} dot>{titleCase(c.status)}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle="Agreements, terms and renewals"
        action={can(PERMISSIONS.CONTRACT_CREATE) && <Button icon={Plus} onClick={() => setCreating(true)}>New contract</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as ContractStatus | '')} className="w-44">
          <option value="">All statuses</option>
          {CONTRACT_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </Select>
      </div>
      {error ? (
        <ErrorNote message={(error as ApiRequestError).displayMessage} />
      ) : (
        <DataTable
          columns={columns} rows={rows} getRowId={(c) => c.id} onRowClick={(c) => setSelected(c)} isLoading={isLoading}
          empty={
            <EmptyState
              icon={FileSignature}
              title={status ? 'No matching contracts' : 'No contracts yet'}
              description={status ? 'Adjust your filter to see more.' : 'Client agreements and their renewal dates will appear here.'}
              action={can(PERMISSIONS.CONTRACT_CREATE) && !status ? <Button icon={Plus} onClick={() => setCreating(true)}>New contract</Button> : undefined}
            />
          }
        />
      )}
      {creating && <CreateContractModal onClose={() => setCreating(false)} />}
      {selected && <EditContractModal contract={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CreateContractModal({ onClose }: { onClose: () => void }) {
  const create = useCreateContract();
  const toast = useToast();
  const clients = useClientOptions();
  const [err, setErr] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ clientId: '', title: '', valueInr: '', startDate: today, endDate: today, status: 'draft' as ContractStatus, autoRenew: false });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.clientId) { setErr('Select a client.'); return; }
    if (form.endDate < form.startDate) { setErr('End date must be on or after start date.'); return; }
    const input: CreateContractInput = {
      clientId: form.clientId, title: form.title, startDate: form.startDate, endDate: form.endDate,
      status: form.status, autoRenew: form.autoRenew,
      valueInr: form.valueInr ? Number(form.valueInr) : undefined,
    };
    try { await create.mutateAsync(input); toast.success('Contract created', form.title); onClose(); }
    catch (e2) { setErr(e2 instanceof ApiRequestError ? e2.displayMessage : 'Failed to create contract'); }
  }

  return (
    <Modal open onClose={onClose} title="New contract" description="Record a client agreement.">
      <form onSubmit={submit} className="space-y-3.5">
        <Select label="Client" value={form.clientId} onChange={set('clientId')} required>
          <option value="">Select client…</option>
          {clients.data?.data.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
        </Select>
        <Input label="Title" value={form.title} onChange={set('title')} required />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Value (₹)" hint="Optional" type="number" min={0} value={form.valueInr} onChange={set('valueInr')} placeholder="0" />
          <Select label="Status" value={form.status} onChange={set('status')}>
            {CONTRACT_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </Select>
          <Input label="Start date" type="date" value={form.startDate} onChange={set('startDate')} required />
          <Input label="End date" type="date" value={form.endDate} onChange={set('endDate')} required />
        </div>
        <label className="flex items-center gap-2 text-sm text-content-secondary">
          <input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm((f) => ({ ...f, autoRenew: e.target.checked }))} className="h-4 w-4 rounded border-line" />
          Auto-renew at end of term
        </label>
        {err && <ErrorNote message={err} />}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Create contract</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditContractModal({ contract, onClose }: { contract: ContractRow; onClose: () => void }) {
  const { can } = useAuth();
  const update = useUpdateContract(contract.id);
  const del = useDeleteContract();
  const toast = useToast();
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: contract.title, valueInr: contract.valueInr ?? '',
    startDate: contract.startDate.slice(0, 10), endDate: contract.endDate.slice(0, 10),
    status: contract.status, autoRenew: contract.autoRenew,
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (form.endDate < form.startDate) { setErr('End date must be on or after start date.'); return; }
    const input: UpdateContractInput = {
      title: form.title, startDate: form.startDate, endDate: form.endDate,
      status: form.status, autoRenew: form.autoRenew,
      valueInr: form.valueInr ? Number(form.valueInr) : null,
    };
    try { await update.mutateAsync(input); toast.success('Contract updated'); onClose(); }
    catch (e2) { setErr(e2 instanceof ApiRequestError ? e2.displayMessage : 'Failed to update contract'); }
  }
  async function onDelete() {
    if (!confirm('Delete this contract?')) return;
    try { await del.mutateAsync(contract.id); toast.success('Contract deleted'); onClose(); }
    catch (e) { toast.error('Delete failed', e instanceof ApiRequestError ? e.displayMessage : undefined); }
  }

  return (
    <Modal open onClose={onClose} title="Edit contract" description={contract.client.displayName}>
      <form onSubmit={submit} className="space-y-3.5">
        <Input label="Title" value={form.title} onChange={set('title')} required />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Value (₹)" hint="Optional" type="number" min={0} value={form.valueInr} onChange={set('valueInr')} placeholder="0" />
          <Select label="Status" value={form.status} onChange={set('status')}>
            {CONTRACT_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </Select>
          <Input label="Start date" type="date" value={form.startDate} onChange={set('startDate')} required />
          <Input label="End date" type="date" value={form.endDate} onChange={set('endDate')} required />
        </div>
        <label className="flex items-center gap-2 text-sm text-content-secondary">
          <input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm((f) => ({ ...f, autoRenew: e.target.checked }))} className="h-4 w-4 rounded border-line" />
          Auto-renew at end of term
        </label>
        {err && <ErrorNote message={err} />}
        <div className="flex items-center justify-between border-t border-line pt-4">
          {can(PERMISSIONS.CONTRACT_DELETE) ? (
            <Button type="button" variant="danger" icon={Trash2} loading={del.isPending} onClick={() => void onDelete()}>Delete</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={update.isPending}>Save changes</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
