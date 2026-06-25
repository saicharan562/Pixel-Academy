import type { Role } from './enums.js';
import type { PermissionKey } from './permissions.js';

/** Decoded JWT access-token payload — §3.1 (carries sub, role, client_id). */
export interface JwtPayload {
  sub: string; // user id
  role: Role;
  clientId: string | null;
  email: string;
}

/** The authenticated principal attached to each request after auth middleware. */
export interface AuthPrincipal {
  userId: string;
  role: Role;
  clientId: string | null;
  email: string;
  permissions: Set<PermissionKey>;
}

/** Public user DTO returned to clients (never includes password_hash). */
export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  clientId: string | null;
  status: string;
  lastLoginAt: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: UserDto;
}
