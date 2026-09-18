import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { setAuthToken, setUnauthorizedHandler } from '../api/client';
import { getMe } from '../api/users';

const TOKEN_KEY = 'compass.token';
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    setAuthToken(saved);
    return saved;
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null); setToken(null); setUser(null);
  }, []);

  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    getMe().then(setUser).catch(logout).finally(() => setLoading(false));
  }, [token, logout]);

  const login = useCallback(async (username, password) => {
    const { access_token: accessToken, user: loggedUser } = await authApi.login(username, password);
    localStorage.setItem(TOKEN_KEY, accessToken);
    setAuthToken(accessToken); setToken(accessToken); setUser(loggedUser);
  }, []);

  const value = useMemo(() => ({ user, token, loading, login, register: authApi.register, logout, setUser }),
    [user, token, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
