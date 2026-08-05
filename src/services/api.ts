// Para teste local, troque para seu IP local
// Produção: https://transporte.unikcrm.com
const API_URL = 'https://transporte.unikcrm.com';

// Token de autenticação (gerenciado pelo AuthContext)
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
}

// === ENTREGADOR (única conta que existe no app — empresa e cliente final
// só usam a plataforma web) ===

export type EntregadorData = {
  id: string;
  nome: string;
  cpf: string;
  telefone?: string;
  ativo?: boolean;
  empresas?: {id: string; nome_empresa: string}[];
};

export async function loginEntregador(cpf: string, senha: string): Promise<{success: boolean; entregador?: EntregadorData; token?: string; error?: string}> {
  try {
    const res = await fetch(`${API_URL}/api/login-entregador`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({cpf, senha}),
    });
    const data = await res.json();
    if (data.success && data.token) setAuthToken(data.token);
    return data;
  } catch {
    return {success: false, error: 'Erro de conexão com o servidor.'};
  }
}

export async function cadastrarEntregador(dados: {nome: string; cpf: string; telefone?: string; senha: string}): Promise<{success: boolean; entregador_id?: string; error?: string}> {
  try {
    const res = await fetch(`${API_URL}/api/cadastro-entregador`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(dados),
    });
    return await res.json();
  } catch {
    return {success: false, error: 'Erro de conexão com o servidor.'};
  }
}

export async function atualizarEntregador(entregadorId: string, dados: {nome: string; telefone?: string}): Promise<{success: boolean; error?: string}> {
  try {
    const res = await fetch(`${API_URL}/api/entregador/${entregadorId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(dados),
    });
    return await res.json();
  } catch {
    return {success: false, error: 'Erro de conexão com o servidor.'};
  }
}

// === PUSH NOTIFICATIONS (FCM) ===

export async function salvarFcmToken(entregadorId: string, token: string): Promise<{success: boolean; error?: string}> {
  try {
    const res = await fetch(`${API_URL}/api/entregador/${entregadorId}/fcm-token`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({token}),
    });
    return await res.json();
  } catch {
    return {success: false, error: 'Erro de conexão com o servidor.'};
  }
}

export async function removerFcmToken(entregadorId: string, token: string): Promise<{success: boolean; error?: string}> {
  try {
    const res = await fetch(`${API_URL}/api/entregador/${entregadorId}/fcm-token`, {
      method: 'DELETE',
      headers: authHeaders(),
      body: JSON.stringify({token}),
    });
    return await res.json();
  } catch {
    return {success: false, error: 'Erro de conexão com o servidor.'};
  }
}

// === EMPRESAS QUE O ENTREGADOR ATENDE ===

export type EmpresaVinculada = {
  id: string;
  nome_empresa: string;
  cidade: string | null;
  estado: string | null;
  ativo: boolean;
  data_vinculo: string;
};

export async function listarEmpresasEntregador(entregadorId: string): Promise<{success: boolean; empresas?: EmpresaVinculada[]; error?: string}> {
  try {
    const res = await fetch(`${API_URL}/api/entregador/${entregadorId}/empresas`, {headers: authHeaders()});
    return await res.json();
  } catch {
    return {success: false, error: 'Erro de conexão com o servidor.'};
  }
}

export async function desvincularEmpresa(entregadorId: string, empresaId: string): Promise<{success: boolean; error?: string}> {
  try {
    const res = await fetch(`${API_URL}/api/entregador/${entregadorId}/empresas/${empresaId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return await res.json();
  } catch {
    return {success: false, error: 'Erro de conexão com o servidor.'};
  }
}

// === PEDIDOS (fila do entregador) ===

export type PedidoEtapa = {id: string; nome: string; concluida: boolean; hora: string | null; ordem: number};
export type PedidoFoto = {id: string; url: string; etapa: string; criado_em: string};

export type PedidoData = {
  id: string;
  numero?: number;
  empresa_id: string;
  entregador_id: string | null;
  excursao_id: string | null;
  cliente_nome: string;
  entregador_nome: string;
  excursao_nome: string;
  volumes: number;
  descricao: string | null;
  observacao?: string | null;
  status: 'aguardando' | 'em_transito' | 'entregue' | 'cancelado';
  criado_em: string;
  atualizado_em: string;
  etapas: PedidoEtapa[] | null;
  fotos: PedidoFoto[] | null;
  nome_empresa?: string;
};

export async function listarPedidosEntregador(entregadorId: string): Promise<{success: boolean; pedidos?: PedidoData[]; error?: string}> {
  try {
    const res = await fetch(`${API_URL}/api/entregador/${entregadorId}/pedidos`, { headers: authHeaders() });
    return await res.json();
  } catch {
    return {success: false, error: 'Erro de conexão com o servidor.'};
  }
}

export async function atualizarStatusPedido(pedidoId: string, status: string): Promise<{success: boolean; error?: string}> {
  try {
    const res = await fetch(`${API_URL}/api/pedidos/${pedidoId}/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({status}),
    });
    return await res.json();
  } catch {
    return {success: false, error: 'Erro de conexão com o servidor.'};
  }
}

export async function concluirEtapaPedido(pedidoId: string, tipo: string): Promise<{success: boolean; error?: string}> {
  try {
    const res = await fetch(`${API_URL}/api/pedidos/${pedidoId}/concluir-etapas`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({tipo}),
    });
    return await res.json();
  } catch {
    return {success: false, error: 'Erro de conexão com o servidor.'};
  }
}

export async function uploadFotoPedido(pedidoId: string, uri: string, etapa: string): Promise<{success: boolean; url?: string; error?: string}> {
  try {
    const presignRes = await fetch(`${API_URL}/api/pedidos/${pedidoId}/upload-url`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({etapa, contentType: 'image/jpeg', ext: 'jpg'}),
    });
    const presignData = await presignRes.json();
    if (!presignData.success) return {success: false, error: presignData.error || 'Erro ao gerar URL.'};

    const fileRes = await fetch(uri);
    const blob = await fileRes.blob();
    const uploadRes = await fetch(presignData.uploadUrl, {
      method: 'PUT',
      headers: {'Content-Type': 'image/jpeg'},
      body: blob,
    });

    if (!uploadRes.ok) return {success: false, error: 'Erro ao enviar foto.'};

    // Confirma o upload no servidor apenas após sucesso no R2
    await fetch(`${API_URL}/api/pedidos/${pedidoId}/confirmar-foto`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({url: presignData.publicUrl, etapa}),
    });

    return {success: true, url: presignData.publicUrl};
  } catch {
    return {success: false, error: 'Erro de conexão com o servidor.'};
  }
}

export async function salvarObservacaoPedido(pedidoId: string, observacao: string): Promise<{success: boolean; error?: string}> {
  try {
    const res = await fetch(`${API_URL}/api/pedidos/${pedidoId}/observacao`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({observacao}),
    });
    return await res.json();
  } catch {
    return {success: false, error: 'Erro de conexão com o servidor.'};
  }
}

// === RECUPERAÇÃO DE SENHA ===

export async function solicitarRecuperacao(doc: string): Promise<{success: boolean; email_hint?: string; message?: string; error?: string}> {
  try {
    const res = await fetch(`${API_URL}/api/recuperar-senha/solicitar`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({doc}),
    });
    return await res.json();
  } catch {
    return {success: false, error: 'Erro de conexão com o servidor.'};
  }
}

export async function verificarCodigoRecuperacao(doc: string, codigo: string): Promise<{success: boolean; reset_token?: string; error?: string}> {
  try {
    const res = await fetch(`${API_URL}/api/recuperar-senha/verificar`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({doc, codigo}),
    });
    return await res.json();
  } catch {
    return {success: false, error: 'Erro de conexão com o servidor.'};
  }
}

export async function redefinirSenha(reset_token: string, nova_senha: string): Promise<{success: boolean; error?: string}> {
  try {
    const res = await fetch(`${API_URL}/api/recuperar-senha/redefinir`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({reset_token, nova_senha}),
    });
    return await res.json();
  } catch {
    return {success: false, error: 'Erro de conexão com o servidor.'};
  }
}
