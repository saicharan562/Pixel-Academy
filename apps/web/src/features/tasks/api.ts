import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TaskStatus, Priority, CreateTaskInput, UpdateTaskInput } from '@pixel/shared';
import { api } from '../../lib/api.js';

export interface TaskRow {
  id: string;
  projectId: string;
  milestoneId: string | null;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  assigneeId: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  estimateMinutes: number | null;
  assignee: { fullName: string } | null;
  project: { name: string };
}

export interface TaskDetail extends TaskRow {
  subtasks: { id: string; title: string; status: TaskStatus }[];
  dependencies: { dependsOnTaskId: string; dependsOn: { title: string; status: TaskStatus } }[];
}

interface Page<T> { data: T[]; nextCursor: string | null }

export function useTasks(params: { projectId?: string; status?: TaskStatus; search?: string }) {
  const qs = new URLSearchParams();
  if (params.projectId) qs.set('projectId', params.projectId);
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useQuery({ queryKey: ['tasks', params], queryFn: () => api.get<Page<TaskRow>>(`/tasks${suffix}`) });
}

export function useTask(id: string | null) {
  return useQuery({ queryKey: ['task', id], queryFn: () => api.get<TaskDetail>(`/tasks/${id}`), enabled: !!id });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.post<TaskRow>('/tasks', input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

/**
 * Update a task with an optimistic cache write (status drags / inline edits feel
 * instant) that rolls back on error and reconciles with server truth on settle.
 */
export function useUpdateTask(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTaskInput) => api.patch<TaskRow>(`/tasks/${id}`, input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      await qc.cancelQueries({ queryKey: ['task', id] });
      const prevLists = qc.getQueriesData<Page<TaskRow>>({ queryKey: ['tasks'] });
      const prevDetail = qc.getQueryData<TaskDetail>(['task', id]);
      qc.setQueriesData<Page<TaskRow>>({ queryKey: ['tasks'] }, (old) =>
        old ? { ...old, data: old.data.map((t) => (t.id === id ? { ...t, ...input } as TaskRow : t)) } : old);
      if (prevDetail) qc.setQueryData<TaskDetail>(['task', id], { ...prevDetail, ...input } as TaskDetail);
      return { prevLists, prevDetail };
    },
    onError: (_e, _v, ctx) => {
      ctx?.prevLists?.forEach(([key, val]) => qc.setQueryData(key, val));
      if (ctx?.prevDetail) qc.setQueryData(['task', id], ctx.prevDetail);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      void qc.invalidateQueries({ queryKey: ['task', id] });
    },
  });
}

/** Optimistic status move for the Kanban board (keyed generically by id). */
export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => api.patch<TaskRow>(`/tasks/${id}`, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueriesData<Page<TaskRow>>({ queryKey: ['tasks'] });
      qc.setQueriesData<Page<TaskRow>>({ queryKey: ['tasks'] }, (old) =>
        old ? { ...old, data: old.data.map((t) => (t.id === id ? { ...t, status } : t)) } : old);
      return { prev };
    },
    onError: (_e, _v, ctx) => { ctx?.prev?.forEach(([key, val]) => qc.setQueryData(key, val)); },
    onSettled: () => { void qc.invalidateQueries({ queryKey: ['tasks'] }); },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/tasks/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
