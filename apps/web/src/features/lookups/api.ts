import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

interface Page<T> { data: T[]; nextCursor: string | null }

export interface UserOption {
  id: string;
  fullName: string;
  email: string;
  role: { name: string };
}

export interface ClientOption {
  id: string;
  displayName: string;
}

/** Internal users (for manager/assignee pickers). Requires user.view capability. */
export function useUserOptions() {
  return useQuery({
    queryKey: ['lookup', 'users'],
    queryFn: () => api.get<Page<UserOption>>('/users?limit=100'),
    staleTime: 60_000,
  });
}

/** Clients (for project/invoice pickers). Requires client.view capability. */
export function useClientOptions() {
  return useQuery({
    queryKey: ['lookup', 'clients'],
    queryFn: () => api.get<Page<ClientOption>>('/clients?limit=100'),
    staleTime: 60_000,
  });
}
