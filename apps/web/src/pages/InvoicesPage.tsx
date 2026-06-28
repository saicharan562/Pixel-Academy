import { useMemo, useState, type FormEvent } from 'react';
import { Ban, CreditCard, Plus, ReceiptText, Send, Trash2 } from 'lucide-react';
import {
  INVOICE_STATUS, GST_RATES, PAYMENT_METHOD, PERMISSIONS,
  type InvoiceStatus, type CreateInvoiceInput, type RecordPaymentInput,
} from '@pixel/shared';
import { useAuth } from '../lib/auth.js';
import { ApiRequestError } from '../lib/api.js';
import { useToast } from '../components/ui/toast.js';
import { titleCase, formatDate, formatINR } from '../lib/format.js';
import {
  Badge, Button, DataTable, EmptyState, ErrorNote, Field, Input, Modal, PageHeader,
  Select, Sheet, SheetSection, Spinner, type Column, type Tone,
} from '../components/ui.js';
import {
  useInvoices, useInvoice, useCreateInvoice, useIssueInvoice, useVoidInvoice, useRecordPayment,
  type InvoiceRow,
} from '../features/invoices/api.js';
import { useClientOptions } from '../features/lookups/api.js';
import { useProjects } from '../features/projects/api.js';

const statusTone: Record<string, Tone> = {
  draft: 'slate', issued: 'blue', partially_paid: 'amber', paid: 'green', overdue: 'red', cancelled: 'slate',
};

type DraftLine = { description: string; hsnSac: string; quantity: string; unitPriceInr: string; gstRate: string };
const emptyLine = (): DraftLine => ({ description: '', hsnSac: '', quantity: '1', unitPriceInr: '', gstRate: '18' });

export function InvoicesPage() {
  const { can } = useAuth();
  const [status, setStatus] = useState<InvoiceStatus | ''>('');
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, error } = useInvoices({ status: status || undefined });
  const rows = data?.data ?? [];

  const totals = useMemo(() => {
    let billed = 0, outstanding = 0;
    for (const r of rows) {
      const total = Number(r.totalInr);
      billed += total;
      if (['issued', 'partially_paid', 'overdue'].includes(r.status)) outstanding += total;
    }
    return { billed, outstanding };
  }, [rows]);

  const columns: Column<InvoiceRow>[] = [
    { key: 'invoiceNo', header: 'Invoice', sortValue: (i) => i.invoiceNo, render: (i) => <span className="nums font-medium text-content">{i.invoiceNo}</span> },
    { key: 'client', header: 'Client', collapse: true, sortValue: (i) => i.client.displayName.toLowerCase(), render: (i) => <span className="text-content-secondary">{i.client.displayName}</span> },
    { key: 'issueDate', header: 'Issued', collapse: true, sortValue: (i) => i.issueDate, render: (i) => <span className="text-content-secondary">{formatDate(i.issueDate)}</span> },
    { key: 'dueDate', header: 'Due', collapse: true, sortValue: (i) => i.dueDate, render: (i) => <span className="text-content-secondary">{formatDate(i.dueDate)}</span> },
    { key: 'total', header: 'Total', sortValue: (i) => Number(i.totalInr), render: (i) => <span className="nums font-medium text-content">{formatINR(i.totalInr)}</span> },
    { key: 'status', header: 'Status', sortValue: (i) => INVOICE_STATUS.indexOf(i.status), render: (i) => <Badge tone={statusTone[i.status] ?? 'slate'} dot>{titleCase(i.status)}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="GST billing and payment ledger"
        action={can(PERMISSIONS.INVOICE_CREATE) && <Button icon={Plus} onClick={() => setCreating(true)}>New invoice</Button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-xl border border-line bg-surface-2 p-4">
          <p className="text-2xs font-medium uppercase tracking-wider text-content-tertiary">Billed (filtered)</p>
          <p className="nums mt-1.5 text-2xl font-semibold text-content">{formatINR(totals.billed)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface-2 p-4">
          <p className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-content-tertiary">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Outstanding
          </p>
          <p className="nums mt-1.5 text-2xl font-semibold text-content">{formatINR(totals.outstanding)}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus | '')} className="w-44">
          <option value="">All statuses</option>
          {INVOICE_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </Select>
      </div>

      {error ? (
        <ErrorNote message={(error as ApiRequestError).displayMessage} />
      ) : (
        <DataTable
          columns={columns} rows={rows} getRowId={(i) => i.id} onRowClick={(i) => setSelectedId(i.id)} isLoading={isLoading}
          empty={
            <EmptyState
              icon={ReceiptText}
              title={status ? 'No matching invoices' : 'No invoices yet'}
              description={status ? 'Adjust your filter to see more.' : 'Issued invoices and their payment status will appear here.'}
              action={can(PERMISSIONS.INVOICE_CREATE) && !status ? <Button icon={Plus} onClick={() => setCreating(true)}>New invoice</Button> : undefined}
            />
          }
        />
      )}

      {creating && <CreateInvoiceModal onClose={() => setCreating(false)} />}
      <InvoiceSheet id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateInvoiceModal({ onClose }: { onClose: () => void }) {
  const create = useCreateInvoice();
  const toast = useToast();
  const clients = useClientOptions();
  const projects = useProjects({});
  const [err, setErr] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ clientId: '', projectId: '', issueDate: today, dueDate: today, placeOfSupply: '37', notes: '' });
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setLine = (idx: number, k: keyof DraftLine) => (e: { target: { value: string } }) =>
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, [k]: e.target.value } : l)));

  const subtotal = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unitPriceInr) || 0), 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.clientId) { setErr('Select a client.'); return; }
    if (form.dueDate < form.issueDate) { setErr('Due date must be on or after issue date.'); return; }
    const input: CreateInvoiceInput = {
      clientId: form.clientId, projectId: form.projectId || undefined,
      issueDate: form.issueDate, dueDate: form.dueDate, placeOfSupply: form.placeOfSupply,
      notes: form.notes.trim() || undefined,
      lineItems: lines.map((l) => ({
        description: l.description, hsnSac: l.hsnSac,
        quantity: Number(l.quantity), unitPriceInr: Number(l.unitPriceInr), gstRate: Number(l.gstRate),
        discountInr: 0,
      })),
    };
    try { await create.mutateAsync(input); toast.success('Invoice drafted'); onClose(); }
    catch (e2) { setErr(e2 instanceof ApiRequestError ? e2.displayMessage : 'Failed to create invoice'); }
  }

  return (
    <Modal open onClose={onClose} title="New invoice" description="Draft a GST invoice with line items." size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Client" value={form.clientId} onChange={set('clientId')} required>
            <option value="">Select client…</option>
            {clients.data?.data.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </Select>
          <Select label="Project" hint="Optional" value={form.projectId} onChange={set('projectId')}>
            <option value="">No project</option>
            {projects.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Input label="Issue date" type="date" value={form.issueDate} onChange={set('issueDate')} required />
          <Input label="Due date" type="date" value={form.dueDate} onChange={set('dueDate')} required />
          <Input label="Place of supply" hint="2-digit GST state code" value={form.placeOfSupply} onChange={set('placeOfSupply')} required />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-2xs font-medium uppercase tracking-wide text-content-tertiary">Line items</span>
            <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => setLines((ls) => [...ls, emptyLine()])}>Add line</Button>
          </div>
          <div className="space-y-2">
            {lines.map((l, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 rounded-lg border border-line bg-surface-2 p-2.5">
                <div className="col-span-12 sm:col-span-4">
                  <Input aria-label="Description" placeholder="Description" value={l.description} onChange={setLine(idx, 'description')} required />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input aria-label="HSN/SAC" placeholder="HSN/SAC" value={l.hsnSac} onChange={setLine(idx, 'hsnSac')} required />
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <Input aria-label="Qty" type="number" min={0} placeholder="Qty" value={l.quantity} onChange={setLine(idx, 'quantity')} required />
                </div>
                <div className="col-span-5 sm:col-span-2">
                  <Input aria-label="Unit price" type="number" min={0} placeholder="Unit ₹" value={l.unitPriceInr} onChange={setLine(idx, 'unitPriceInr')} required />
                </div>
                <div className="col-span-8 sm:col-span-2">
                  <Select aria-label="GST rate" value={l.gstRate} onChange={setLine(idx, 'gstRate')}>
                    {GST_RATES.map((r) => <option key={r} value={r}>{r}% GST</option>)}
                  </Select>
                </div>
                <div className="col-span-4 flex items-center justify-end sm:col-span-1">
                  {lines.length > 1 && (
                    <Button type="button" size="sm" variant="danger" icon={Trash2} aria-label="Remove line" onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))} />
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-sm text-content-secondary">Subtotal: <span className="nums font-medium text-content">{formatINR(subtotal)}</span> (+ GST)</p>
        </div>

        <Input label="Notes" hint="Optional" value={form.notes} onChange={set('notes')} />
        {err && <ErrorNote message={err} />}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Save draft</Button>
        </div>
      </form>
    </Modal>
  );
}

function InvoiceSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { can } = useAuth();
  const toast = useToast();
  const { data, isLoading } = useInvoice(id);
  const issue = useIssueInvoice();
  const voidInv = useVoidInvoice();
  const [paying, setPaying] = useState(false);

  async function onIssue() {
    if (!id) return;
    try { await issue.mutateAsync(id); toast.success('Invoice issued'); }
    catch (e) { toast.error('Issue failed', e instanceof ApiRequestError ? e.displayMessage : undefined); }
  }
  async function onVoid() {
    if (!id || !confirm('Void this invoice?')) return;
    try { await voidInv.mutateAsync(id); toast.success('Invoice voided'); }
    catch (e) { toast.error('Void failed', e instanceof ApiRequestError ? e.displayMessage : undefined); }
  }

  return (
    <Sheet
      open={!!id} onClose={onClose}
      title={data?.invoiceNo ?? 'Invoice'} subtitle={data?.client.displayName}
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {data?.status === 'draft' && can(PERMISSIONS.INVOICE_EDIT) && (
              <Button size="sm" icon={Send} loading={issue.isPending} onClick={() => void onIssue()}>Issue</Button>
            )}
            {data && ['issued', 'partially_paid'].includes(data.status) && can(PERMISSIONS.INVOICE_PAY) && (
              <Button size="sm" variant="secondary" icon={CreditCard} onClick={() => setPaying(true)}>Record payment</Button>
            )}
            {data && !['paid', 'cancelled'].includes(data.status) && can(PERMISSIONS.INVOICE_EDIT) && (
              <Button size="sm" variant="danger" icon={Ban} loading={voidInv.isPending} onClick={() => void onVoid()}>Void</Button>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {isLoading || !data ? <Spinner /> : (
        <>
          <SheetSection title="Summary">
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="Status" value={<Badge tone={statusTone[data.status]} dot>{titleCase(data.status)}</Badge>} />
              <Field label="Place of supply" value={<span className="nums">{data.placeOfSupply}</span>} />
              <Field label="Issued" value={formatDate(data.issueDate)} />
              <Field label="Due" value={formatDate(data.dueDate)} />
              <Field label="Total" value={<span className="nums font-medium">{formatINR(data.totalInr)}</span>} />
              <Field label="Balance" value={<span className="nums font-medium">{formatINR(data.balanceInr)}</span>} />
            </div>
          </SheetSection>

          <SheetSection title={`Line items · ${data.lineItems.length}`}>
            <ul className="space-y-1.5">
              {data.lineItems.map((li) => (
                <li key={li.id} className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
                  <span className="text-content">{li.description} <span className="text-content-tertiary">× {li.quantity}</span></span>
                  <span className="nums text-content-secondary">{formatINR(li.taxableValueInr)} @ {li.gstRate}%</span>
                </li>
              ))}
            </ul>
          </SheetSection>

          <SheetSection title={`Payments · ${data.payments.length}`}>
            {data.payments.length === 0 ? (
              <p className="text-sm text-content-tertiary">No payments recorded yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
                    <span className="text-content">{formatDate(p.paidAt)} · {titleCase(p.method)}</span>
                    <span className="nums font-medium text-content">{formatINR(p.amountInr)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SheetSection>
        </>
      )}
      {paying && id && <RecordPaymentModal invoiceId={id} balanceInr={data?.balanceInr} onClose={() => setPaying(false)} />}
    </Sheet>
  );
}

function RecordPaymentModal({ invoiceId, balanceInr, onClose }: { invoiceId: string; balanceInr?: string; onClose: () => void }) {
  const record = useRecordPayment(invoiceId);
  const toast = useToast();
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ amountInr: balanceInr ?? '', method: 'upi' as RecordPaymentInput['method'], reference: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const amount = Number(form.amountInr);
    if (!(amount > 0)) { setErr('Enter an amount greater than zero.'); return; }
    const input: RecordPaymentInput = {
      amountInr: amount, paidAt: new Date().toISOString(), method: form.method,
      reference: form.reference.trim() || undefined,
    };
    try { await record.mutateAsync(input); toast.success('Payment recorded'); onClose(); }
    catch (e2) { setErr(e2 instanceof ApiRequestError ? e2.displayMessage : 'Failed to record payment'); }
  }

  return (
    <Modal open onClose={onClose} title="Record payment" description="Log a payment against this invoice.">
      <form onSubmit={submit} className="space-y-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Amount (₹)" type="number" min={1} value={form.amountInr} onChange={set('amountInr')} required />
          <Select label="Method" value={form.method} onChange={set('method')}>
            {PAYMENT_METHOD.map((m) => <option key={m} value={m}>{titleCase(m)}</option>)}
          </Select>
        </div>
        <Input label="Reference" hint="Optional" value={form.reference} onChange={set('reference')} placeholder="UTR / transaction ID" />
        {err && <ErrorNote message={err} />}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={record.isPending}>Record payment</Button>
        </div>
      </form>
    </Modal>
  );
}
