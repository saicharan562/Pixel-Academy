import { useMemo, useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, Receipt, RotateCcw, Trash2, X } from 'lucide-react';
import { EXPENSE_STATUS, PERMISSIONS, type ExpenseStatus, type CreateExpenseInput } from '@pixel/shared';
import { useAuth } from '../lib/auth.js';
import { ApiRequestError } from '../lib/api.js';
import { useToast } from '../components/ui/toast.js';
import { titleCase, formatDate, formatINR } from '../lib/format.js';
import {
  Avatar, Badge, Button, DataTable, EmptyState, ErrorNote, Input, Modal, PageHeader,
  Select, type Column, type Tone,
} from '../components/ui.js';
import {
  useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useDecideExpense, type ExpenseRow,
} from '../features/expenses/api.js';
import { useProjects } from '../features/projects/api.js';

const statusTone: Record<ExpenseStatus, Tone> = {
  submitted: 'amber', approved: 'green', rejected: 'red', reimbursed: 'blue',
};

export function ExpensesPage() {
  const { can } = useAuth();
  const toast = useToast();
  const canApprove = can(PERMISSIONS.EXPENSE_APPROVE);

  const [status, setStatus] = useState<ExpenseStatus | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const { data, isLoading, error } = useExpenses({ status: status || undefined });
  const decide = useDecideExpense();
  const del = useDeleteExpense();
  const rows = data?.data ?? [];

  function onDelete(id: string) {
    if (!confirm('Delete this expense?')) return;
    del.mutate(id, {
      onSuccess: () => toast.success('Expense deleted'),
      onError: (e) => toast.error('Delete failed', e instanceof ApiRequestError ? e.displayMessage : undefined),
    });
  }

  const totals = useMemo(() => {
    let submitted = 0, approved = 0, reimbursed = 0;
    for (const r of rows) {
      const amt = Number(r.amountInr);
      if (r.status === 'submitted') submitted += amt;
      if (r.status === 'approved') approved += amt;
      if (r.status === 'reimbursed') reimbursed += amt;
    }
    return { submitted, approved, reimbursed };
  }, [rows]);

  function onDecide(id: string, decision: 'approved' | 'rejected' | 'reimbursed') {
    decide.mutate({ id, decision }, {
      onSuccess: () => toast.success(`Expense ${decision}`),
      onError: (e) => toast.error('Action failed', e instanceof ApiRequestError ? e.displayMessage : undefined),
    });
  }

  const columns: Column<ExpenseRow>[] = [
    { key: 'spentOn', header: 'Date', sortValue: (x) => x.spentOn, render: (x) => <span className="text-content-secondary">{formatDate(x.spentOn)}</span> },
    { key: 'user', header: 'Member', collapse: true, render: (x) => <span className="inline-flex items-center gap-2"><Avatar name={x.user.fullName} size="sm" /><span className="text-content-secondary">{x.user.fullName}</span></span> },
    { key: 'category', header: 'Category', render: (x) => <span className="text-content">{x.category}</span> },
    { key: 'project', header: 'Project', collapse: true, render: (x) => <span className="text-content-secondary">{x.project?.name ?? '—'}</span> },
    { key: 'amount', header: 'Amount', sortValue: (x) => Number(x.amountInr), render: (x) => <span className="nums font-medium text-content">{formatINR(x.amountInr)}</span> },
    { key: 'status', header: 'Status', sortValue: (x) => EXPENSE_STATUS.indexOf(x.status), render: (x) => <Badge tone={statusTone[x.status]} dot>{titleCase(x.status)}</Badge> },
    {
      key: 'actions', header: '', render: (x) => (
        <div className="flex items-center justify-end gap-1.5">
          {x.status === 'submitted' && can(PERMISSIONS.EXPENSE_EDIT) && (
            <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(x)} aria-label="Edit expense" />
          )}
          {x.status === 'submitted' && canApprove && (
            <>
              <Button size="sm" variant="secondary" icon={Check} loading={decide.isPending} onClick={() => onDecide(x.id, 'approved')}>Approve</Button>
              <Button size="sm" variant="secondary" icon={X} loading={decide.isPending} onClick={() => onDecide(x.id, 'rejected')}>Reject</Button>
            </>
          )}
          {x.status === 'approved' && canApprove && (
            <Button size="sm" variant="secondary" icon={RotateCcw} loading={decide.isPending} onClick={() => onDecide(x.id, 'reimbursed')}>Reimburse</Button>
          )}
          {x.status === 'submitted' && can(PERMISSIONS.EXPENSE_DELETE) && (
            <Button size="sm" variant="danger" icon={Trash2} loading={del.isPending} onClick={() => onDelete(x.id)} aria-label="Delete expense" />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Submit, approve and reimburse team spend"
        action={can(PERMISSIONS.EXPENSE_CREATE) && <Button icon={Plus} onClick={() => setSubmitting(true)}>Submit expense</Button>}
      />

      <div className="mb-5 grid grid-cols-3 gap-3 sm:max-w-xl">
        <Tile label="Pending" value={formatINR(totals.submitted)} tone="amber" />
        <Tile label="Approved" value={formatINR(totals.approved)} tone="green" />
        <Tile label="Reimbursed" value={formatINR(totals.reimbursed)} tone="blue" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as ExpenseStatus | '')} className="w-44">
          <option value="">All statuses</option>
          {EXPENSE_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </Select>
      </div>

      {error ? (
        <ErrorNote message={(error as ApiRequestError).displayMessage} />
      ) : (
        <DataTable
          columns={columns} rows={rows} getRowId={(x) => x.id} isLoading={isLoading}
          empty={
            <EmptyState
              icon={Receipt}
              title={status ? 'No matching expenses' : 'No expenses yet'}
              description={status ? 'Adjust your filter to see more.' : 'Submitted expenses will appear here for approval.'}
              action={can(PERMISSIONS.EXPENSE_CREATE) && !status ? <Button icon={Plus} onClick={() => setSubmitting(true)}>Submit expense</Button> : undefined}
            />
          }
        />
      )}

      {submitting && <SubmitExpenseModal onClose={() => setSubmitting(false)} />}
      {editing && <SubmitExpenseModal expense={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const dot: Record<string, string> = { amber: 'bg-warning', green: 'bg-success', blue: 'bg-info' };
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <p className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-content-tertiary">
        <span className={`h-1.5 w-1.5 rounded-full ${dot[tone]}`} />{label}
      </p>
      <p className="nums mt-1.5 text-xl font-semibold text-content">{value}</p>
    </div>
  );
}

function SubmitExpenseModal({ expense, onClose }: { expense?: ExpenseRow; onClose: () => void }) {
  const create = useCreateExpense();
  const update = useUpdateExpense(expense?.id ?? '');
  const toast = useToast();
  const projects = useProjects({});
  const [err, setErr] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    category: expense?.category ?? '', amountInr: expense?.amountInr ?? '',
    projectId: expense?.projectId ?? '', spentOn: expense?.spentOn.slice(0, 10) ?? today,
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const pending = expense ? update.isPending : create.isPending;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const amount = Number(form.amountInr);
    if (!(amount > 0)) { setErr('Enter an amount greater than zero.'); return; }
    try {
      if (expense) {
        await update.mutateAsync({ category: form.category, amountInr: amount, spentOn: form.spentOn, projectId: form.projectId || undefined });
        toast.success('Expense updated');
      } else {
        const input: CreateExpenseInput = { category: form.category, amountInr: amount, spentOn: form.spentOn, projectId: form.projectId || undefined };
        await create.mutateAsync(input);
        toast.success('Expense submitted');
      }
      onClose();
    } catch (e2) { setErr(e2 instanceof ApiRequestError ? e2.displayMessage : 'Failed to save expense'); }
  }

  return (
    <Modal open onClose={onClose} title={expense ? 'Edit expense' : 'Submit expense'} description="Record a business expense for approval.">
      <form onSubmit={submit} className="space-y-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Category" value={form.category} onChange={set('category')} placeholder="Travel, software…" required />
          <Input label="Amount (₹)" type="number" min={1} value={form.amountInr} onChange={set('amountInr')} placeholder="0" required />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Project" hint="Optional" value={form.projectId} onChange={set('projectId')}>
            <option value="">No project</option>
            {projects.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Input label="Spent on" type="date" value={form.spentOn} onChange={set('spentOn')} required />
        </div>
        {err && <ErrorNote message={err} />}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={pending}>{expense ? 'Save changes' : 'Submit'}</Button>
        </div>
      </form>
    </Modal>
  );
}
