import { api } from '@/lib/apiClient';
import type { EntregadorData } from '@/types/empresa';

interface EntregadoresResponse {
  success: boolean;
  entregadores: EntregadorData[];
}

interface EntregadorEncontrado {
  id: string;
  nome: string;
  cpf: string;
  telefone?: string;
}

export function listarEntregadores(empresaId: string) {
  return api.get<EntregadoresResponse>(`/api/empresa/${empresaId}/entregadores`);
}

// Busca um entregador que já criou a própria conta no app, pelo CPF.
// Não cria nada — só confirma que existe antes de vincular.
export function buscarEntregadorPorCpf(empresaId: string, cpf: string) {
  return api.get<{ success: boolean; entregador: EntregadorEncontrado }>(
    `/api/empresa/${empresaId}/entregadores/buscar?cpf=${encodeURIComponent(cpf)}`,
  );
}

export function vincularEntregador(empresaId: string, cpf: string) {
  return api.post<{ success: boolean; id: string }>(`/api/empresa/${empresaId}/entregadores`, { cpf });
}

export function toggleEntregador(empresaId: string, entregadorId: string) {
  return api.put<{ success: boolean }>(
    `/api/empresa/${empresaId}/entregadores/${entregadorId}/toggle`,
  );
}

export function excluirEntregador(empresaId: string, entregadorId: string) {
  return api.delete<{ success: boolean }>(
    `/api/empresa/${empresaId}/entregadores/${entregadorId}`,
  );
}
