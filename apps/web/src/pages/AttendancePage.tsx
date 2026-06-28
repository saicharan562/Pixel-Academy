import { useState } from 'react';
import { Clock } from 'lucide-react';
import { ATTENDANCE_STATUS, type AttendanceStatus } from '@pixel/shared';
import { titleCase, formatDate } from '../lib/format.js';
import {
  Avatar, Badge, DataTable, EmptyState, ErrorNote, PageHeader, Select, type Column, type Tone,
} from '../components/ui.js';
import { ApiRequestError } from '../lib/api.js';
import { useAttendance, type AttendanceRow } from '../features/attendance/api.js';

const statusTone: Record<string, Tone> = {
  present: 'green', half_day: 'amber', absent: 'red', holiday: 'blue', leave: 'slate',
};

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function formatWorked(minutes: number | null): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ') || '0m';
}

export function AttendancePage() {
  const [status, setStatus] = useState<AttendanceStatus | ''>('');
  const { data, isLoading, error } = useAttendance({ status: status || undefined });
  const rows = data?.data ?? [];

  const columns: Column<AttendanceRow>[] = [
    { key: 'workDate', header: 'Date', sortValue: (a) => a.workDate, render: (a) => <span className="text-content-secondary">{formatDate(a.workDate)}</span> },
    {
      key: 'user', header: 'Member', collapse: true,
      render: (a) => <span className="inline-flex items-center gap-2"><Avatar name={a.user.fullName} size="sm" /><span className="text-content-secondary">{a.user.fullName}</span></span>,
    },
    { key: 'checkIn', header: 'Check in', collapse: true, render: (a) => <span className="nums text-content-secondary">{formatTime(a.checkInAt)}</span> },
    { key: 'checkOut', header: 'Check out', collapse: true, render: (a) => <span className="nums text-content-secondary">{formatTime(a.checkOutAt)}</span> },
    { key: 'worked', header: 'Worked', render: (a) => <span className="nums font-medium text-content">{formatWorked(a.workedMinutes)}</span> },
    { key: 'status', header: 'Status', sortValue: (a) => a.status ?? '', render: (a) => a.status ? <Badge tone={statusTone[a.status] ?? 'slate'} dot>{titleCase(a.status)}</Badge> : <span className="text-content-tertiary">—</span> },
  ];

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Clock-ins and daily work-hour ledger" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus | '')} className="w-44">
          <option value="">All statuses</option>
          {ATTENDANCE_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </Select>
      </div>
      {error ? (
        <ErrorNote message={(error as ApiRequestError).message} />
      ) : (
        <DataTable
          columns={columns} rows={rows} getRowId={(a) => a.id} isLoading={isLoading}
          empty={<EmptyState icon={Clock} title="No attendance records" description="Daily clock-ins will appear here." />}
        />
      )}
    </div>
  );
}
