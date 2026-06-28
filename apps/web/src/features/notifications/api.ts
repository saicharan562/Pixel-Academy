import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  channel: string;
  readAt: string | null;
  createdAt: string;
}

interface Page<T> { data: T[]; nextCursor: string | null }

export function useNotifications(params: { unreadOnly?: boolean }) {
  const qs = new URLSearchParams();
  if (params.unreadOnly) qs.set('unreadOnly', 'true');
  const suffix = qs.toString() ? `?${qs}` : '';
  return useQuery({ queryKey: ['notifications', params], queryFn: () => api.get<Page<NotificationRow>>(`/notifications${suffix}`) });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<NotificationRow>(`/notifications/${id}/read`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ count: number }>('/notifications/read-all'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

/** Map a notification's entity to an in-app route, when one exists. */
export function entityPath(entityType: string | null): string | null {
  switch (entityType) {
    case 'ticket': return '/tickets';
    case 'task': return '/tasks';
    case 'deal': return '/deals';
    case 'invoice': return '/invoices';
    case 'expense': return '/expenses';
    case 'leave_request': return '/leaves';
    case 'contract': return '/contracts';
    case 'project': return '/projects';
    default: return null;
  }
}
