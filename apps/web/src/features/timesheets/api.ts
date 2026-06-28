import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  TimesheetStatus, CreateTimesheetInput, UpdateTimesheetInput,
} from '@pixel/shared';
import { api } from '../../lib/api.js';

export interface TimesheetRow {
  id: string;
  userId: string;
  taskId: string | null;
  projectId: string | null;
  workDate: string;
  minutes: number;
  note: string | null;
  status: TimesheetStatus;
  createdAt: string;
  updatedAt: string;
  user: { fullName: string };
  project: { name: string } | null;
  task: { title: string } | null;
}

interface Page<T> { data: T[]; nextCursor: string | null }

export function useTimesheets(params: {
  status?: TimesheetStatus; projectId?: string; userId?: string; from?: string; to?: string;
}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.projectId) qs.set('projectId', params.projectId);
  if (params.userId) qs.set('userId', params.userId);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useQuery({ queryKey: ['timesheets', params], queryFn: () => api.get<Page<TimesheetRow>>(`/timesheets${suffix}`) });
}

export function useCreateTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTimesheetInput) => api.post<TimesheetRow>('/timesheets', input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['timesheets'] }),
  });
}

export function useUpdateTimesheet(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTimesheetInput) => api.patch<TimesheetRow>(`/timesheets/${id}`, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['timesheets'] }),
  });
}

export function useSubmitTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<TimesheetRow>(`/timesheets/${id}/submit`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['timesheets'] }),
  });
}

export function useDecideTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'rejected' }) =>
      api.post<TimesheetRow>(`/timesheets/${id}/decision`, { decision }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['timesheets'] }),
  });
}

export function useDeleteTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/timesheets/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['timesheets'] }),
  });
}
