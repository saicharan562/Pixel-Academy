import { useQuery } from '@tanstack/react-query';
import type { InvoiceStatus } from '@pixel/shared';
import { api } from '../../lib/api.js';

export interface InvoiceRow {
  id: string;
  invoiceNo: string;
  clientId: string;
  projectId: string | null;
  issueDate: string;
  dueDate: string;
  placeOfSupply: string;
  supplyType: string;
  subtotalInr: string;
  cgstInr: string;
  sgstInr: string;
  igstInr: string;
  totalInr: string;
  status: InvoiceStatus;
  notes: string | null;
  client: { displayName: string; gstin: string | null; stateCode: string };
}

interface Page<T> { data: T[]; nextCursor: string | null }

export function useInvoices(params: { status?: InvoiceStatus; search?: string }) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useQuery({ queryKey: ['invoices', params], queryFn: () => api.get<Page<InvoiceRow>>(`/invoices${suffix}`) });
}
