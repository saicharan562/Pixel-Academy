import { describe, it, expect } from 'vitest';
import {
  roundHalfUp, toPaise, paiseToDecimalString, decimalToPaise, sumPaise,
  deriveSupplyType, computeLine, computeInvoice, paymentStatus, balancePaise,
  financialYearOf, formatInvoiceNo, parseInvoiceSeq,
} from './money.js';

describe('paise conversions', () => {
  it('round-trips rupees → paise → decimal string', () => {
    expect(toPaise(1234.56)).toBe(123456);
    expect(paiseToDecimalString(123456)).toBe('1234.56');
    expect(paiseToDecimalString(5)).toBe('0.05');
    expect(paiseToDecimalString(100)).toBe('1.00');
    expect(decimalToPaise('1234.56')).toBe(123456);
  });
  it('handles binary-float inputs without drift', () => {
    expect(toPaise(0.1 + 0.2)).toBe(30); // 0.30000000000000004 → 30
    expect(toPaise(19.99)).toBe(1999);
  });
  it('throws on overflow', () => {
    expect(() => toPaise(1e15)).toThrow(/safe range/);
  });
});

describe('roundHalfUp', () => {
  it('rounds halves away from zero', () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(2.4)).toBe(2);
    expect(roundHalfUp(2.49999999)).toBe(2);
    expect(roundHalfUp(0.5)).toBe(1);
  });
});

describe('deriveSupplyType', () => {
  it('intra when supplier state == place of supply', () => {
    expect(deriveSupplyType('37', '37')).toBe('intra_state');
  });
  it('inter otherwise', () => {
    expect(deriveSupplyType('37', '29')).toBe('inter_state');
  });
});

describe('computeLine — intra-state CGST/SGST', () => {
  it('splits 18% into equal CGST + SGST', () => {
    // ₹10,000 @ 18% → ₹1,800 tax → 900 + 900
    const line = computeLine({ unitPricePaise: 1_000_000, quantity: 1, discountPaise: 0, gstRate: 18 }, 'intra_state');
    expect(line.taxablePaise).toBe(1_000_000);
    expect(line.cgstPaise).toBe(90_000);
    expect(line.sgstPaise).toBe(90_000);
    expect(line.igstPaise).toBe(0);
    expect(line.totalPaise).toBe(1_180_000);
  });
  it('applies quantity and line discount before tax', () => {
    // ₹500 × 3 = ₹1500, −₹100 discount = ₹1400 taxable @ 12%
    const line = computeLine({ unitPricePaise: 50_000, quantity: 3, discountPaise: 10_000, gstRate: 12 }, 'intra_state');
    expect(line.taxablePaise).toBe(140_000);
    // 12% of 1400 = 168 → 84 + 84
    expect(line.cgstPaise).toBe(8_400);
    expect(line.sgstPaise).toBe(8_400);
    expect(line.totalPaise).toBe(156_800);
  });
  it('rounds half-up on odd paise; intra split can differ from full IGST by 1 paisa', () => {
    // ₹100.10 @ 5%: tax = 500.5 paise. Intra: each half = 250.25 → 250 (so 500 total).
    const intra = computeLine({ unitPricePaise: 10_010, quantity: 1, discountPaise: 0, gstRate: 5 }, 'intra_state');
    expect(intra.cgstPaise).toBe(250);
    expect(intra.sgstPaise).toBe(250);
    // Inter: full 500.5 → 501. This 1-paisa gap is exactly how the GST portal computes it.
    const inter = computeLine({ unitPricePaise: 10_010, quantity: 1, discountPaise: 0, gstRate: 5 }, 'inter_state');
    expect(inter.igstPaise).toBe(501);
  });
});

describe('computeLine — inter-state IGST', () => {
  it('charges full IGST, no CGST/SGST', () => {
    const line = computeLine({ unitPricePaise: 1_000_000, quantity: 1, discountPaise: 0, gstRate: 18 }, 'inter_state');
    expect(line.igstPaise).toBe(180_000);
    expect(line.cgstPaise).toBe(0);
    expect(line.sgstPaise).toBe(0);
    expect(line.totalPaise).toBe(1_180_000);
  });
  it('supports 0% (exempt) lines', () => {
    const line = computeLine({ unitPricePaise: 500_000, quantity: 1, discountPaise: 0, gstRate: 0 }, 'inter_state');
    expect(line.igstPaise).toBe(0);
    expect(line.totalPaise).toBe(500_000);
  });
  it('throws when discount exceeds line value', () => {
    expect(() => computeLine({ unitPricePaise: 1000, quantity: 1, discountPaise: 2000, gstRate: 18 }, 'inter_state')).toThrow();
  });
});

describe('computeInvoice — multi-rate + reconciliation', () => {
  const lines = [
    { unitPricePaise: 1_000_000, quantity: 1, discountPaise: 0, gstRate: 18 }, // ₹10000 @18
    { unitPricePaise: 200_000, quantity: 2, discountPaise: 0, gstRate: 12 }, // ₹4000 @12
    { unitPricePaise: 50_000, quantity: 1, discountPaise: 0, gstRate: 5 }, // ₹500 @5
  ];
  it('intra-state totals reconcile to the paisa', () => {
    const inv = computeInvoice(lines, 'intra_state');
    expect(inv.subtotalPaise).toBe(1_450_000); // 10000+4000+500
    // per-line CGST: ₹10000@18→900000/... in paise: line1 1800₹→90000p split 90000? no:
    // line1 tax 180000p → cgst 90000 ; line2 tax 48000p → cgst 24000 ; line3 tax 2500p → cgst 1250
    expect(inv.cgstPaise).toBe(90_000 + 24_000 + 1_250);
    expect(inv.sgstPaise).toBe(90_000 + 24_000 + 1_250);
    expect(inv.igstPaise).toBe(0);
    expect(inv.totalPaise).toBe(inv.subtotalPaise + inv.cgstPaise + inv.sgstPaise);
  });
  it('inter-state totals reconcile to the paisa', () => {
    const inv = computeInvoice(lines, 'inter_state');
    expect(inv.igstPaise).toBe(180_000 + 48_000 + 2_500);
    expect(inv.cgstPaise).toBe(0);
    expect(inv.totalPaise).toBe(inv.subtotalPaise + inv.igstPaise);
  });
  it('round-to-rupee adds a balancing round-off line', () => {
    const odd = [{ unitPricePaise: 10_010, quantity: 1, discountPaise: 0, gstRate: 5 }];
    const inv = computeInvoice(odd, 'inter_state', { roundToRupee: true });
    // taxable 10010 + igst 501 = 10511 → round to 10500 → roundOff -11
    expect(inv.roundOffPaise).toBe(-11);
    expect(inv.totalPaise % 100).toBe(0);
  });
});

describe('payment status + balance', () => {
  it('derives the payment band', () => {
    expect(paymentStatus(100_000, 0)).toBe('issued');
    expect(paymentStatus(100_000, 40_000)).toBe('partially_paid');
    expect(paymentStatus(100_000, 100_000)).toBe('paid');
    expect(paymentStatus(100_000, 120_000)).toBe('paid'); // overpayment still paid
  });
  it('computes outstanding balance, clamped at zero', () => {
    expect(balancePaise(100_000, 30_000)).toBe(70_000);
    expect(balancePaise(100_000, 130_000)).toBe(0);
  });
});

describe('financial year + invoice numbering', () => {
  it('maps dates to the Apr–Mar FY', () => {
    expect(financialYearOf(new Date('2025-04-01T00:00:00Z')).label).toBe('2025-26');
    expect(financialYearOf(new Date('2026-03-31T00:00:00Z')).label).toBe('2025-26');
    expect(financialYearOf(new Date('2026-04-01T00:00:00Z')).label).toBe('2026-27');
    expect(financialYearOf(new Date('2026-01-15T00:00:00Z')).label).toBe('2025-26');
  });
  it('formats and parses sequential invoice numbers', () => {
    expect(formatInvoiceNo('2025-26', 1)).toBe('PA/2025-26/0001');
    expect(formatInvoiceNo('2025-26', 42)).toBe('PA/2025-26/0042');
    expect(parseInvoiceSeq('PA/2025-26/0042')).toBe(42);
    expect(parseInvoiceSeq('garbage')).toBeNull();
  });
});

describe('sumPaise', () => {
  it('sums exactly', () => {
    expect(sumPaise([1, 2, 3, 4])).toBe(10);
    expect(sumPaise([])).toBe(0);
  });
});
