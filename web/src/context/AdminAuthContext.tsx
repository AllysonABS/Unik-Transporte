import React, { createContext, useContext, useState, useCallback } from 'react';
import { loginAdmin } from '@/services/adminAuth';
import { getAdminToken, getStoredAdmin, setAdminAuth, clearAdminAuth } from '@/lib/adminAuthStorage';
import { ApiError } from '@/lib/apiClient';
import type { AdminData } from '@/types/admin';

interface AdminAuthContextType {
  admin: AdminData | null;
  token: string | null;
  login: (email: string, senha: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminData | null>(() => getStoredAdmin());
  const [token, setToken] = useState<string | null>(() => getAdminToken());

  const login = useCallback(async (email: string, senha: string) => {
    try {
      const res = await loginAdmin(email, senha);
      setAdminAuth(res.token, res.admin);
      setToken(res.token);
      setAdmin(res.admin);
      return { success: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao conectar. Tente novamente.';
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(() => {
    clearAdminAuth();
    setToken(null);
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, token, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth deve ser usado dentro de AdminAuthProvider');
  return ctx;
}
