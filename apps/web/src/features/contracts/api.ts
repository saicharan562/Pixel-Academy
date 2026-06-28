import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContractStatus, CreateContractInput, UpdateContractInput } from '@pixel/shared';
import { api } from '../../lib/api.js';

export interface ContractRow {
  id: string;
  clientId: string;
  projectId: string | null;
  title: string;
  documentId: string | null;
  valueInr: string | null;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
  client: { displayName: string };
}

interface Page<T> { data: T[]; nextCursor: string | null }

export function useContracts(params: { status?: ContractStatus }) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useQuery({ queryKey: ['contracts', params], queryFn: () => api.get<Page<ContractRow>>(`/contracts${suffix}`) });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContractInput) => api.post<ContractRow>('/contracts', input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['contracts'] }),
  });
}

export function useUpdateContract(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateContractInput) => api.patch<ContractRow>(`/contracts/${id}`, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['contracts'] }),
  });
}

export function useDeleteContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/contracts/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['contracts'] }),
  });
}
