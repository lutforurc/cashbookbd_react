import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService, User } from '../services/authService';
import { tokenStorage } from '../services/tokenStorage';

type AuthContextValue = {
  isBooting: boolean;
  isLoggedIn: boolean;
  isSubmitting: boolean;
  user: User | null;
  error: string | null;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isBooting, setIsBooting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const boot = async () => {
      try {
        const token = await tokenStorage.getToken();
        if (!token) return;

        const cachedUser = await tokenStorage.getUser<User>();
        if (cachedUser) setUser(cachedUser);

        const freshUser = await authService.me();
        setUser(freshUser);
        await tokenStorage.setUser(freshUser);
      } catch {
        await tokenStorage.clear();
        setUser(null);
      } finally {
        setIsBooting(false);
      }
    };

    boot();
  }, []);

  const login = async (loginId: string, password: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await authService.login(loginId, password);
      await tokenStorage.setToken(result.token);
      await tokenStorage.setUser(result.user);
      setUser(result.user);
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : 'Login failed.';
      setError(message);
      throw loginError;
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    await tokenStorage.clear();
    setUser(null);
    setError(null);
  };

  const value = useMemo(
    () => ({
      isBooting,
      isLoggedIn: Boolean(user),
      isSubmitting,
      user,
      error,
      login,
      logout,
    }),
    [error, isBooting, isSubmitting, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
};
