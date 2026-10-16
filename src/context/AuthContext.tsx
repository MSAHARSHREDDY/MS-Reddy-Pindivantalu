import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Address } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  addAddress: (address: Omit<Address, 'id'>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  openAuthModal: (mode?: 'login' | 'register', onSuccess?: () => void, notice?: string) => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  authNotice: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const successCallbackRef = useRef<(() => void) | null>(null);

  const refreshUser = async () => {
    const token = localStorage.getItem('pindi_auth_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        localStorage.removeItem('pindi_auth_token');
        setUser(null);
      }
    } catch {
      localStorage.removeItem('pindi_auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    if (res.success && res.token) {
      localStorage.setItem('pindi_auth_token', res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);
      setAuthNotice(null);
      // If role is admin, clear any redirect callbacks so they go straight to admin panel
      if (res.user?.role?.toLowerCase() === 'admin') {
        successCallbackRef.current = null;
      } else if (successCallbackRef.current) {
        const cb = successCallbackRef.current;
        successCallbackRef.current = null;
        cb();
      }
    }
  };

  const register = async (name: string, email: string, phone: string, password: string) => {
    const res = await api.register({ name, email, phone, password });
    if (res.success && res.token) {
      localStorage.setItem('pindi_auth_token', res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);
      setAuthNotice(null);
      if (successCallbackRef.current) {
        const cb = successCallbackRef.current;
        successCallbackRef.current = null;
        cb();
      }
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem('pindi_auth_token');
    setUser(null);
  };

  const addAddress = async (address: Omit<Address, 'id'>) => {
    const res = await api.addAddress(address);
    if (res.success && user) {
      setUser({ ...user, addresses: res.addresses });
    }
  };

  const deleteAddress = async (id: string) => {
    const res = await api.deleteAddress(id);
    if (res.success && user) {
      setUser({ ...user, addresses: res.addresses });
    }
  };

  const openAuthModal = (
    mode: 'login' | 'register' = 'login',
    onSuccess?: () => void,
    notice?: string
  ) => {
    setAuthModalMode(mode);
    setAuthNotice(notice || null);
    successCallbackRef.current = onSuccess || null;
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthNotice(null);
    successCallbackRef.current = null;
  };

  const isAdmin = Boolean(user && user.role?.toLowerCase() === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
        addAddress,
        deleteAddress,
        openAuthModal,
        closeAuthModal,
        isAuthModalOpen,
        authModalMode,
        authNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
