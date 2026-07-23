import { api } from '@/lib/apiClient';
import type { ExcursaoData } from '@/types/empresa';

interface ExcursoesResponse {
  success: boolean;
  excursoes: ExcursaoData[];
}

export interface ExcursaoPayload {
  nome: string;
  setor: string;
  vaga: string;
  responsavel: string;
  telefone?: string;
  observacoes?: string;
}

export function listarExcursoes(empresaId: string) {
  return api.get<ExcursoesResponse>(`/api/empresa/${empresaId}/excursoes`);
}

export function cadastrarExcursao(empresaId: string, payload: ExcursaoPayload) {
  return api.post<{ success: boolean; id: string }>(
    `/api/empresa/${empresaId}/excursoes`,
    payload,
  );
}

export function atualizarExcursao(excursaoId: string, payload: ExcursaoPayload) {
  return api.put<{ success: boolean }>(`/api/excursoes/${excursaoId}`, payload);
}

export function excluirExcursao(excursaoId: string) {
  return api.delete<{ success: boolean }>(`/api/excursoes/${excursaoId}`);
}
