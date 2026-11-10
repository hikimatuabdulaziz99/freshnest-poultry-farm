import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService.js';

export function useAuth() {
  const [authState, setAuthState] = useState({
    isInitializing: true,
    hasAdmin: false,
    isAuthenticated: false,
    admin: null,
    error: null,
  });

  const checkAuth = useCallback(async () => {
    try {
      const adminExists = await authService.hasAdmin();
      if (!adminExists) {
        setAuthState({
          isInitializing: false,
          hasAdmin: false,
          isAuthenticated: false,
          admin: null,
          error: null,
        });
        return;
      }

      const activeSession = await authService.getActiveSession();
      if (activeSession && activeSession.admin) {
        setAuthState({
          isInitializing: false,
          hasAdmin: true,
          isAuthenticated: true,
          admin: activeSession.admin,
          error: null,
        });
      } else {
        setAuthState({
          isInitializing: false,
          hasAdmin: true,
          isAuthenticated: false,
          admin: null,
          error: null,
        });
      }
    } catch (err) {
      console.error('Auth verification error:', err);
      setAuthState({
        isInitializing: false,
        hasAdmin: false,
        isAuthenticated: false,
        admin: null,
        error: 'Failed to initialize authentication status',
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    if (res.success) {
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: true,
        admin: res.admin,
        error: null,
      }));
    }
    return res;
  };

  const registerInitialAdmin = async (data) => {
    const res = await authService.registerInitialAdmin(data);
    if (res.success) {
      await checkAuth();
    }
    return res;
  };

  const logout = () => {
    authService.logout();
    setAuthState((prev) => ({
      ...prev,
      isAuthenticated: false,
      admin: null,
      error: null,
    }));
  };

  const updateProfile = async (data) => {
    if (!authState.admin?.id) return { success: false, error: 'No active session.' };
    const res = await authService.updateProfile(authState.admin.id, data);
    if (res.success) {
      setAuthState((prev) => ({
        ...prev,
        admin: res.admin,
      }));
    }
    return res;
  };

  const changePassword = async (data) => {
    if (!authState.admin?.id) return { success: false, error: 'No active session.' };
    return await authService.changePassword(authState.admin.id, data);
  };

  return {
    ...authState,
    checkAuth,
    login,
    registerInitialAdmin,
    logout,
    updateProfile,
    changePassword,
  };
}
