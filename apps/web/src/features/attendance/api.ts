import { useQuery } from '@tanstack/react-query';
import type { AttendanceStatus } from '@pixel/shared';
import { api } from '../../lib/api.js';

export interface AttendanceRow {
  id: string;
  userId: string;
  workDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedMinutes: number | null;
  status: AttendanceStatus | null;
  source: string | null;
  user: { fullName: string };
}

interface Page<T> { data: T[]; nextCursor: string | null }

export function useAttendance(params: { status?: AttendanceStatus; from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useQuery({ queryKey: ['attendance', params], queryFn: () => api.get<Page<AttendanceRow>>(`/attendance${suffix}`) });
}
