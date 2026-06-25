import { describe, it, expect } from 'vitest';
import { TASK_TRANSITIONS, TASK_STATUS, CreateTaskSchema } from '@pixel/shared';

/** Pure guard logic mirrored by the service: is `to` reachable from `from`? */
const canTransition = (from: string, to: string) => (TASK_TRANSITIONS[from] ?? []).includes(to);

describe('task status transitions', () => {
  it('allows todo → in_progress', () => expect(canTransition('todo', 'in_progress')).toBe(true));
  it('forbids todo → done (must pass through in_progress/review)', () =>
    expect(canTransition('todo', 'done')).toBe(false));
  it('allows in_progress → review and review → done', () => {
    expect(canTransition('in_progress', 'review')).toBe(true);
    expect(canTransition('review', 'done')).toBe(true);
  });
  it('allows reopening done → in_progress', () => expect(canTransition('done', 'in_progress')).toBe(true));
  it('forbids done → todo directly', () => expect(canTransition('done', 'todo')).toBe(false));

  it('every status has a transition entry', () => {
    for (const s of TASK_STATUS) expect(TASK_TRANSITIONS[s]).toBeDefined();
  });
});

describe('CreateTaskSchema', () => {
  it('defaults status=todo and priority=medium', () => {
    const parsed = CreateTaskSchema.parse({
      projectId: '019efb53-611b-7c84-90ad-ec9684f598d5',
      title: 'Wire homepage',
    });
    expect(parsed.status).toBe('todo');
    expect(parsed.priority).toBe('medium');
  });
  it('rejects empty title', () => {
    expect(CreateTaskSchema.safeParse({ projectId: '019efb53-611b-7c84-90ad-ec9684f598d5', title: '' }).success).toBe(false);
  });
});
