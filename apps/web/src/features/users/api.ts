import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateUserInput, UpdateUserInput } from '@pixel/shared';
import { api } from '../../lib/api.js';

export interface UserRow {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  clientId: string | null;
  status: string;
  lastLoginAt: string | null;
  role: { name: string };
}

export interface RoleOption {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
}

interface Page<T> { data: T[]; nextCursor: string | null }

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: () => api.get<Page<UserRow>>('/users?limit=100') });
}

export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: () => api.get<RoleOption[]>('/roles') });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.post<UserRow>('/users', input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => api.patch<UserRow>(`/users/${id}`, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
