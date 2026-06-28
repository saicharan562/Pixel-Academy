import { useState, type FormEvent } from 'react';
import { Building2, Plus, Search, Trash2 } from 'lucide-react';
import { CLIENT_STATUS, PERMISSIONS, type ClientStatus, type CreateClientInput } from '@pixel/shared';
import { useAuth } from '../lib/auth.js';
import { ApiRequestError } from '../lib/api.js';
import { useToast } from '../components/ui/toast.js';
import { titleCase } from '../lib/format.js';
import {
  Badge, Button, DataTable, EmptyState, ErrorNote, Field, Input, Modal, PageHeader,
  SegmentedControl, Select, Sheet, SheetSection, Spinner, type Column, type Tone,
} from '../components/ui.js';
import {
  useClients, useClient, useCreateClient, useDeleteClient, useAddContact, useDeleteContact,
  type ClientRow,
} from '../features/clients/api.js';

const statusTone: Record<ClientStatus, Tone> = { active: 'green', inactive: 'slate', prospect: 'amber' };

export function ClientsPage() {
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ClientStatus | ''>('');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error } = useClients({ search: search || undefined, status: status || undefined });
  const rows = data?.data ?? [];

  const columns: Column<ClientRow>[] = [
    {
      key: 'name', header: 'Client', sortValue: (c) => c.displayName.toLowerCase(),
      render: (c) => (
        <div>
          <div className="font-medium text-content">{c.displayName}</div>
          <div className="text-xs text-content-tertiary">{c.legalName}</div>
        </div>
      ),
    },
    { key: 'gstin', header: 'GSTIN', collapse: true, render: (c) => <span className="font-mono text-xs text-content-tertiary">{c.gstin ?? '—'}</span> },
    { key: 'state', header: 'State', collapse: true, sortValue: (c) => c.stateCode, render: (c) => <span className="nums text-content-secondary">{c.stateCode}</span> },
    { key: 'status', header: 'Status', sortValue: (c) => c.status, render: (c) => <Badge tone={statusTone[c.status]} dot>{c.status}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Accounts, contacts and GST profiles"
        action={can(PERMISSIONS.CLIENT_CREATE) ? <Button icon={Plus} onClick={() => setCreating(true)}>New client</Button> : undefined}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <Input icon={Search} placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search clients" />
        </div>
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as ClientStatus | '')} className="w-40">
          <option value="">All statuses</option>
          {CLIENT_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </Select>
        <div className="ml-auto">
          <SegmentedControl
            ariaLabel="Row density"
            value={density}
            onChange={setDensity}
            options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]}
          />
        </div>
      </div>

      {error ? (
        <ErrorNote message={(error as ApiRequestError).displayMessage} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(c) => c.id}
          onRowClick={(c) => setSelectedId(c.id)}
          isLoading={isLoading}
          density={density}
          empty={
            <EmptyState
              icon={Building2}
              title={search || status ? 'No matching clients' : 'No clients yet'}
              description={search || status ? 'Try a different search or clear the status filter.' : 'Add your first client organization to start tracking accounts and contacts.'}
              action={can(PERMISSIONS.CLIENT_CREATE) && !search && !status ? <Button icon={Plus} onClick={() => setCreating(true)}>New client</Button> : undefined}
            />
          }
        />
      )}

      {creating && <CreateClientModal onClose={() => setCreating(false)} />}
      <ClientSheet id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateClientModal({ onClose }: { onClose: () => void }) {
  const create = useCreateClient();
  const toast = useToast();
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    legalName: '', displayName: '', gstin: '', stateCode: '37',
    line1: '', city: '', state: '', pincode: '', email: '', phone: '',
    status: 'prospect' as ClientStatus,
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const input: CreateClientInput = {
      legalName: form.legalName, displayName: form.displayName,
      gstin: form.gstin || undefined, stateCode: form.stateCode,
      billingAddress: { line1: form.line1, city: form.city, state: form.state, pincode: form.pincode },
      email: form.email || undefined, phone: form.phone || undefined, status: form.status,
    };
    try {
      await create.mutateAsync(input);
      toast.success('Client created', `${form.displayName} is now in your workspace.`);
      onClose();
    } catch (e2) {
      setErr(e2 instanceof ApiRequestError ? e2.displayMessage : 'Failed to create client');
    }
  }

  return (
    <Modal open onClose={onClose} title="New client" description="Create a client organization and its GST profile." size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Legal name" value={form.legalName} onChange={set('legalName')} required />
          <Input label="Display name" value={form.displayName} onChange={set('displayName')} required />
          <Input label="GSTIN" hint="Optional" value={form.gstin} onChange={set('gstin')} placeholder="37ABCDE1234F1Z5" />
          <Input label="State code" value={form.stateCode} onChange={set('stateCode')} required />
          <Input label="Address line 1" value={form.line1} onChange={set('line1')} required />
          <Input label="City" value={form.city} onChange={set('city')} required />
          <Input label="State" value={form.state} onChange={set('state')} required />
          <Input label="PIN code" value={form.pincode} onChange={set('pincode')} placeholder="520001" required />
          <Input label="Email" hint="Optional" type="email" value={form.email} onChange={set('email')} />
          <Input label="Phone" hint="Optional" value={form.phone} onChange={set('phone')} />
          <Select label="Status" value={form.status} onChange={set('status')}>
            {CLIENT_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </Select>
        </div>
        {err && <ErrorNote message={err} />}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Create client</Button>
        </div>
      </form>
    </Modal>
  );
}

function ClientSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { can } = useAuth();
  const toast = useToast();
  const { data, isLoading } = useClient(id);
  const del = useDeleteClient();
  const addContact = useAddContact(id ?? '');
  const delContact = useDeleteContact(id ?? '');
  const [tab, setTab] = useState<'overview' | 'contacts'>('overview');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  async function onDelete() {
    if (!id || !confirm('Soft-delete this client?')) return;
    try { await del.mutateAsync(id); toast.success('Client deleted'); onClose(); }
    catch (e) { toast.error('Delete failed', e instanceof ApiRequestError ? e.displayMessage : undefined); }
  }
  async function onAddContact(e: FormEvent) {
    e.preventDefault();
    if (!contactName) return;
    try {
      await addContact.mutateAsync({ name: contactName, email: contactEmail || undefined, isPrimary: false });
      setContactName(''); setContactEmail('');
      toast.success('Contact added');
    } catch (e2) { toast.error('Could not add contact', e2 instanceof ApiRequestError ? e2.displayMessage : undefined); }
  }

  return (
    <Sheet
      open={!!id}
      onClose={onClose}
      title={data?.displayName ?? 'Client'}
      subtitle={data?.legalName}
      footer={
        <div className="flex items-center justify-between">
          {can(PERMISSIONS.CLIENT_DELETE) ? (
            <Button variant="danger" size="sm" icon={Trash2} loading={del.isPending} onClick={() => void onDelete()}>Delete</Button>
          ) : <span />}
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {isLoading || !data ? <Spinner /> : (
        <>
          <SegmentedControl
            ariaLabel="Client detail tabs"
            value={tab}
            onChange={setTab}
            options={[{ value: 'overview', label: 'Overview' }, { value: 'contacts', label: `Contacts · ${data.contacts.length}` }]}
          />

          {tab === 'overview' ? (
            <SheetSection title="Profile">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <Field label="Status" value={<Badge tone={statusTone[data.status]} dot>{data.status}</Badge>} />
                <Field label="State code" value={<span className="nums">{data.stateCode}</span>} />
                <Field label="GSTIN" value={<span className="font-mono text-xs">{data.gstin ?? '—'}</span>} />
                <Field label="Email" value={data.email ?? '—'} />
                <Field label="Phone" value={data.phone ?? '—'} />
                <div className="col-span-2">
                  <Field label="Billing address" value={`${data.billingAddress.line1}, ${data.billingAddress.city}, ${data.billingAddress.state} ${data.billingAddress.pincode}`} />
                </div>
              </div>
            </SheetSection>
          ) : (
            <SheetSection title="Contacts">
              <ul className="space-y-1.5">
                {data.contacts.length === 0 && <li className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-content-tertiary">No contacts yet.</li>}
                {data.contacts.map((ct) => (
                  <li key={ct.id} className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-content">{ct.name}</span>
                      {ct.isPrimary && <Badge tone="violet">primary</Badge>}
                      {ct.email && <span className="text-content-tertiary">{ct.email}</span>}
                    </span>
                    {can(PERMISSIONS.CLIENT_EDIT) && (
                      <button onClick={() => void delContact.mutate(ct.id)} className="text-xs text-danger transition-colors hover:underline">Remove</button>
                    )}
                  </li>
                ))}
              </ul>
              {can(PERMISSIONS.CLIENT_EDIT) && (
                <form onSubmit={onAddContact} className="mt-3 flex flex-wrap gap-2">
                  <input placeholder="Name" value={contactName} onChange={(e) => setContactName(e.target.value)}
                    className="h-9 flex-1 rounded-md border border-line bg-surface-2 px-3 text-sm text-content placeholder:text-content-tertiary focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/25" />
                  <input placeholder="Email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                    className="h-9 flex-1 rounded-md border border-line bg-surface-2 px-3 text-sm text-content placeholder:text-content-tertiary focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/25" />
                  <Button type="submit" variant="secondary" size="sm" loading={addContact.isPending}>Add</Button>
                </form>
              )}
            </SheetSection>
          )}
        </>
      )}
    </Sheet>
  );
}
