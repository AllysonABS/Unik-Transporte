import { api } from '@/lib/apiClient';
import type { ClienteVinculo } from '@/types/empresa';

interface ClientesResponse {
  success: boolean;
  clientes: ClienteVinculo[];
}

export interface ClientePayload {
  nome: string;
  cpf?: string;
  cnpj?: string;
  rg?: string;
  telefone?: string;
  email?: string;
  data_nascimento?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
}

export function listarClientesEmpresa(empresaId: string) {
  return api.get<ClientesResponse>(`/api/empresa/${empresaId}/clientes`);
}

export function cadastrarClienteManual(empresaId: string, payload: ClientePayload) {
  return api.post<{ success: boolean }>(`/api/empresa/${empresaId}/cadastrar-cliente`, payload);
}

export function atualizarVinculoCliente(vinculoId: string, payload: ClientePayload) {
  return api.put<{ success: boolean }>(`/api/empresa/vinculo/${vinculoId}`, payload);
}

export function bloquearVinculoCliente(vinculoId: string) {
  return api.put<{ success: boolean }>(`/api/empresa/vinculo/${vinculoId}/bloquear`);
}

export function excluirVinculoCliente(vinculoId: string) {
  return api.delete<{ success: boolean }>(`/api/empresa/vinculo/${vinculoId}`);
}
