import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ProjectStatus, MilestoneStatus, CreateProjectInput, UpdateProjectInput, CreateMilestoneInput,
} from '@pixel/shared';
import { api } from '../../lib/api.js';

export interface ProjectRow {
  id: string;
  clientId: string;
  name: string;
  code: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  budgetInr: string | null;
  managerId: string;
  client: { displayName: string };
  manager: { fullName: string };
}

export interface MilestoneRow {
  id: string;
  projectId: string;
  name: string;
  dueDate: string | null;
  status: MilestoneStatus;
  orderIndex: number;
}

export interface ProjectDetail extends ProjectRow {
  members: { userId: string; roleInProject: string | null; user: { fullName: string } }[];
  milestones: MilestoneRow[];
}

interface Page<T> { data: T[]; nextCursor: string | null }

export function useProjects(params: { status?: ProjectStatus; search?: string }) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useQuery({ queryKey: ['projects', params], queryFn: () => api.get<Page<ProjectRow>>(`/projects${suffix}`) });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get<ProjectDetail>(`/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.post<ProjectRow>('/projects', input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProjectInput) => api.patch<ProjectRow>(`/projects/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] });
      void qc.invalidateQueries({ queryKey: ['project', id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/projects/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useAddMilestone(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMilestoneInput) => api.post<MilestoneRow>(`/projects/${projectId}/milestones`, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['project', projectId] }),
  });
}

export function useUpdateMilestone(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: MilestoneStatus }) =>
      api.patch<MilestoneRow>(`/projects/${projectId}/milestones/${vars.id}`, { status: vars.status }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['project', projectId] }),
  });
}

export function useDeleteMilestone(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) => api.del<void>(`/projects/${projectId}/milestones/${milestoneId}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['project', projectId] }),
  });
}
