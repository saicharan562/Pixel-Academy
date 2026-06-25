import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { type Feature } from '../data';
import { CrmDemo } from './CrmDemo';
import { KanbanDemo } from './KanbanDemo';
import { InvoiceDemo } from './InvoiceDemo';
import { AssistantDemo } from './AssistantDemo';
import { CommandDemo } from './CommandDemo';

const MAP: Record<Feature['demo'], () => ReactNode> = {
  crm: CrmDemo,
  kanban: KanbanDemo,
  invoice: InvoiceDemo,
  assistant: AssistantDemo,
  command: CommandDemo,
};

/** A macOS-style window chrome wrapping each live product demo. */
export function DemoFrame({ demo, className }: { demo: Feature['demo']; className?: string }) {
  const Demo = MAP[demo];
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-line/80 bg-surface/70 shadow-lg backdrop-blur-xl', className)}>
      {/* accent wash + grain */}
      <div aria-hidden className="pointer-events-none absolute -inset-px bg-gradient-to-b from-accent/[0.06] to-transparent" />
      <div className="grain absolute inset-0" aria-hidden />
      {/* title bar */}
      <div className="relative flex items-center gap-1.5 border-b border-line/70 px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        <span className="ml-3 text-2xs text-content-tertiary">app.pixelacademy.in</span>
      </div>
      <div className="relative">
        <Demo />
      </div>
    </div>
  );
}
