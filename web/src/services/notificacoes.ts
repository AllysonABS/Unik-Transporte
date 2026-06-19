import { api } from '@/lib/apiClient';
import type { NotificacaoData } from '@/types/empresa';

interface NotificacoesResponse {
  success: boolean;
  notificacoes: NotificacaoData[];
}

export function listarNotificacoes(empresaId: string) {
  return api.get<NotificacoesResponse>(`/api/empresa/${empresaId}/notificacoes`);
}

export function contarNotificacoesNaoLidas(empresaId: string) {
  return api.get<{ success: boolean; total: number }>(
    `/api/empresa/${empresaId}/notificacoes/nao-lidas`,
  );
}

export function marcarNotificacoesLidas(empresaId: string) {
  return api.put<{ success: boolean }>(`/api/empresa/${empresaId}/notificacoes/marcar-lidas`);
}
