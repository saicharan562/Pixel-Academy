import { useQuery } from '@tanstack/react-query';
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

interface Page<T> { data: T[]; nextCursor: string | null }

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: () => api.get<Page<UserRow>>('/users?limit=100') });
}
