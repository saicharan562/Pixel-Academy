import { describe, it, expect } from 'vitest';
import { CreateProjectSchema, UpdateProjectSchema, MoneySchema } from '@pixel/shared';

const valid = {
  clientId: '019efb53-611b-7c84-90ad-ec9684f598d5',
  name: 'Website Revamp',
  status: 'active' as const,
  startDate: '2026-01-01',
  budgetInr: 250000,
  managerId: '019efb53-611b-7c84-90ad-ec9684f598d5',
};

describe('CreateProjectSchema', () => {
  it('accepts a valid project', () => {
    expect(CreateProjectSchema.safeParse(valid).success).toBe(true);
  });
  it('defaults status to planned', () => {
    const { status: _s, ...rest } = valid;
    expect(CreateProjectSchema.parse(rest).status).toBe('planned');
  });
  it('rejects a non-uuid clientId', () => {
    expect(CreateProjectSchema.safeParse({ ...valid, clientId: 'nope' }).success).toBe(false);
  });
  it('rejects a malformed date', () => {
    expect(CreateProjectSchema.safeParse({ ...valid, startDate: '01-01-2026' }).success).toBe(false);
  });
});

describe('UpdateProjectSchema', () => {
  it('does not allow changing clientId', () => {
    // clientId is omitted from the update schema → strict() rejects it
    expect(UpdateProjectSchema.safeParse({ clientId: valid.clientId }).success).toBe(false);
  });
  it('accepts a partial status change', () => {
    expect(UpdateProjectSchema.safeParse({ status: 'on_hold' }).success).toBe(true);
  });
});

describe('MoneySchema', () => {
  it('accepts two-decimal amounts', () => {
    expect(MoneySchema.safeParse(199.99).success).toBe(true);
  });
  it('rejects three-decimal amounts', () => {
    expect(MoneySchema.safeParse(1.005).success).toBe(false);
  });
  it('rejects negatives', () => {
    expect(MoneySchema.safeParse(-5).success).toBe(false);
  });
});
