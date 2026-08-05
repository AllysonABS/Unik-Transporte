import { api } from '@/lib/apiClient';
import type { EmpresaData } from '@/types/empresa';

interface LoginResponse {
  success: boolean;
  empresa: EmpresaData;
  token: string;
}

export function loginEmpresa(doc: string, senha: string) {
  return api.post<LoginResponse>('/api/login', { doc, senha });
}
