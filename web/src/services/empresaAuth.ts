import { api } from '@/lib/apiClient';
import type { EmpresaData } from '@/types/empresa';

interface LoginResponse {
  success: boolean;
  empresa: EmpresaData;
  token: string;
}

export function loginEmpresa(cnpj: string, senha: string) {
  return api.post<LoginResponse>('/api/login', { cnpj, senha });
}
