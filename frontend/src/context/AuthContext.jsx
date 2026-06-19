import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authAPI.getMe()
        .then((res) => setUser(res.data))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { access_token, refresh_token, user: userData } = res.data;
    localStorage.setItem('access_token',  access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user',          JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authAPI.register(data);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const updateUser = useCallback((data) => {
    const updated = { ...user, ...data };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  }, [user]);

  const isAdmin    = user?.role === 'admin';
  const isEngineer = user?.role === 'engineer' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isAdmin, isEngineer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
