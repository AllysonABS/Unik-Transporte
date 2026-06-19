import { api } from '@/lib/apiClient';
import type { EmpresaData } from '@/types/empresa';

export interface AtualizarEmpresaPayload {
  nome_empresa: string;
  telefone: string;
  email: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  horario_funcionamento?: string;
}

export function buscarEmpresa(empresaId: string) {
  return api.get<{ success: boolean; empresa: EmpresaData }>(`/api/empresa/${empresaId}`);
}

export function atualizarEmpresa(empresaId: string, payload: AtualizarEmpresaPayload) {
  return api.put<{ success: boolean }>(`/api/empresa/${empresaId}`, payload);
}
