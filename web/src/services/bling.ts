import { api } from '@/lib/apiClient';

export interface BlingStatus {
  success: boolean;
  conectado: boolean;
  ultima_sincronizacao?: string | null;
  ultimo_erro?: string | null;
  conta_nome?: string | null;
  conta_cnpj?: string | null;
  lojas_selecionadas?: number[] | null;
}

export interface BlingLoja {
  id: number;
  nome: string;
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

export function sincronizarBlingAgora(empresaId: string, periodo?: { dataInicial: string; dataFinal?: string }) {
  return api.post<{ success: boolean; novos: number }>(`/api/empresa/${empresaId}/integracoes/bling/sincronizar`, periodo);
}

export function buscarLojasBling(empresaId: string) {
  return api.get<{ success: boolean; lojas: BlingLoja[] }>(`/api/empresa/${empresaId}/integracoes/bling/lojas`);
}

export function salvarLojasBling(empresaId: string, lojaIds: number[]) {
  return api.put<{ success: boolean; removidosDaFila: number }>(`/api/empresa/${empresaId}/integracoes/bling/lojas`, { lojaIds });
}
