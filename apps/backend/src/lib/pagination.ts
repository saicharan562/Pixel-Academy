/**
 * Cursor pagination helpers — shared by every list endpoint (§ uniform list contract).
 * Cursor is the last row's id; callers fetch `limit + 1` and pass the slice here.
 */

export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

/** Build the Prisma cursor args for a keyset page over an `id`-ordered query. */
export function cursorArgs(limit: number, cursor?: string) {
  return {
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { id: 'asc' as const },
  };
}

/** Slice the over-fetched rows into a page + nextCursor. */
export function toPage<T extends { id: string }>(rows: T[], limit: number): Page<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  return { data, nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null };
}
