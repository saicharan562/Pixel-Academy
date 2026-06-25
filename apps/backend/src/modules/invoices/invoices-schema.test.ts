import { describe, it, expect } from 'vitest';
import { CreateInvoiceSchema, RecordPaymentSchema, InvoiceLineItemInputSchema } from '@pixel/shared';

const validLine = {
  description: 'Webinar funnel build — 4 sessions',
  hsnSac: '998314',
  quantity: 1,
  unitPriceInr: 50000,
  gstRate: 18,
};

const validInvoice = {
  clientId: '00000000-0000-7000-8000-000000000001',
  issueDate: '2025-06-01',
  dueDate: '2025-06-15',
  placeOfSupply: '29',
  lineItems: [validLine],
};

describe('InvoiceLineItemInputSchema', () => {
  it('accepts a well-formed line and defaults discount to 0', () => {
    const parsed = InvoiceLineItemInputSchema.parse(validLine);
    expect(parsed.discountInr).toBe(0);
  });
  it('rejects a non-GST rate', () => {
    expect(InvoiceLineItemInputSchema.safeParse({ ...validLine, gstRate: 17 }).success).toBe(false);
  });
  it('rejects a malformed HSN/SAC', () => {
    expect(InvoiceLineItemInputSchema.safeParse({ ...validLine, hsnSac: 'AB12' }).success).toBe(false);
  });
  it('rejects non-positive unit price', () => {
    expect(InvoiceLineItemInputSchema.safeParse({ ...validLine, unitPriceInr: 0 }).success).toBe(false);
  });
  it('rejects unit price with >2 decimals', () => {
    expect(InvoiceLineItemInputSchema.safeParse({ ...validLine, unitPriceInr: 100.123 }).success).toBe(false);
  });
});

describe('CreateInvoiceSchema', () => {
  it('accepts a well-formed invoice', () => {
    expect(CreateInvoiceSchema.safeParse(validInvoice).success).toBe(true);
  });
  it('requires at least one line item', () => {
    expect(CreateInvoiceSchema.safeParse({ ...validInvoice, lineItems: [] }).success).toBe(false);
  });
  it('rejects a due date before the issue date', () => {
    expect(CreateInvoiceSchema.safeParse({ ...validInvoice, dueDate: '2025-05-01' }).success).toBe(false);
  });
  it('rejects a non-state-code place of supply', () => {
    expect(CreateInvoiceSchema.safeParse({ ...validInvoice, placeOfSupply: 'AP' }).success).toBe(false);
  });
});

describe('RecordPaymentSchema', () => {
  const valid = { amountInr: 59000, paidAt: '2025-06-10T10:00:00Z', method: 'upi' as const };
  it('accepts a well-formed payment', () => {
    expect(RecordPaymentSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects a non-positive amount', () => {
    expect(RecordPaymentSchema.safeParse({ ...valid, amountInr: 0 }).success).toBe(false);
  });
  it('rejects a non-ISO paidAt', () => {
    expect(RecordPaymentSchema.safeParse({ ...valid, paidAt: '2025-06-10' }).success).toBe(false);
  });
  it('rejects an unknown payment method', () => {
    expect(RecordPaymentSchema.safeParse({ ...valid, method: 'cheque' }).success).toBe(false);
  });
});
