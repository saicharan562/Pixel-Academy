import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PermissionKey, Role, UserDto } from '@pixel/shared';
import {
  apiFetch,
  clearSession,
  getRefreshToken,
  setAccessToken,
  setOnAuthCleared,
  setRefreshToken,
} from './api.js';

interface MeResponse {
  user: UserDto & { role: Role };
  permissions: PermissionKey[];
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

interface AuthState {
  user: (UserDto & { role: Role }) | null;
  permissions: Set<PermissionKey>;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: PermissionKey) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<(UserDto & { role: Role }) | null>(null);
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const me = await apiFetch<MeResponse>('/me');
    setUser(me.user);
    setPermissions(new Set(me.permissions));
  }, []);

  // On clear (failed refresh), drop the in-memory user so routes redirect to login.
  useEffect(() => {
    setOnAuthCleared(() => {
      setUser(null);
      setPermissions(new Set());
    });
    return () => setOnAuthCleared(null);
  }, []);

  // Bootstrap: if a refresh token survived a reload, re-establish the session.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!getRefreshToken()) {
        setLoading(false);
        return;
      }
      try {
        await loadMe();
      } catch {
        if (active) clearSession();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      setAccessToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      await loadMe();
    },
    [loadMe],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await apiFetch<void>('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
          auth: false,
        });
      }
    } catch {
      // best-effort; clear locally regardless
    }
    clearSession();
    setUser(null);
    setPermissions(new Set());
  }, []);

  const can = useCallback((p: PermissionKey) => permissions.has(p), [permissions]);

  const value = useMemo<AuthState>(
    () => ({ user, permissions, loading, login, logout, can }),
    [user, permissions, loading, login, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
