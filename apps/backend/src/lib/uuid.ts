import { randomUUID, randomBytes } from 'node:crypto';

/**
 * UUID v7 (time-ordered) generation — §2.1 ID decision.
 *
 * Node's crypto.randomUUID() emits v4. We mint v7 manually so PKs are
 * time-sortable (better index locality, natural creation ordering) while
 * remaining safe to expose externally.
 *
 * Layout (RFC 9562): 48-bit big-endian Unix ms timestamp | version (7) |
 * 12 random bits | variant (10) | 62 random bits.
 */
export function uuidv7(): string {
  const ms = Date.now();
  const buf = randomBytes(16);

  // 48-bit timestamp into the first 6 bytes.
  buf[0] = (ms / 2 ** 40) & 0xff;
  buf[1] = (ms / 2 ** 32) & 0xff;
  buf[2] = (ms / 2 ** 24) & 0xff;
  buf[3] = (ms / 2 ** 16) & 0xff;
  buf[4] = (ms / 2 ** 8) & 0xff;
  buf[5] = ms & 0xff;

  // Version 7 in the high nibble of byte 6.
  buf[6] = (buf[6] & 0x0f) | 0x70;
  // Variant (10xx) in the high bits of byte 8.
  buf[8] = (buf[8] & 0x3f) | 0x80;

  const hex = buf.toString('hex');
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-` +
    `${hex.slice(16, 20)}-${hex.slice(20, 32)}`
  );
}

/** v4 fallback where ordering is irrelevant (e.g. opaque tokens). */
export const uuid = randomUUID;
