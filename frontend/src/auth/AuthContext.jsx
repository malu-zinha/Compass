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
  const [connectionError, setConnectionError] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null); setToken(null); setUser(null); setConnectionError(false);
  }, []);

  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  const fetchMe = useCallback(() => {
    setConnectionError(false);
    return getMe()
      .then(setUser)
      .catch((error) => {
        // Um 401 já disparou o logout via setUnauthorizedHandler (client.js). Qualquer
        // outro erro (rede, 5xx) preserva a sessão e só sinaliza a falha de conexão.
        if (error.status !== 401) setConnectionError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    fetchMe();
  }, [token, fetchMe]);

  const retry = useCallback(() => {
    setLoading(true);
    fetchMe();
  }, [fetchMe]);

  const login = useCallback(async (username, password) => {
    const { access_token: accessToken, user: loggedUser } = await authApi.login(username, password);
    localStorage.setItem(TOKEN_KEY, accessToken);
    setAuthToken(accessToken); setToken(accessToken); setUser(loggedUser);
  }, []);

  const value = useMemo(() => ({
    user, token, loading, login, register: authApi.register, logout, setUser, connectionError, retry,
  }), [user, token, loading, login, logout, connectionError, retry]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
