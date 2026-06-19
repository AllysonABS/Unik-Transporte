import { api } from '@/lib/apiClient';
import type { DashboardStats, PedidoData } from '@/types/empresa';

interface DashboardResponse {
  success: boolean;
  pedidos: PedidoData[];
  stats: DashboardStats;
}

export function getDashboard(empresaId: string) {
  return api.get<DashboardResponse>(`/api/empresa/${empresaId}/dashboard`);
}
