import { useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Handshake, Plus } from 'lucide-react';
import { DEAL_STAGE, PERMISSIONS, type DealStage, type CreateDealInput } from '@pixel/shared';
import { useAuth } from '../lib/auth.js';
import { ApiRequestError } from '../lib/api.js';
import { useToast } from '../components/ui/toast.js';
import { titleCase, formatINR } from '../lib/format.js';
import {
  Badge, Button, EmptyState, ErrorNote, Input, Modal, PageHeader, Select, type Tone,
} from '../components/ui.js';
import { useDeals, useCreateDeal, useUpdateDeal, type DealRow } from '../features/deals/api.js';
import { useClientOptions } from '../features/lookups/api.js';
import { cn } from '../lib/utils.js';

const stageTone: Record<DealStage, Tone> = {
  lead: 'slate', qualified: 'blue', proposal: 'violet', negotiation: 'amber', won: 'green', lost: 'red',
};
const openStages: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation'];

function weighted(d: DealRow): number {
  return (Number(d.valueInr) || 0) * ((d.probability ?? 0) / 100);
}

export function DealsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const { data, isLoading, error } = useDeals({});
  const update = useUpdateDeal();
  const rows = data?.data ?? [];

  const grouped = useMemo(() => {
    const map = Object.fromEntries(DEAL_STAGE.map((s) => [s, [] as DealRow[]])) as Record<DealStage, DealRow[]>;
    rows.forEach((d) => map[d.stage].push(d));
    return map;
  }, [rows]);

  const pipeline = useMemo(() => {
    const open = rows.filter((d) => openStages.includes(d.stage));
    return {
      openValue: open.reduce((acc, d) => acc + (Number(d.valueInr) || 0), 0),
      weighted: open.reduce((acc, d) => acc + weighted(d), 0),
      won: rows.filter((d) => d.stage === 'won').reduce((acc, d) => acc + (Number(d.valueInr) || 0), 0),
    };
  }, [rows]);

  function onDrop(id: string, from: DealStage, to: DealStage) {
    if (from === to) return;
    update.mutate({ id, input: { stage: to } }, {
      onError: (e) => toast.error('Move failed', e instanceof ApiRequestError ? e.message : undefined),
    });
  }

  return (
    <div>
      <PageHeader
        title="Sales pipeline"
        subtitle="Deals from lead to close — drag to move stage"
        action={can(PERMISSIONS.DEAL_CREATE) && <Button icon={Plus} onClick={() => setCreating(true)}>New deal</Button>}
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile label="Open pipeline" value={formatINR(pipeline.openValue)} />
        <SummaryTile label="Weighted (× probability)" value={formatINR(pipeline.weighted)} tone="amber" />
        <SummaryTile label="Won" value={formatINR(pipeline.won)} tone="green" />
      </div>

      {error ? (
        <ErrorNote message={(error as ApiRequestError).message} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {DEAL_STAGE.map((s) => <div key={s} className="h-64 rounded-xl border border-line bg-surface-2/40" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Handshake} title="No deals yet" description="Track sales opportunities through your pipeline here."
          action={can(PERMISSIONS.DEAL_CREATE) ? <Button icon={Plus} onClick={() => setCreating(true)}>New deal</Button> : undefined}
        />
      ) : (
        <Board grouped={grouped} canDrag={can(PERMISSIONS.DEAL_EDIT)} onDrop={onDrop} />
      )}

      {creating && <CreateDealModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  const dot: Record<string, string> = { amber: 'bg-warning', green: 'bg-success' };
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <p className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-content-tertiary">
        {tone && <span className={`h-1.5 w-1.5 rounded-full ${dot[tone] ?? 'bg-content-tertiary'}`} />}{label}
      </p>
      <p className="nums mt-1.5 text-2xl font-semibold text-content">{value}</p>
    </div>
  );
}

function Board({
  grouped, canDrag, onDrop,
}: {
  grouped: Record<DealStage, DealRow[]>; canDrag: boolean;
  onDrop: (id: string, from: DealStage, to: DealStage) => void;
}) {
  const [over, setOver] = useState<DealStage | null>(null);

  const handleDrop = (e: DragEvent, to: DealStage) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData('text/deal-id');
    const from = e.dataTransfer.getData('text/deal-from') as DealStage;
    if (id && from) onDrop(id, from, to);
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {DEAL_STAGE.map((s) => {
        const total = grouped[s].reduce((acc, d) => acc + (Number(d.valueInr) || 0), 0);
        return (
          <div
            key={s}
            onDragOver={(e) => { if (canDrag) { e.preventDefault(); setOver(s); } }}
            onDragLeave={() => setOver((o) => (o === s ? null : o))}
            onDrop={(e) => handleDrop(e, s)}
            className={cn(
              'flex min-h-[16rem] flex-col rounded-xl border bg-surface/60 p-2 transition-colors duration-1',
              over === s ? 'border-accent/50 bg-accent/[0.05]' : 'border-line',
            )}
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <Badge tone={stageTone[s]} dot>{titleCase(s)}</Badge>
              <span className="nums text-xs text-content-tertiary">{grouped[s].length}</span>
            </div>
            {total > 0 && <p className="nums px-2 pb-1 text-2xs text-content-tertiary">{formatINR(total)}</p>}
            <div className="flex flex-1 flex-col gap-2 p-1">
              {grouped[s].length === 0 && <div className="rounded-lg border border-dashed border-line py-6 text-center text-xs text-content-tertiary">Empty</div>}
              {grouped[s].map((d) => (
                <motion.div
                  layout key={d.id} draggable={canDrag}
                  onDragStart={(e) => {
                    const dt = (e as unknown as DragEvent).dataTransfer;
                    dt.setData('text/deal-id', d.id);
                    dt.setData('text/deal-from', d.stage);
                    dt.effectAllowed = 'move';
                  }}
                  className={cn(
                    'rounded-lg border border-line bg-surface-2 p-3 shadow-xs transition-colors duration-1 hover:border-line-strong',
                    canDrag && 'cursor-grab active:cursor-grabbing',
                  )}
                >
                  <p className="text-sm font-medium text-content">{d.title}</p>
                  <p className="mt-0.5 truncate text-xs text-content-tertiary">{d.client?.displayName ?? 'No client'}</p>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="nums text-sm font-medium text-content">{d.valueInr ? formatINR(d.valueInr) : '—'}</span>
                    {d.probability != null && <span className="text-2xs text-content-tertiary">{d.probability}%</span>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CreateDealModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const create = useCreateDeal();
  const toast = useToast();
  const clients = useClientOptions();
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', clientId: '', stage: 'lead' as DealStage, valueInr: '', probability: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!user) return;
    const input: CreateDealInput = {
      title: form.title, stage: form.stage, ownerUserId: user.id,
      clientId: form.clientId || undefined,
      valueInr: form.valueInr ? Number(form.valueInr) : undefined,
      probability: form.probability ? Number(form.probability) : undefined,
    };
    try { await create.mutateAsync(input); toast.success('Deal created', form.title); onClose(); }
    catch (e2) { setErr(e2 instanceof ApiRequestError ? e2.message : 'Failed to create deal'); }
  }

  return (
    <Modal open onClose={onClose} title="New deal" description="Add an opportunity to the pipeline.">
      <form onSubmit={submit} className="space-y-3.5">
        <Input label="Title" value={form.title} onChange={set('title')} required />
        <Select label="Client" hint="Optional" value={form.clientId} onChange={set('clientId')}>
          <option value="">No client</option>
          {clients.data?.data.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
        </Select>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select label="Stage" value={form.stage} onChange={set('stage')}>
            {DEAL_STAGE.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </Select>
          <Input label="Value (₹)" type="number" min={0} value={form.valueInr} onChange={set('valueInr')} placeholder="0" />
          <Input label="Probability %" type="number" min={0} max={100} value={form.probability} onChange={set('probability')} placeholder="0" />
        </div>
        {err && <ErrorNote message={err} />}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Create deal</Button>
        </div>
      </form>
    </Modal>
  );
}
