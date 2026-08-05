import { api } from '@/lib/apiClient';

export interface BlingStatus {
  success: boolean;
  conectado: boolean;
  ultima_sincronizacao?: string | null;
  ultimo_erro?: string | null;
}

export function buscarStatusBling(empresaId: string) {
  return api.get<BlingStatus>(`/api/empresa/${empresaId}/integracoes/bling`);
}

export function gerarUrlConexaoBling(empresaId: string) {
  return api.get<{ success: boolean; url: string }>(`/api/empresa/${empresaId}/integracoes/bling/conectar`);
}

export function desconectarBling(empresaId: string) {
  return api.delete<{ success: boolean }>(`/api/empresa/${empresaId}/integracoes/bling`);
}

export function sincronizarBlingAgora(empresaId: string) {
  return api.post<{ success: boolean; novos: number }>(`/api/empresa/${empresaId}/integracoes/bling/sincronizar`);
}
