export interface EmpresaData {
  id: string;
  nome_empresa: string;
  cnpj: string;
  nome_responsavel: string;
  email: string;
  telefone: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  horario_funcionamento?: string;
  status_assinatura: string;
}

export interface PedidoEtapa {
  id: string;
  nome: string;
  concluida: boolean;
  hora: string | null;
  ordem: number;
}

export interface PedidoFoto {
  id: string;
  url: string;
  etapa: string;
  criado_em: string;
}

export type PedidoStatus = 'aguardando' | 'em_transito' | 'entregue' | 'cancelado';

export interface PedidoData {
  id: string;
  numero?: number;
  empresa_id: string;
  cliente_id: string | null;
  despachante_id: string | null;
  excursao_id: string | null;
  cliente_nome: string;
  despachante_nome: string;
  excursao_nome: string;
  volumes: number;
  descricao: string | null;
  observacao?: string | null;
  status: PedidoStatus;
  criado_em: string;
  atualizado_em: string;
  etapas: PedidoEtapa[] | null;
  fotos: PedidoFoto[] | null;
}

export interface DashboardStats {
  notificacoes_nao_lidas: number;
  total_clientes: number;
  total_despachantes: number;
  total_excursoes: number;
}

export interface ClienteVinculo {
  vinculo_id: string;
  cliente_id: string;
  status: string;
  nome: string;
  cpf: string;
  cnpj: string;
  rg: string;
  telefone: string;
  email: string;
  data_nascimento: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  observacoes: string;
  data_vinculo: string;
}

export interface DespachanteData {
  id: string;
  nome: string;
  cpf: string;
  telefone?: string;
  ativo?: boolean;
}

export interface ExcursaoData {
  id: string;
  nome: string;
  setor: string;
  vaga: string;
  responsavel: string;
  telefone?: string;
}

export interface NotificacaoData {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  dados: unknown;
  lida: boolean;
  criado_em: string;
}
