import { describe, it, expect } from 'vitest';
import { CreateClientSchema, UpdateClientSchema } from '@pixel/shared';

const valid = {
  legalName: 'Acme Pvt Ltd',
  displayName: 'Acme',
  gstin: '37ABCDE1234F1Z5',
  stateCode: '37',
  billingAddress: { line1: '1 MG Road', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '520001' },
  email: 'ops@acme.test',
  status: 'active' as const,
};

describe('CreateClientSchema', () => {
  it('accepts a well-formed client', () => {
    expect(CreateClientSchema.safeParse(valid).success).toBe(true);
  });

  it('defaults status to prospect when omitted', () => {
    const { status: _omit, ...rest } = valid;
    const parsed = CreateClientSchema.parse(rest);
    expect(parsed.status).toBe('prospect');
  });

  it('rejects a malformed GSTIN', () => {
    const res = CreateClientSchema.safeParse({ ...valid, gstin: 'NOTAGSTIN' });
    expect(res.success).toBe(false);
  });

  it('rejects a non-2-digit state code', () => {
    expect(CreateClientSchema.safeParse({ ...valid, stateCode: '7' }).success).toBe(false);
  });

  it('rejects a bad PIN code', () => {
    const res = CreateClientSchema.safeParse({
      ...valid,
      billingAddress: { ...valid.billingAddress, pincode: '52001' },
    });
    expect(res.success).toBe(false);
  });

  it('allows GSTIN to be optional', () => {
    const { gstin: _g, ...rest } = valid;
    expect(CreateClientSchema.safeParse(rest).success).toBe(true);
  });
});

describe('UpdateClientSchema', () => {
  it('accepts a partial update', () => {
    expect(UpdateClientSchema.safeParse({ status: 'inactive' }).success).toBe(true);
  });

  it('rejects unknown fields (strict)', () => {
    expect(UpdateClientSchema.safeParse({ bogus: true }).success).toBe(false);
  });
});
