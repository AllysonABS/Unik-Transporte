import { api } from '@/lib/apiClient';

export type StatusAssinatura = 'ativa' | 'pendente' | 'inadimplente' | 'cancelada';

export interface Cobranca {
  success: boolean;
  status_assinatura: StatusAssinatura;
  data_vencimento: string | null;
  cartao_final: string | null;
  cartao_bandeira: string | null;
  cancelado_em: string | null;
  valor_plano: number;
}

export interface TrocarCartaoPayload {
  cartao_numero: string;
  cartao_nome: string;
  cartao_mes: string;
  cartao_ano: string;
  cartao_cvv: string;
}

export function buscarCobranca(empresaId: string) {
  return api.get<Cobranca>(`/api/empresa/${empresaId}/cobranca`);
}

export function trocarCartaoCobranca(empresaId: string, payload: TrocarCartaoPayload) {
  return api.put<{ success: boolean; cartao_final: string; cartao_bandeira: string }>(
    `/api/empresa/${empresaId}/cobranca/cartao`,
    payload
  );
}

export function cancelarAssinaturaCobranca(empresaId: string) {
  return api.post<{ success: boolean; acesso_ate: string }>(`/api/empresa/${empresaId}/cobranca/cancelar`);
}
