import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  InvoiceStatus, PaymentMethod, CreateInvoiceInput, UpdateInvoiceInput, RecordPaymentInput,
} from '@pixel/shared';
import { api } from '../../lib/api.js';

export interface InvoiceLineItemRow {
  id: string;
  description: string;
  hsnSac: string;
  quantity: string;
  unitPriceInr: string;
  taxableValueInr: string;
  gstRate: string;
  cgstInr: string;
  sgstInr: string;
  igstInr: string;
}

export interface PaymentRow {
  id: string;
  amountInr: string;
  paidAt: string;
  method: PaymentMethod;
  reference: string | null;
}

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

export interface InvoiceDetail extends InvoiceRow {
  lineItems: InvoiceLineItemRow[];
  payments: PaymentRow[];
  paidInr: string;
  balanceInr: string;
}

interface Page<T> { data: T[]; nextCursor: string | null }

export function useInvoices(params: { status?: InvoiceStatus; search?: string }) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useQuery({ queryKey: ['invoices', params], queryFn: () => api.get<Page<InvoiceRow>>(`/invoices${suffix}`) });
}

export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get<InvoiceDetail>(`/invoices/${id}`),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => api.post<InvoiceRow>('/invoices', input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useUpdateInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInvoiceInput) => api.patch<InvoiceRow>(`/invoices/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] });
      void qc.invalidateQueries({ queryKey: ['invoice', id] });
    },
  });
}

export function useIssueInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<InvoiceRow>(`/invoices/${id}/issue`),
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: ['invoices'] });
      void qc.invalidateQueries({ queryKey: ['invoice', id] });
    },
  });
}

export function useVoidInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<InvoiceRow>(`/invoices/${id}/void`),
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: ['invoices'] });
      void qc.invalidateQueries({ queryKey: ['invoice', id] });
    },
  });
}

export function useRecordPayment(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordPaymentInput) => api.post<PaymentRow>(`/invoices/${invoiceId}/payments`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] });
      void qc.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
  });
}
