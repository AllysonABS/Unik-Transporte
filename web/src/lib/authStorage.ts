import type { EmpresaData } from '@/types/empresa';

const TOKEN_KEY = 'narota_empresa_token';
const EMPRESA_KEY = 'narota_empresa_data';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredEmpresa(): EmpresaData | null {
  const raw = localStorage.getItem(EMPRESA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EmpresaData;
  } catch {
    return null;
  }
}

export function setAuth(token: string, empresa: EmpresaData) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMPRESA_KEY, JSON.stringify(empresa));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMPRESA_KEY);
}
