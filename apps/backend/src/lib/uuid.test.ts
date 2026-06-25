import { describe, it, expect } from 'vitest';
import { uuidv7 } from './uuid.js';

describe('uuidv7', () => {
  it('produces a valid UUID v7 (version + variant bits)', () => {
    const id = uuidv7();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('is time-ordered: later ids sort after earlier ones', async () => {
    const a = uuidv7();
    await new Promise((r) => setTimeout(r, 2));
    const b = uuidv7();
    expect(a < b).toBe(true);
  });

  it('is unique across a tight loop', () => {
    const set = new Set<string>();
    for (let i = 0; i < 10_000; i++) set.add(uuidv7());
    expect(set.size).toBe(10_000);
  });
});
