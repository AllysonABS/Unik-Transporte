import { adminApi } from '@/lib/adminApiClient';
import type {
  AdminStats,
  EmpresaAdmin,
  ClienteAdmin,
  DespachanteAdmin,
  PedidoAdmin,
  AssinaturaAdmin,
} from '@/types/admin';

// --- Stats ---
export function buscarStatsAdmin() {
  return adminApi.get<{ success: boolean; stats: AdminStats }>('/api/admin/stats');
}

// --- Empresas ---
export function listarEmpresasAdmin() {
  return adminApi.get<{ success: boolean; empresas: EmpresaAdmin[] }>('/api/admin/empresas');
}

export function atualizarEmpresaAdmin(id: string, payload: Partial<EmpresaAdmin>) {
  return adminApi.put<{ success: boolean }>(`/api/admin/empresas/${id}`, payload);
}

export function excluirEmpresaAdmin(id: string) {
  return adminApi.delete<{ success: boolean }>(`/api/admin/empresas/${id}`);
}

// --- Clientes ---
export function listarClientesAdmin() {
  return adminApi.get<{ success: boolean; clientes: ClienteAdmin[] }>('/api/admin/clientes');
}

export function atualizarClienteAdmin(id: string, payload: Partial<ClienteAdmin>) {
  return adminApi.put<{ success: boolean }>(`/api/admin/clientes/${id}`, payload);
}

export function excluirClienteAdmin(id: string) {
  return adminApi.delete<{ success: boolean }>(`/api/admin/clientes/${id}`);
}

// --- Despachantes ---
export function listarDespachantesAdmin() {
  return adminApi.get<{ success: boolean; despachantes: DespachanteAdmin[] }>('/api/admin/despachantes');
}

export function atualizarDespachanteAdmin(id: string, payload: Partial<DespachanteAdmin>) {
  return adminApi.put<{ success: boolean }>(`/api/admin/despachantes/${id}`, payload);
}

export function excluirDespachanteAdmin(id: string) {
  return adminApi.delete<{ success: boolean }>(`/api/admin/despachantes/${id}`);
}

// --- Pedidos ---
export function listarPedidosAdmin() {
  return adminApi.get<{ success: boolean; pedidos: PedidoAdmin[] }>('/api/admin/pedidos?limit=200');
}

export function excluirPedidoAdmin(id: string) {
  return adminApi.delete<{ success: boolean }>(`/api/admin/pedidos/${id}`);
}

// --- Assinaturas ---
export function listarAssinaturasAdmin() {
  return adminApi.get<{ success: boolean; assinaturas: AssinaturaAdmin[] }>('/api/admin/assinaturas');
}

export function atualizarAssinaturaAdmin(id: string, payload: Partial<AssinaturaAdmin>) {
  return adminApi.put<{ success: boolean }>(`/api/admin/assinaturas/${id}`, payload);
}
