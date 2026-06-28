import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BillingAddress,
  ClientStatus,
  CreateClientInput,
  UpdateClientInput,
  CreateContactInput,
} from '@pixel/shared';
import { api } from '../../lib/api.js';

export interface ClientRow {
  id: string;
  legalName: string;
  displayName: string;
  gstin: string | null;
  stateCode: string;
  billingAddress: BillingAddress;
  email: string | null;
  phone: string | null;
  ownerUserId: string | null;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContactRow {
  id: string;
  clientId: string;
  name: string;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

export interface ClientDetail extends ClientRow {
  contacts: ContactRow[];
}

interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

export function useClients(params: { status?: ClientStatus; search?: string }) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => api.get<Page<ClientRow>>(`/clients${suffix}`),
  });
}

export function useClient(id: string | null) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: () => api.get<ClientDetail>(`/clients/${id}`),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) => api.post<ClientRow>('/clients', input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useUpdateClient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateClientInput) => api.patch<ClientRow>(`/clients/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clients'] });
      void qc.invalidateQueries({ queryKey: ['client', id] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/clients/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useAddContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContactInput) => api.post<ContactRow>(`/clients/${clientId}/contacts`, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['client', clientId] }),
  });
}

export function useDeleteContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => api.del<void>(`/clients/${clientId}/contacts/${contactId}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['client', clientId] }),
  });
}
