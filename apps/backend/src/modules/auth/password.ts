import argon2 from 'argon2';

/**
 * Password hashing — argon2id per §3.1. Parameters chosen for a balance of
 * security and latency at this scale; tune memoryCost upward if hardware allows.
 */
const OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456, // ~19 MiB
  timeCost: 2,
  parallelism: 1,
};

export const hashPassword = (plain: string): Promise<string> => argon2.hash(plain, OPTS);

export const verifyPassword = (hash: string, plain: string): Promise<boolean> =>
  argon2.verify(hash, plain).catch(() => false);
