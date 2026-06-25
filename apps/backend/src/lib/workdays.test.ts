import { describe, it, expect } from 'vitest';
import { workedMinutes, attendanceStatusFromMinutes, inclusiveDays } from './workdays.js';

describe('workedMinutes', () => {
  it('counts whole minutes', () => {
    expect(workedMinutes(new Date('2025-06-01T09:00:00Z'), new Date('2025-06-01T17:30:00Z'))).toBe(510);
  });
  it('clamps negative spans to 0', () => {
    expect(workedMinutes(new Date('2025-06-01T18:00:00Z'), new Date('2025-06-01T09:00:00Z'))).toBe(0);
  });
});

describe('attendanceStatusFromMinutes', () => {
  it('classifies by hours worked', () => {
    expect(attendanceStatusFromMinutes(8 * 60)).toBe('present');
    expect(attendanceStatusFromMinutes(4 * 60)).toBe('present');
    expect(attendanceStatusFromMinutes(2 * 60)).toBe('half_day');
    expect(attendanceStatusFromMinutes(0)).toBe('absent');
  });
});

describe('inclusiveDays', () => {
  it('counts both endpoints', () => {
    expect(inclusiveDays('2025-06-01', '2025-06-01')).toBe(1);
    expect(inclusiveDays('2025-06-01', '2025-06-05')).toBe(5);
  });
  it('handles month boundaries', () => {
    expect(inclusiveDays('2025-06-28', '2025-07-02')).toBe(5);
  });
  it('returns 0 when end precedes start', () => {
    expect(inclusiveDays('2025-06-05', '2025-06-01')).toBe(0);
  });
});
