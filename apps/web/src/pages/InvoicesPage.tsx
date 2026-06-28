import { useMemo, useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { INVOICE_STATUS, type InvoiceStatus } from '@pixel/shared';
import { titleCase, formatDate, formatINR } from '../lib/format.js';
import {
  Badge, DataTable, EmptyState, ErrorNote, PageHeader, Select, type Column, type Tone,
} from '../components/ui.js';
import { ApiRequestError } from '../lib/api.js';
import { useInvoices, type InvoiceRow } from '../features/invoices/api.js';

const statusTone: Record<string, Tone> = {
  draft: 'slate', issued: 'blue', partially_paid: 'amber', paid: 'green', overdue: 'red', cancelled: 'slate',
};

export function InvoicesPage() {
  const [status, setStatus] = useState<InvoiceStatus | ''>('');
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
      <PageHeader title="Invoices" subtitle="GST billing and payment ledger" />

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
        <ErrorNote message={(error as ApiRequestError).message} />
      ) : (
        <DataTable
          columns={columns} rows={rows} getRowId={(i) => i.id} isLoading={isLoading}
          empty={
            <EmptyState
              icon={ReceiptText}
              title={status ? 'No matching invoices' : 'No invoices yet'}
              description={status ? 'Adjust your filter to see more.' : 'Issued invoices and their payment status will appear here.'}
            />
          }
        />
      )}
    </div>
  );
}
