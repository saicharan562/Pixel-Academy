import { Users as UsersIcon } from 'lucide-react';
import { titleCase, formatDate } from '../lib/format.js';
import {
  Avatar, Badge, DataTable, EmptyState, ErrorNote, PageHeader, type Column, type Tone,
} from '../components/ui.js';
import { ApiRequestError } from '../lib/api.js';
import { useUsers, type UserRow } from '../features/users/api.js';

const statusTone: Record<string, Tone> = { active: 'green', invited: 'amber', suspended: 'red' };

export function UsersPage() {
  const { data, isLoading, error } = useUsers();
  const rows = data?.data ?? [];

  const columns: Column<UserRow>[] = [
    {
      key: 'name', header: 'Member', sortValue: (u) => u.fullName.toLowerCase(),
      render: (u) => (
        <span className="inline-flex items-center gap-2.5">
          <Avatar name={u.fullName} size="sm" />
          <span>
            <span className="block font-medium text-content">{u.fullName}</span>
            <span className="block text-xs text-content-tertiary">{u.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'role', header: 'Role', collapse: true, render: (u) => <Badge tone="slate">{u.role.name}</Badge> },
    { key: 'phone', header: 'Phone', collapse: true, render: (u) => <span className="text-content-secondary">{u.phone ?? '—'}</span> },
    { key: 'status', header: 'Status', sortValue: (u) => u.status, render: (u) => <Badge tone={statusTone[u.status] ?? 'slate'} dot>{titleCase(u.status)}</Badge> },
    { key: 'lastLogin', header: 'Last login', collapse: true, sortValue: (u) => u.lastLoginAt ?? '', render: (u) => <span className="text-content-secondary">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</span> },
  ];

  return (
    <div>
      <PageHeader title="Users" subtitle="Team members, roles and access" />
      {error ? (
        <ErrorNote message={(error as ApiRequestError).message} />
      ) : (
        <DataTable
          columns={columns} rows={rows} getRowId={(u) => u.id} isLoading={isLoading}
          empty={<EmptyState icon={UsersIcon} title="No users" description="Team members will appear here." />}
        />
      )}
    </div>
  );
}
