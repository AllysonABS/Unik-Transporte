import { api } from '@/lib/apiClient';
import type { DespachanteData } from '@/types/empresa';

interface DespachantesResponse {
  success: boolean;
  despachantes: DespachanteData[];
}

export interface DespachantePayload {
  nome: string;
  cpf: string;
  telefone?: string;
  senha?: string;
}

export function listarDespachantes(empresaId: string) {
  return api.get<DespachantesResponse>(`/api/empresa/${empresaId}/despachantes`);
}

export function cadastrarDespachante(empresaId: string, payload: DespachantePayload) {
  return api.post<{ success: boolean; id: string }>(
    `/api/empresa/${empresaId}/despachantes`,
    payload,
  );
}

export function atualizarDespachante(despachanteId: string, payload: DespachantePayload) {
  return api.put<{ success: boolean }>(`/api/despachantes/${despachanteId}`, payload);
}

export function toggleDespachante(empresaId: string, despachanteId: string) {
  return api.put<{ success: boolean }>(
    `/api/empresa/${empresaId}/despachantes/${despachanteId}/toggle`,
  );
}

export function excluirDespachante(empresaId: string, despachanteId: string) {
  return api.delete<{ success: boolean }>(
    `/api/empresa/${empresaId}/despachantes/${despachanteId}`,
  );
}
