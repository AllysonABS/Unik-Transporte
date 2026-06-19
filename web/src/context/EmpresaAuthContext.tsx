import React, { createContext, useContext, useState, useCallback } from 'react';
import { loginEmpresa } from '@/services/empresaAuth';
import { getToken, getStoredEmpresa, setAuth, clearAuth } from '@/lib/authStorage';
import { ApiError } from '@/lib/apiClient';
import type { EmpresaData } from '@/types/empresa';

interface EmpresaAuthContextType {
  empresa: EmpresaData | null;
  token: string | null;
  login: (cnpj: string, senha: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateEmpresa: (data: Partial<EmpresaData>) => void;
}

const EmpresaAuthContext = createContext<EmpresaAuthContextType | undefined>(undefined);

export function EmpresaAuthProvider({ children }: { children: React.ReactNode }) {
  const [empresa, setEmpresa] = useState<EmpresaData | null>(() => getStoredEmpresa());
  const [token, setToken] = useState<string | null>(() => getToken());

  const login = useCallback(async (cnpj: string, senha: string) => {
    try {
      const res = await loginEmpresa(cnpj, senha);
      setAuth(res.token, res.empresa);
      setToken(res.token);
      setEmpresa(res.empresa);
      return { success: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao conectar. Tente novamente.';
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setEmpresa(null);
  }, []);

  const updateEmpresa = useCallback((data: Partial<EmpresaData>) => {
    setEmpresa(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...data };
      const currentToken = getToken();
      if (currentToken) setAuth(currentToken, next);
      return next;
    });
  }, []);

  return (
    <EmpresaAuthContext.Provider value={{ empresa, token, login, logout, updateEmpresa }}>
      {children}
    </EmpresaAuthContext.Provider>
  );
}

export function useEmpresaAuth() {
  const ctx = useContext(EmpresaAuthContext);
  if (!ctx) throw new Error('useEmpresaAuth deve ser usado dentro de EmpresaAuthProvider');
  return ctx;
}
