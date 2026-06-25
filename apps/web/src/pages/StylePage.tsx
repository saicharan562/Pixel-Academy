import { useState, type ReactNode } from 'react';
import { ArrowRight, Bell, Search, Sparkles } from 'lucide-react';
import {
  Avatar, Badge, Button, Card, DataTable, EmptyState, Field, Input, KBD, Modal,
  PageHeader, SegmentedControl, Select, Sheet, SheetSection, Skeleton, Sparkline,
  StatusDot, Textarea, Tooltip, type Column, type Tone,
} from '../components/ui.js';
import { useToast } from '../components/ui/toast.js';

const tones: Tone[] = ['slate', 'green', 'amber', 'red', 'blue', 'violet'];

interface DemoRow { id: string; name: string; role: string; status: Tone; score: number }
const demoRows: DemoRow[] = [
  { id: '1', name: 'Aarav Mehta', role: 'Manager', status: 'green', score: 92 },
  { id: '2', name: 'Diya Sharma', role: 'Staff', status: 'amber', score: 74 },
  { id: '3', name: 'Kabir Rao', role: 'Staff', status: 'blue', score: 88 },
];

export function StylePage() {
  const toast = useToast();
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);

  const cols: Column<DemoRow>[] = [
    { key: 'name', header: 'Member', sortValue: (r) => r.name, render: (r) => <span className="inline-flex items-center gap-2"><Avatar name={r.name} size="sm" /><span className="font-medium text-content">{r.name}</span></span> },
    { key: 'role', header: 'Role', render: (r) => <span className="text-content-secondary">{r.role}</span> },
    { key: 'score', header: 'Score', align: 'right', sortValue: (r) => r.score, render: (r) => <span className="nums text-content-secondary">{r.score}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status} dot>active</Badge> },
  ];

  return (
    <div className="space-y-10">
      <PageHeader title="Design system" subtitle="Living showcase of the Pixel Academy primitive kit" />

      <Section title="Typography">
        <div className="space-y-1">
          <p className="text-4xl font-semibold tracking-tight">Display 4xl — tight tracking</p>
          <p className="text-2xl font-semibold tracking-tight">Heading 2xl</p>
          <p className="text-lg">Large body 1rem</p>
          <p className="text-base text-content-secondary">Base body — the workhorse size for product UI.</p>
          <p className="text-sm text-content-tertiary">Small / secondary text.</p>
          <p className="nums text-base">Tabular numerals: 1,234,567.89 · ₹2,40,000</p>
        </div>
      </Section>

      <Section title="Color tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            ['bg', 'bg-bg'], ['surface', 'bg-surface'], ['surface-2', 'bg-surface-2'], ['surface-3', 'bg-surface-3'],
            ['accent', 'bg-accent'], ['accent-600', 'bg-accent-600'], ['success', 'bg-success'], ['warning', 'bg-warning'],
            ['danger', 'bg-danger'], ['info', 'bg-info'], ['line', 'bg-line'], ['line-strong', 'bg-line-strong'],
          ].map(([name, cls]) => (
            <div key={name} className="overflow-hidden rounded-lg border border-line">
              <div className={`h-12 ${cls}`} />
              <div className="px-2 py-1.5 text-2xs text-content-tertiary">{name}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button icon={Sparkles}>With icon</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Email" icon={Search} placeholder="you@studio.com" hint="We'll never share it." />
          <Input label="With error" defaultValue="bad@" error="Enter a valid email address." />
          <Select label="Status"><option>Active</option><option>Prospect</option></Select>
          <Textarea label="Notes" placeholder="Type something…" />
        </div>
      </Section>

      <Section title="Badges & status">
        <div className="flex flex-wrap items-center gap-2">
          {tones.map((t) => <Badge key={t} tone={t} dot>{t}</Badge>)}
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-content-secondary">
          <span className="inline-flex items-center gap-2"><StatusDot tone="green" pulse /> Live</span>
          <span className="inline-flex items-center gap-2"><StatusDot tone="amber" /> Pending</span>
          <span className="inline-flex items-center gap-2"><StatusDot tone="red" /> Error</span>
        </div>
      </Section>

      <Section title="Controls">
        <div className="flex flex-wrap items-center gap-6">
          <SegmentedControl
            ariaLabel="Demo" value={seg} onChange={setSeg}
            options={[{ value: 'a', label: 'Day' }, { value: 'b', label: 'Week' }, { value: 'c', label: 'Month' }]}
          />
          <div className="flex items-center gap-2">
            <Avatar name="Pixel Academy" /> <Avatar name="Charan K" size="sm" /> <Avatar name={null} size="lg" />
          </div>
          <Tooltip label="Keyboard shortcut"><span className="inline-flex items-center gap-1 text-sm text-content-secondary"><KBD>⌘</KBD><KBD>K</KBD></span></Tooltip>
          <Tooltip label="Notifications"><Bell className="h-5 w-5 text-content-tertiary" /></Tooltip>
        </div>
      </Section>

      <Section title="Feedback">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast.success('Saved', 'Your changes are live.')}>Success toast</Button>
          <Button variant="secondary" onClick={() => toast.error('Something broke', 'Please try again.')}>Error toast</Button>
          <Button variant="secondary" onClick={() => toast.info('Heads up', 'A new build is available.')}>Info toast</Button>
          <Button variant="secondary" onClick={() => setModal(true)}>Open modal</Button>
          <Button variant="secondary" onClick={() => setSheet(true)}>Open sheet</Button>
        </div>
      </Section>

      <Section title="Data display">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <p className="text-2xs font-medium uppercase tracking-wider text-content-tertiary">Revenue</p>
            <p className="nums mt-1 text-3xl font-semibold">₹4.2L</p>
            <Sparkline data={[3, 5, 4, 7, 6, 9, 8, 12]} className="mt-2" />
          </Card>
          <Card className="p-2 lg:col-span-2">
            <DataTable columns={cols} rows={demoRows} getRowId={(r) => r.id} />
          </Card>
        </div>
      </Section>

      <Section title="States">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-4"><div className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4" /><Skeleton className="h-4 w-3/4" /></div></Card>
          <Card className="p-0"><EmptyState icon={Sparkles} title="Nothing here yet" description="Designed empty states beat blank screens." /></Card>
        </div>
      </Section>

      <Modal open={modal} onClose={() => setModal(false)} title="Confirm action" description="Modals are focus-trapped and ESC-dismissible.">
        <p className="text-sm text-content-secondary">This is a centered modal built on Radix Dialog.</p>
        <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button onClick={() => setModal(false)}>Confirm</Button></div>
      </Modal>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Record detail" subtitle="Slide-over panel">
        <SheetSection title="Overview">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Owner" value="Charan K" />
            <Field label="Status" value={<Badge tone="green" dot>active</Badge>} />
          </div>
        </SheetSection>
      </Sheet>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-2xs font-semibold uppercase tracking-wider text-content-tertiary">{title}</h2>
      {children}
    </section>
  );
}
