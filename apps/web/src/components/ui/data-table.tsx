import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { Skeleton } from './base.js';

/**
 * Production DataTable: client-side column sort, sticky header, row hover,
 * density toggle, optional row selection, skeleton loading, and a designed
 * empty slot. Fully keyboard-operable (sortable headers are buttons; rows are
 * <tr role=button> when clickable).
 */
export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
  width?: string;
  /** Hide this column below the `md` breakpoint. */
  collapse?: boolean;
}

type SortDir = 'asc' | 'desc';

export function DataTable<T>({
  columns, rows, getRowId, onRowClick, isLoading = false, density = 'comfortable',
  empty, selectedIds, onToggleSelect, skeletonRows = 6,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  density?: 'comfortable' | 'compact';
  empty?: ReactNode;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  skeletonRows?: number;
}) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const pad = density === 'compact' ? 'px-4 py-2' : 'px-4 py-3';

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a); const bv = col.sortValue!(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null));

  const colSpan = columns.length + (onToggleSelect ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className="max-h-[calc(100vh-15rem)] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-line bg-surface-2/95 backdrop-blur">
              {onToggleSelect && <th className="w-10 px-4 py-2.5" aria-label="Select" />}
              {columns.map((c) => {
                const isSorted = sort?.key === c.key;
                const alignCls = c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left';
                return (
                  <th
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    className={cn('px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-content-tertiary', alignCls, c.collapse && 'hidden md:table-cell')}
                  >
                    {c.sortValue ? (
                      <button
                        onClick={() => toggleSort(c.key)}
                        className={cn('inline-flex items-center gap-1 transition-colors duration-1 hover:text-content', c.align === 'right' && 'flex-row-reverse')}
                      >
                        {c.header}
                        {isSorted ? (
                          sort!.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i}>
                  {onToggleSelect && <td className={pad}><Skeleton className="h-4 w-4" /></td>}
                  {columns.map((c) => (
                    <td key={c.key} className={cn(pad, c.collapse && 'hidden md:table-cell')}>
                      <Skeleton className="h-4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="p-0">{empty}</td>
              </tr>
            ) : (
              sorted.map((row) => {
                const id = getRowId(row);
                const selected = selectedIds?.has(id);
                return (
                  <tr
                    key={id}
                    {...(onRowClick
                      ? {
                          role: 'button',
                          tabIndex: 0,
                          onClick: () => onRowClick(row),
                          onKeyDown: (e) => { if (e.key === 'Enter') onRowClick(row); },
                        }
                      : {})}
                    className={cn(
                      'group transition-colors duration-1',
                      onRowClick && 'cursor-pointer focus:outline-none focus-visible:bg-surface-2',
                      selected ? 'bg-accent/[0.07]' : 'hover:bg-surface-2/70',
                    )}
                  >
                    {onToggleSelect && (
                      <td className={pad} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label="Select row"
                          checked={!!selected}
                          onChange={() => onToggleSelect(id)}
                          className="h-4 w-4 rounded border-line-strong bg-surface-2 text-accent focus:ring-accent/40"
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          pad, 'text-content-secondary',
                          c.align === 'right' && 'text-right', c.align === 'center' && 'text-center',
                          c.collapse && 'hidden md:table-cell',
                        )}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
