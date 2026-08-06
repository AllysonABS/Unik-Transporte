import { api } from '@/lib/apiClient';

export interface PedidoImportado {
  id: string;
  empresa_id: string;
  origem: string;
  origem_pedido_id: string;
  numero_pedido: string;
  data_pedido: string | null;
  cliente_nome: string;
  cliente_telefone: string | null;
  cliente_documento: string | null;
  cliente_empresa_id: string | null;
  cliente_empresa_nome: string | null;
  volumes: number;
  itens_resumo: string | null;
  valor_total: string | null;
  status: 'pendente' | 'finalizado' | 'ignorado';
  pedido_status: 'aguardando' | 'em_transito' | 'entregue' | 'cancelado' | null;
  // Situação do pedido dentro do próprio Bling (Em aberto, Atendido,
  // Cancelado...) — independente do nosso status de fila acima. Só existe
  // pra pedidos vindos do Bling; fica null pra outras origens.
  situacao_bling_id: number | null;
  situacao_bling_nome: string | null;
  criado_em: string;
}

interface ListaResponse {
  success: boolean;
  pedidos_importados: PedidoImportado[];
}

export type FiltroPedidosImportados = 'pendente' | 'em_andamento' | 'entregue' | 'ignorado' | 'todos';

export function listarPedidosImportados(empresaId: string, status: FiltroPedidosImportados = 'pendente', mes?: string) {
  const params = new URLSearchParams({ status });
  if (mes) params.set('mes', mes);
  return api.get<ListaResponse>(`/api/empresa/${empresaId}/pedidos-importados?${params.toString()}`);
}

export interface FinalizarPayload {
  entregador_id: string;
  excursao_id: string;
  volumes?: number;
  descricao?: string;
  cliente_telefone?: string;
}

export function finalizarPedidoImportado(empresaId: string, importadoId: string, payload: FinalizarPayload) {
  return api.post<{ success: boolean; pedido_id: string }>(
    `/api/empresa/${empresaId}/pedidos-importados/${importadoId}/finalizar`,
    payload,
  );
}

export function ignorarPedidoImportado(empresaId: string, importadoId: string) {
  return api.post<{ success: boolean }>(`/api/empresa/${empresaId}/pedidos-importados/${importadoId}/ignorar`);
}
