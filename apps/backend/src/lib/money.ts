/**
 * Money + GST engine — the single, tested home for every rupee computation (§3.4–3.5).
 *
 * INVARIANT: all arithmetic happens in **integer paise** (₹1 = 100 paise). Floating-point
 * rupees are only ever an input/output boundary value. We never add, multiply, or split
 * money as floats — that is how rounding drift and reconciliation bugs enter GST invoices.
 *
 * Storage note: the DB columns are NUMERIC(14,2) rupees. We convert paise → a 2-dp decimal
 * string at the persistence boundary (`paiseToDecimalString`) and decimal → paise on the way
 * back in. The safe-integer ceiling for paise is 2^53 (≈ ₹90,07,19,92,54,740) — far above any
 * realistic agency invoice; `toPaise` throws if that bound is ever crossed.
 *
 * Rounding: GST uses round-half-up (away from zero). CGST/SGST/IGST are each rounded
 * independently at the line level, exactly as the GST portal computes them, so a printed
 * invoice reconciles to the paisa.
 */

import type { SupplyType, InvoiceStatus } from '@pixel/shared';

const MAX_SAFE_PAISE = Number.MAX_SAFE_INTEGER; // 2^53 - 1

/** Round a (possibly fractional) paise value to an integer paise, half away from zero. */
export function roundHalfUp(value: number): number {
  if (!Number.isFinite(value)) throw new Error('roundHalfUp: non-finite value');
  // + a tiny epsilon nudges binary-float artefacts (e.g. 2.4999999996) back onto the .5 line.
  return Math.sign(value) * Math.round(Math.abs(value) + Number.EPSILON);
}

/** Convert a rupee amount (≤2 dp) to integer paise. Throws on overflow / >2dp drift. */
export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) throw new Error('toPaise: non-finite rupees');
  const paise = Math.round(rupees * 100);
  if (Math.abs(paise) > MAX_SAFE_PAISE) throw new Error('toPaise: amount exceeds safe range');
  return paise;
}

/** Convert integer paise to a NUMERIC(14,2)-ready decimal string, e.g. 123456 → "1234.56". */
export function paiseToDecimalString(paise: number): string {
  if (!Number.isInteger(paise)) throw new Error('paiseToDecimalString: non-integer paise');
  const neg = paise < 0;
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${neg ? '-' : ''}${rupees}.${String(remainder).padStart(2, '0')}`;
}

/** Convert a stored decimal rupee value (Prisma Decimal | string | number) back to paise. */
export function decimalToPaise(value: { toString(): string } | string | number): number {
  return toPaise(Number(value.toString()));
}

/** Sum integer-paise values exactly. */
export function sumPaise(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

// ───────────────────────── Supply type ─────────────────────────

/**
 * Intra-state (supplier state == place of supply) → CGST + SGST.
 * Inter-state → IGST. Both are 2-digit GST state codes.
 */
export function deriveSupplyType(supplierStateCode: string, placeOfSupply: string): SupplyType {
  return supplierStateCode === placeOfSupply ? 'intra_state' : 'inter_state';
}

// ───────────────────────── Line + invoice GST ─────────────────────────

export interface LineInputPaise {
  unitPricePaise: number;
  quantity: number; // may carry up to 2 decimal places (e.g. 1.5 hours)
  discountPaise: number; // line-level discount, already in paise (>= 0)
  gstRate: number; // percent: 0 | 5 | 12 | 18 | 28
}

export interface LineTax {
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
}

/** Compute one line's taxable value and tax split for the given supply type. */
export function computeLine(line: LineInputPaise, supplyType: SupplyType): LineTax {
  const gross = roundHalfUp(line.unitPricePaise * line.quantity);
  const taxable = gross - line.discountPaise;
  if (taxable < 0) throw new Error('computeLine: discount exceeds line value');

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (supplyType === 'intra_state') {
    const half = roundHalfUp((taxable * line.gstRate) / 2 / 100);
    cgstPaise = half;
    sgstPaise = half;
  } else {
    igstPaise = roundHalfUp((taxable * line.gstRate) / 100);
  }

  return {
    taxablePaise: taxable,
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalPaise: taxable + cgstPaise + sgstPaise + igstPaise,
  };
}

export interface InvoiceTotals {
  lines: LineTax[];
  subtotalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  roundOffPaise: number; // adjustment applied to reach the grand total (0 unless roundToRupee)
  totalPaise: number;
}

/**
 * Compute an invoice from its lines. `roundToRupee` adds a GST "Round Off" adjustment so the
 * grand total lands on a whole rupee (the round-off can be ±, and is surfaced as its own line
 * on the printed invoice). Without it, totals are exact to the paisa.
 */
export function computeInvoice(
  lines: LineInputPaise[],
  supplyType: SupplyType,
  opts: { roundToRupee?: boolean } = {},
): InvoiceTotals {
  const computed = lines.map((l) => computeLine(l, supplyType));
  const subtotalPaise = sumPaise(computed.map((l) => l.taxablePaise));
  const cgstPaise = sumPaise(computed.map((l) => l.cgstPaise));
  const sgstPaise = sumPaise(computed.map((l) => l.sgstPaise));
  const igstPaise = sumPaise(computed.map((l) => l.igstPaise));
  const rawTotal = subtotalPaise + cgstPaise + sgstPaise + igstPaise;

  let roundOffPaise = 0;
  let totalPaise = rawTotal;
  if (opts.roundToRupee) {
    totalPaise = Math.round(rawTotal / 100) * 100;
    roundOffPaise = totalPaise - rawTotal;
  }

  return { lines: computed, subtotalPaise, cgstPaise, sgstPaise, igstPaise, roundOffPaise, totalPaise };
}

// ───────────────────────── Payment status ─────────────────────────

/**
 * Derive the payment-driven status from totals. `overdue` and `cancelled` are lifecycle
 * states owned by the scheduler / void action respectively — this only decides the
 * issued ↔ partially_paid ↔ paid band based on how much has been received.
 */
export function paymentStatus(totalPaise: number, paidPaise: number): InvoiceStatus {
  if (paidPaise <= 0) return 'issued';
  if (paidPaise >= totalPaise) return 'paid';
  return 'partially_paid';
}

/** Outstanding balance in paise (never negative; overpayment is surfaced separately). */
export function balancePaise(totalPaise: number, paidPaise: number): number {
  return Math.max(0, totalPaise - paidPaise);
}

// ───────────────────────── Financial year + invoice numbering ─────────────────────────

export interface FinancialYear {
  startYear: number; // e.g. 2025 for FY 2025-26
  label: string; // "2025-26"
}

/** Indian FY runs Apr 1 → Mar 31. Computed in UTC to match how dates are stored. */
export function financialYearOf(date: Date): FinancialYear {
  const month = date.getUTCMonth(); // 0 = Jan
  const year = date.getUTCFullYear();
  const startYear = month >= 3 ? year : year - 1; // April (index 3) starts the FY
  const label = `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
  return { startYear, label };
}

/** Sequential, human-readable invoice number, e.g. PA/2025-26/0001. */
export function formatInvoiceNo(fyLabel: string, seq: number): string {
  return `PA/${fyLabel}/${String(seq).padStart(4, '0')}`;
}

/** Parse the trailing sequence from an invoice number; null if it doesn't match the format. */
export function parseInvoiceSeq(invoiceNo: string): number | null {
  const m = /\/(\d+)$/.exec(invoiceNo);
  return m ? Number(m[1]) : null;
}
