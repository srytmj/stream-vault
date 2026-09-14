import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getStoredToken,
  setStoredToken,
  loginUser,
  logoutUser,
  fetchCurrentUser,
  fetchAuthProviders,
  changeUserPassword,
} from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState({ local: true, oidc: { enabled: false } });

  // 1. Check for token in URL query params (from OIDC SSO redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      setStoredToken(urlToken);
      // Clean query parameter from URL without reload
      urlParams.delete('token');
      const newQuery = urlParams.toString() ? `?${urlParams.toString()}` : '';
      window.history.replaceState({}, document.title, window.location.pathname + newQuery);
    }
  }, []);

  // 2. Fetch providers and current user profile on initial mount
  useEffect(() => {
    async function initAuth() {
      try {
        const provData = await fetchAuthProviders().catch(() => ({ local: true, oidc: { enabled: false } }));
        setProviders(provData);

        const token = getStoredToken();
        if (token) {
          try {
            const data = await fetchCurrentUser();
            setUser(data.user);
          } catch (err) {
            console.warn('[Auth] Token verification failed:', err.message);
            setStoredToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('[Auth] Init error:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    // Listen for custom auth_required event dispatched by apiFetch
    const handleAuthRequired = () => {
      setUser(null);
      setStoredToken(null);
    };

    window.addEventListener('sv:auth_required', handleAuthRequired);
    return () => window.removeEventListener('sv:auth_required', handleAuthRequired);
  }, []);

  const login = async (username, password) => {
    const data = await loginUser(username, password);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const updatePassword = async (currentPassword, newPassword) => {
    return changeUserPassword(currentPassword, newPassword);
  };

  const value = {
    user,
    loading,
    providers,
    login,
    logout,
    updatePassword,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
