import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExpenseStatus, CreateExpenseInput } from '@pixel/shared';
import { api } from '../../lib/api.js';

export interface ExpenseRow {
  id: string;
  userId: string;
  projectId: string | null;
  category: string;
  amountInr: string;
  spentOn: string;
  receiptDocId: string | null;
  status: ExpenseStatus;
  approverId: string | null;
  createdAt: string;
  updatedAt: string;
  user: { fullName: string };
  project: { name: string } | null;
}

interface Page<T> { data: T[]; nextCursor: string | null }

export function useExpenses(params: { status?: ExpenseStatus; projectId?: string }) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.projectId) qs.set('projectId', params.projectId);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useQuery({ queryKey: ['expenses', params], queryFn: () => api.get<Page<ExpenseRow>>(`/expenses${suffix}`) });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => api.post<ExpenseRow>('/expenses', input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDecideExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'rejected' | 'reimbursed' }) =>
      api.post<ExpenseRow>(`/expenses/${id}/decision`, { decision }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
