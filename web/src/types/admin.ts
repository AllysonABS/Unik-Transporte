export interface AdminData {
  id: string;
  nome: string;
  email: string;
}

export interface EmpresaAdmin {
  id: string;
  nome_empresa: string;
  cnpj: string;
  nome_responsavel: string;
  email: string;
  telefone: string;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string;
  estado: string;
  cep: string;
  plano: string;
  valor_plano: number;
  status_assinatura: string;
  ativa: boolean;
  data_cadastro: string;
  data_vencimento: string | null;
}

export interface ClienteAdmin {
  id: string;
  nome: string;
  cpf: string;
  cnpj: string | null;
  email: string;
  telefone: string;
  cidade: string | null;
  estado: string | null;
  ativo: boolean;
  data_cadastro: string;
  total_vinculos: number;
}

export interface DespachanteAdmin {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  ativo: boolean;
  data_cadastro: string;
  empresas: { id: string; nome_empresa: string }[] | null;
}

export interface PedidoAdmin {
  id: string;
  numero: number;
  empresa_id: string;
  nome_empresa: string;
  cliente_nome: string;
  despachante_nome: string;
  excursao_nome: string;
  volumes: number;
  status: string;
  criado_em: string;
}

export interface AssinaturaAdmin {
  id: string;
  empresa_id: string;
  nome_empresa: string;
  status: string;
  valor: number;
  data_inicio: string;
  data_vencimento: string | null;
}

export interface AdminStats {
  total_empresas: number;
  empresas_ativas: number;
  total_clientes: number;
  total_despachantes: number;
  total_pedidos: number;
  assinaturas_ativas: number;
}
