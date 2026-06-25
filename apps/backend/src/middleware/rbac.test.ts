import { describe, it, expect } from 'vitest';
import { ROLE, type AuthPrincipal, PERMISSIONS } from '@pixel/shared';
import {
  assertSelfOrAdmin,
  assertClientScope,
  assertRecordScope,
  isAdmin,
  isClient,
} from './rbac.js';
import type { AuthedRequest } from './authenticate.js';
import { AppError } from '../lib/errors.js';

function reqAs(role: string, userId = 'u1', clientId: string | null = null): AuthedRequest {
  const principal: AuthPrincipal = {
    userId,
    role: role as never,
    clientId,
    email: 'x@y.z',
    permissions: new Set([PERMISSIONS.USER_VIEW]),
  };
  return { principal } as AuthedRequest;
}

const expectNotFound = (fn: () => void) => {
  try {
    fn();
    throw new Error('expected throw');
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    expect((e as AppError).code).toBe('NOT_FOUND');
  }
};

describe('role predicates', () => {
  it('classifies roles', () => {
    expect(isAdmin(ROLE.ADMIN)).toBe(true);
    expect(isClient(ROLE.CLIENT)).toBe(true);
    expect(isAdmin(ROLE.STAFF)).toBe(false);
  });
});

describe('assertSelfOrAdmin', () => {
  it('admin passes for any owner', () => {
    expect(() => assertSelfOrAdmin(reqAs(ROLE.ADMIN), 'someone-else')).not.toThrow();
  });
  it('self passes', () => {
    expect(() => assertSelfOrAdmin(reqAs(ROLE.STAFF, 'me'), 'me')).not.toThrow();
  });
  it('non-self non-admin gets 404 (not 403 — no existence leak)', () => {
    expectNotFound(() => assertSelfOrAdmin(reqAs(ROLE.STAFF, 'me'), 'other'));
  });
});

describe('assertClientScope', () => {
  it('internal roles are not gated here', () => {
    expect(() => assertClientScope(reqAs(ROLE.MANAGER), 'client-9')).not.toThrow();
  });
  it('client can see own client_id', () => {
    expect(() => assertClientScope(reqAs(ROLE.CLIENT, 'cu', 'client-1'), 'client-1')).not.toThrow();
  });
  it("client cannot see another client's records (404)", () => {
    expectNotFound(() => assertClientScope(reqAs(ROLE.CLIENT, 'cu', 'client-1'), 'client-2'));
  });
  it('client with null record clientId is denied', () => {
    expectNotFound(() => assertClientScope(reqAs(ROLE.CLIENT, 'cu', 'client-1'), null));
  });
});

describe('assertRecordScope', () => {
  it('admin sees everything', () => {
    expect(() =>
      assertRecordScope(reqAs(ROLE.ADMIN), { ownerUserId: 'x', clientId: 'c' }),
    ).not.toThrow();
  });

  it('client gated to own client_id', () => {
    expect(() =>
      assertRecordScope(reqAs(ROLE.CLIENT, 'cu', 'c1'), { clientId: 'c1' }),
    ).not.toThrow();
    expectNotFound(() =>
      assertRecordScope(reqAs(ROLE.CLIENT, 'cu', 'c1'), { clientId: 'c2' }),
    );
  });

  it('manager sees team members', () => {
    const team = new Set(['s1', 's2']);
    expect(() =>
      assertRecordScope(reqAs(ROLE.MANAGER, 'm1'), { ownerUserId: 's1', teamUserIds: team }),
    ).not.toThrow();
    expectNotFound(() =>
      assertRecordScope(reqAs(ROLE.MANAGER, 'm1'), { ownerUserId: 's9', teamUserIds: team }),
    );
  });

  it('manager with managerCanSeeAll passes', () => {
    expect(() =>
      assertRecordScope(reqAs(ROLE.MANAGER, 'm1'), { ownerUserId: 'anyone', managerCanSeeAll: true }),
    ).not.toThrow();
  });

  it('staff sees only own rows', () => {
    expect(() =>
      assertRecordScope(reqAs(ROLE.STAFF, 's1'), { ownerUserId: 's1' }),
    ).not.toThrow();
    expectNotFound(() =>
      assertRecordScope(reqAs(ROLE.STAFF, 's1'), { ownerUserId: 's2' }),
    );
  });

  it('staff sees rows assigned to them', () => {
    expect(() =>
      assertRecordScope(reqAs(ROLE.STAFF, 's1'), { assignedUserIds: new Set(['s1']) }),
    ).not.toThrow();
    expectNotFound(() =>
      assertRecordScope(reqAs(ROLE.STAFF, 's1'), { assignedUserIds: new Set(['s2']) }),
    );
  });
});
