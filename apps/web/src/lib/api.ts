import type { ApiError, ErrorCode } from '@pixel/shared';

/**
 * Typed API client for the Pixel Academy backend.
 *
 * - Access token lives in memory only (never localStorage) — XSS-resilient.
 * - Refresh token is persisted so a page reload can re-establish a session; the
 *   backend rotates it on every /auth/refresh (reuse detection), so we always
 *   replace the stored value with the freshly issued one.
 * - On a 401 we attempt a single refresh + retry, then give up (and clear state).
 */

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const REFRESH_KEY = 'pixel.refreshToken';

let accessToken: string | null = null;
let onAuthCleared: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string | null): void {
  if (token) localStorage.setItem(REFRESH_KEY, token);
  else localStorage.removeItem(REFRESH_KEY);
}

/** Register a callback invoked when the session can no longer be refreshed. */
export function setOnAuthCleared(fn: (() => void) | null): void {
  onAuthCleared = fn;
}

export function clearSession(): void {
  accessToken = null;
  setRefreshToken(null);
  onAuthCleared?.();
}

/** Error thrown for any non-2xx response, carrying the §3.3 contract fields. */
export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode | 'NETWORK',
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function parseError(res: Response): Promise<ApiRequestError> {
  try {
    const body = (await res.json()) as ApiError;
    return new ApiRequestError(
      res.status,
      body.error.code,
      body.error.message,
      body.error.requestId,
    );
  } catch {
    return new ApiRequestError(res.status, 'NETWORK', res.statusText || 'Request failed');
  }
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;
  const tokens = (await res.json()) as { accessToken: string; refreshToken: string };
  accessToken = tokens.accessToken;
  setRefreshToken(tokens.refreshToken);
  return true;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  /** Set false for auth endpoints that must not carry / refresh a bearer token. */
  auth?: boolean;
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, auth = true } = opts;

  const doFetch = (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return fetch(`${API_URL}${path}`, {
      method,
      headers,
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch();

  // One refresh-and-retry on 401 for authed calls.
  if (res.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch();
    } else {
      clearSession();
      throw await parseError(res);
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiFetch<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

export { API_URL };
