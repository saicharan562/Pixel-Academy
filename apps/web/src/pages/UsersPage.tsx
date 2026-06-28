import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Users as UsersIcon } from 'lucide-react';
import { PERMISSIONS, type CreateUserInput, type UpdateUserInput } from '@pixel/shared';
import { useAuth } from '../lib/auth.js';
import { useToast } from '../components/ui/toast.js';
import { titleCase, formatDate } from '../lib/format.js';
import {
  Avatar, Badge, Button, DataTable, EmptyState, ErrorNote, Input, Modal, PageHeader,
  Select, type Column, type Tone,
} from '../components/ui.js';
import { ApiRequestError } from '../lib/api.js';
import {
  useUsers, useRoles, useCreateUser, useUpdateUser, type UserRow,
} from '../features/users/api.js';
import { useClientOptions } from '../features/lookups/api.js';

const statusTone: Record<string, Tone> = { active: 'green', invited: 'amber', suspended: 'red' };
const USER_STATUSES = ['active', 'suspended', 'invited'] as const;

export function UsersPage() {
  const { can } = useAuth();
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
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
    {
      key: 'actions', header: '',
      render: (u) => can(PERMISSIONS.USER_EDIT) ? (
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(u)} aria-label="Edit user" />
        </div>
      ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Team members, roles and access"
        action={can(PERMISSIONS.USER_CREATE) && <Button icon={Plus} onClick={() => setInviting(true)}>Invite user</Button>}
      />
      {error ? (
        <ErrorNote message={(error as ApiRequestError).displayMessage} />
      ) : (
        <DataTable
          columns={columns} rows={rows} getRowId={(u) => u.id} isLoading={isLoading}
          empty={
            <EmptyState
              icon={UsersIcon} title="No users" description="Team members will appear here."
              action={can(PERMISSIONS.USER_CREATE) ? <Button icon={Plus} onClick={() => setInviting(true)}>Invite user</Button> : undefined}
            />
          }
        />
      )}
      {inviting && <InviteUserModal onClose={() => setInviting(false)} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function InviteUserModal({ onClose }: { onClose: () => void }) {
  const create = useCreateUser();
  const toast = useToast();
  const roles = useRoles();
  const clients = useClientOptions();
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', fullName: '', roleId: '', clientId: '', phone: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const selectedRoleName = roles.data?.find((r) => r.id === form.roleId)?.name;
  const isClientRole = selectedRoleName === 'Client';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.roleId) { setErr('Select a role.'); return; }
    if (isClientRole && !form.clientId) { setErr('Select a client for a Client-role user.'); return; }
    const input: CreateUserInput = {
      email: form.email, fullName: form.fullName, roleId: form.roleId,
      clientId: isClientRole ? form.clientId : undefined,
      phone: form.phone || undefined,
    };
    try { await create.mutateAsync(input); toast.success('User invited', form.email); onClose(); }
    catch (e2) { setErr(e2 instanceof ApiRequestError ? e2.displayMessage : 'Failed to invite user'); }
  }

  return (
    <Modal open onClose={onClose} title="Invite user" description="Add a new team member or client login.">
      <form onSubmit={submit} className="space-y-3.5">
        <Input label="Full name" value={form.fullName} onChange={set('fullName')} required />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} required />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Role" value={form.roleId} onChange={set('roleId')} required>
            <option value="">Select role…</option>
            {roles.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
          <Input label="Phone" hint="Optional" value={form.phone} onChange={set('phone')} />
        </div>
        {isClientRole && (
          <Select label="Client" value={form.clientId} onChange={set('clientId')} required>
            <option value="">Select client…</option>
            {clients.data?.data.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </Select>
        )}
        {err && <ErrorNote message={err} />}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Send invite</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const update = useUpdateUser(user.id);
  const toast = useToast();
  const roles = useRoles();
  const [err, setErr] = useState<string | null>(null);
  const currentRole = roles.data?.find((r) => r.name === user.role.name);
  const [form, setForm] = useState({
    fullName: user.fullName, phone: user.phone ?? '',
    roleId: currentRole?.id ?? '', status: user.status as typeof USER_STATUSES[number],
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const input: UpdateUserInput = {
      fullName: form.fullName, phone: form.phone || undefined,
      roleId: form.roleId || undefined, status: form.status,
    };
    try { await update.mutateAsync(input); toast.success('User updated', user.email); onClose(); }
    catch (e2) { setErr(e2 instanceof ApiRequestError ? e2.displayMessage : 'Failed to update user'); }
  }

  return (
    <Modal open onClose={onClose} title="Edit user" description={user.email}>
      <form onSubmit={submit} className="space-y-3.5">
        <Input label="Full name" value={form.fullName} onChange={set('fullName')} required />
        <Input label="Phone" hint="Optional" value={form.phone} onChange={set('phone')} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Role" value={form.roleId} onChange={set('roleId')}>
            {roles.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
          <Select label="Status" value={form.status} onChange={set('status')}>
            {USER_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </Select>
        </div>
        {err && <ErrorNote message={err} />}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={update.isPending}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}
