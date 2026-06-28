import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LeaveStatus, CreateLeaveRequestInput } from '@pixel/shared';
import { api } from '../../lib/api.js';

export interface LeaveRequestRow {
  id: string;
  userId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: string;
  reason: string | null;
  status: LeaveStatus;
  approverId: string | null;
  decidedAt: string | null;
  createdAt: string;
  user: { fullName: string };
  leaveType: { name: string; isPaid: boolean };
}

export interface LeaveType {
  id: string;
  name: string;
  annualQuota: string;
  isPaid: boolean;
}

interface Page<T> { data: T[]; nextCursor: string | null }

export function useLeaveRequests(params: { status?: LeaveStatus }) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useQuery({ queryKey: ['leaves', 'requests', params], queryFn: () => api.get<Page<LeaveRequestRow>>(`/leaves/requests${suffix}`) });
}

export function useLeaveTypes() {
  return useQuery({ queryKey: ['leaves', 'types'], queryFn: () => api.get<LeaveType[]>('/leaves/types') });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeaveRequestInput) => api.post<LeaveRequestRow>('/leaves/requests', input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
}

export function useDecideLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'rejected' }) =>
      api.post<LeaveRequestRow>(`/leaves/requests/${id}/decision`, { decision }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
}

export function useCancelLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<LeaveRequestRow>(`/leaves/requests/${id}/cancel`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
}
