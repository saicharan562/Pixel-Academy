/**
 * Work-time helpers for attendance, leave, and timesheets. Pure + unit-tested so the
 * People-Ops services stay thin orchestration over correct arithmetic.
 */

/** Whole minutes worked between check-in and check-out (0 if out precedes in). */
export function workedMinutes(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / 60000);
}

/** Derive a day status from minutes worked. ≥ 4h = present, > 0 = half day, else absent. */
export function attendanceStatusFromMinutes(minutes: number): 'present' | 'half_day' | 'absent' {
  if (minutes >= 4 * 60) return 'present';
  if (minutes > 0) return 'half_day';
  return 'absent';
}

/** Inclusive count of calendar days between two YYYY-MM-DD dates (start..end). */
export function inclusiveDays(start: string, end: string): number {
  const s = Date.UTC(...ymd(start));
  const e = Date.UTC(...ymd(end));
  if (e < s) return 0;
  return Math.round((e - s) / 86_400_000) + 1;
}

function ymd(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  return [y, m - 1, d];
}
