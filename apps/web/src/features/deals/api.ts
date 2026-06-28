import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DealStage, CreateDealInput, UpdateDealInput } from '@pixel/shared';
import { api } from '../../lib/api.js';

export interface DealRow {
  id: string;
  clientId: string | null;
  title: string;
  stage: DealStage;
  valueInr: string | null;
  probability: number | null;
  ownerUserId: string;
  expectedClose: string | null;
  lostReason: string | null;
  createdAt: string;
  updatedAt: string;
  client: { displayName: string } | null;
  owner: { fullName: string };
}

interface Page<T> { data: T[]; nextCursor: string | null }

export function useDeals(params: { stage?: DealStage }) {
  const qs = new URLSearchParams();
  if (params.stage) qs.set('stage', params.stage);
  qs.set('limit', '100');
  return useQuery({ queryKey: ['deals', params], queryFn: () => api.get<Page<DealRow>>(`/deals?${qs}`) });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDealInput) => api.post<DealRow>('/deals', input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['deals'] }),
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDealInput }) => api.patch<DealRow>(`/deals/${id}`, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['deals'] }),
  });
}
