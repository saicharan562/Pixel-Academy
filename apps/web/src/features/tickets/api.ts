import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  TicketStatus, TicketEventType, Priority, CreateTicketInput, TicketTransitionInput,
} from '@pixel/shared';
import { api } from '../../lib/api.js';

export interface TicketRow {
  id: string;
  ticketNo: string;
  clientId: string;
  createdBy: string;
  assigneeId: string | null;
  subject: string;
  priority: Priority;
  slaPolicyId: string | null;
  status: TicketStatus;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: { displayName: string };
  assignee: { fullName: string } | null;
}

export interface TicketEvent {
  id: string;
  ticketId: string;
  actorId: string | null;
  type: TicketEventType;
  payload: Record<string, unknown> | null;
  createdAt: string;
  actor: { fullName: string } | null;
}

export interface TicketDetail extends TicketRow {
  events: TicketEvent[];
}

interface Page<T> { data: T[]; nextCursor: string | null }

export function useTickets(params: { status?: TicketStatus; priority?: Priority }) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.priority) qs.set('priority', params.priority);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useQuery({ queryKey: ['tickets', params], queryFn: () => api.get<Page<TicketRow>>(`/tickets${suffix}`) });
}

export function useTicket(id: string | null) {
  return useQuery({ queryKey: ['ticket', id], queryFn: () => api.get<TicketDetail>(`/tickets/${id}`), enabled: !!id });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => api.post<TicketRow>('/tickets', input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useTransitionTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TicketTransitionInput) => api.post<TicketRow>(`/tickets/${id}/transition`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tickets'] });
      void qc.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });
}

export function useAddTicketComment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.post<TicketEvent>(`/tickets/${id}/comments`, { body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['ticket', id] }),
  });
}
