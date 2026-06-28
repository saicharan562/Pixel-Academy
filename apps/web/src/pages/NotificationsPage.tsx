import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { titleCase, formatDate } from '../lib/format.js';
import { Button, EmptyState, ErrorNote, PageHeader, SegmentedControl, Skeleton } from '../components/ui.js';
import { ApiRequestError } from '../lib/api.js';
import {
  useNotifications, useMarkRead, useMarkAllRead, entityPath, type NotificationRow,
} from '../features/notifications/api.js';

export function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { data, isLoading, error } = useNotifications({ unreadOnly: filter === 'unread' });
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const rows = data?.data ?? [];

  function onOpen(n: NotificationRow) {
    if (!n.readAt) markRead.mutate(n.id);
    const path = entityPath(n.entityType);
    if (path) navigate(path);
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Updates across your workspace"
        action={<Button variant="secondary" icon={Check} loading={markAll.isPending} onClick={() => markAll.mutate()}>Mark all read</Button>}
      />
      <div className="mb-4">
        <SegmentedControl
          ariaLabel="Filter"
          value={filter}
          onChange={setFilter}
          options={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }]}
        />
      </div>

      {error ? (
        <ErrorNote message={(error as ApiRequestError).displayMessage} />
      ) : isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Bell} title={filter === 'unread' ? 'No unread notifications' : 'No notifications'} description="Updates about your work will appear here." />
      ) : (
        <ul className="overflow-hidden rounded-xl border border-line bg-surface-2 divide-y divide-line">
          {rows.map((n) => {
            const linkable = !!entityPath(n.entityType);
            return (
              <li key={n.id}>
                <button
                  onClick={() => onOpen(n)}
                  disabled={!linkable && !!n.readAt}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-1 hover:bg-surface-3 disabled:cursor-default"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-accent'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-content">{n.title}</span>
                      <span className="shrink-0 text-2xs text-content-tertiary">{formatDate(n.createdAt)}</span>
                    </span>
                    {n.body && <span className="mt-0.5 block text-sm text-content-tertiary">{n.body}</span>}
                    {n.entityType && <span className="mt-1 inline-block text-2xs uppercase tracking-wide text-content-tertiary">{titleCase(n.entityType)}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
