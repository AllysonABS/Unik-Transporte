import { api } from '@/lib/apiClient';
import type { PedidoData } from '@/types/empresa';

interface PedidosResponse {
  success: boolean;
  pedidos: PedidoData[];
}

export interface CriarPedidoPayload {
  entregador_id?: string;
  excursao_id?: string;
  cliente_nome: string;
  cliente_telefone?: string;
  entregador_nome: string;
  excursao_nome: string;
  volumes: number;
  descricao?: string;
}

export function listarPedidosEmpresa(empresaId: string) {
  return api.get<PedidosResponse>(`/api/empresa/${empresaId}/pedidos`);
}

export function criarPedido(empresaId: string, payload: CriarPedidoPayload) {
  return api.post<{ success: boolean; pedido_id: string }>(
    `/api/empresa/${empresaId}/pedidos`,
    payload,
  );
}

export function excluirPedido(empresaId: string, pedidoId: string) {
  return api.delete<{ success: boolean }>(`/api/empresa/${empresaId}/pedidos/${pedidoId}`);
}
