// Integração com o Bling (ERP) — API v3, OAuth2.
//
// Modelo: um único app OAuth da Unik Transporte cadastrado no
// developer.bling.com.br (BLING_CLIENT_ID/BLING_CLIENT_SECRET no .env),
// cada empresa autoriza individualmente e a gente guarda o token dela em
// bling_integracoes. Mesmo princípio do WhatsApp — uma credencial nossa,
// N conexões de empresas.
//
// IMPORTANTE: os nomes de campo da resposta da API do Bling (numero,
// contato, itens, volumes etc.) foram mapeados a partir da documentação
// pública da v3, mas não foram validados contra uma resposta real ainda
// (sem credencial de teste até agora). O dado bruto de cada pedido fica
// salvo em pedidos_importados.dados_brutos exatamente pra permitir ajustar
// o mapeamento sem precisar buscar de novo, assim que testarmos com uma
// conta conectada de verdade.

import { Pool } from 'pg';

const BLING_AUTH_URL = 'https://www.bling.com.br/b/Api/v3/oauth/authorize';
const BLING_TOKEN_URL = 'https://www.bling.com.br/Api/v3/oauth/token';
const BLING_API_BASE = 'https://api.bling.com.br/Api/v3';

const CLIENT_ID = process.env.BLING_CLIENT_ID || '';
const CLIENT_SECRET = process.env.BLING_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.BLING_REDIRECT_URI || 'https://transporte.unikcrm.com/api/integracoes/bling/callback';

const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function basicAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
}

export function blingConfigurado(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

// Monta a URL pra onde a empresa é redirecionada pra autorizar o acesso.
// `state` carrega o empresa_id (assinado com o JWT_SECRET em quem chama,
// pra não dar pra forjar) e volta intacto no callback.
export function montarUrlAutorizacao(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    state,
    redirect_uri: REDIRECT_URI,
  });
  return `${BLING_AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number; // segundos
  token_type: string;
};

async function trocarCodigoPorToken(code: string): Promise<TokenResponse> {
  const res = await fetch(BLING_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': '1.0',
      'Authorization': basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (!res.ok) {
    const texto = await res.text().catch(() => '');
    throw new Error(`Bling recusou o código de autorização (${res.status}): ${texto}`);
  }
  return res.json();
}

async function renovarToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(BLING_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': '1.0',
      'Authorization': basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    const texto = await res.text().catch(() => '');
    throw new Error(`Falha ao renovar token do Bling (${res.status}): ${texto}`);
  }
  return res.json();
}

// Dados básicos da conta Bling conectada (nome/CNPJ) — só pra identificação
// na nossa tela, não afeta a sincronização em si. Validado contra a
// documentação pública da v3 (GET /empresas/me/dados-basicos), mas — como o
// resto do mapeamento — ainda não contra uma resposta real.
async function buscarDadosContaBling(accessToken: string): Promise<{ nome: string | null; cnpj: string | null }> {
  try {
    const resp = await blingFetch(accessToken, '/empresas/me/dados-basicos');
    const dados = resp.data || resp;
    return { nome: dados.nome || null, cnpj: dados.cnpj || null };
  } catch (err: any) {
    console.error('[BLING] Erro ao buscar dados básicos da empresa:', err.message);
    return { nome: null, cnpj: null };
  }
}

// Troca o código do callback OAuth por tokens e salva/atualiza a conexão
// da empresa. Chamado uma vez, na hora do "Conectar Bling".
export async function conectarEmpresa(pool: Pool, empresaId: string, code: string): Promise<void> {
  const tokens = await trocarCodigoPorToken(code);
  const expiraEm = new Date(Date.now() + tokens.expires_in * 1000);
  // Busca já com o token novo em mãos pra mostrar na tela com qual conta
  // Bling a empresa acabou de conectar — não trava o "Conectar Bling" se a
  // consulta falhar (fica pra ser preenchida depois, na sincronização).
  const conta = await buscarDadosContaBling(tokens.access_token);
  await pool.query(
    `INSERT INTO bling_integracoes (empresa_id, access_token, refresh_token, expira_em, ativo, conta_nome, conta_cnpj)
     VALUES ($1, $2, $3, $4, true, $5, $6)
     ON CONFLICT (empresa_id) DO UPDATE SET
       access_token = $2, refresh_token = $3, expira_em = $4, ativo = true, ultimo_erro = NULL,
       conta_nome = COALESCE($5, bling_integracoes.conta_nome), conta_cnpj = COALESCE($6, bling_integracoes.conta_cnpj)`,
    [empresaId, tokens.access_token, tokens.refresh_token, expiraEm, conta.nome, conta.cnpj]
  );
}

// Retorna um access_token válido pra empresa, renovando antes de expirar
// se preciso. Retorna null se a empresa não tem integração ativa.
async function obterTokenValido(pool: Pool, empresaId: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT access_token, refresh_token, expira_em FROM bling_integracoes WHERE empresa_id=$1 AND ativo=true',
    [empresaId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  // Renova com 2min de margem antes de expirar de verdade.
  const expiraEm = new Date(row.expira_em).getTime();
  if (expiraEm - Date.now() > 2 * 60 * 1000) {
    return row.access_token;
  }

  const tokens = await renovarToken(row.refresh_token);
  const novaExpiracao = new Date(Date.now() + tokens.expires_in * 1000);
  await pool.query(
    'UPDATE bling_integracoes SET access_token=$1, refresh_token=$2, expira_em=$3 WHERE empresa_id=$4',
    [tokens.access_token, tokens.refresh_token, novaExpiracao, empresaId]
  );
  return tokens.access_token;
}

async function blingFetch(accessToken: string, caminho: string): Promise<any> {
  const res = await fetch(`${BLING_API_BASE}${caminho}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    const texto = await res.text().catch(() => '');
    throw new Error(`Bling API ${caminho} respondeu ${res.status}: ${texto}`);
  }
  return res.json();
}

// Extrai do payload do pedido (formato v3) só o que a gente precisa pra
// preencher a fila de importação. Validado contra resposta real da API em
// 05/08/2026 — "volumes" é transporte.quantidadeVolumes (NÃO a soma das
// quantidades dos itens, que é peças vendidas, não pacotes de despacho).
// O objeto `contato` embutido no pedido não traz telefone — só id/nome/
// documento — por isso o telefone é resolvido à parte, com uma chamada em
// /contatos/{id} (ver resolverTelefoneContato).
function mapearPedido(pedidoBling: any, telefoneContato: string | null) {
  const contato = pedidoBling.contato || {};
  const itens: any[] = pedidoBling.itens || [];
  const quantidadeVolumes = Number(pedidoBling.transporte?.quantidadeVolumes) || 0;
  const itensResumo = itens.map(i => i.descricao || i.codigo).filter(Boolean).join(', ');

  return {
    origemPedidoId: String(pedidoBling.id),
    numeroPedido: String(pedidoBling.numero ?? pedidoBling.numeroLoja ?? pedidoBling.id),
    dataPedido: pedidoBling.data || null,
    clienteNome: contato.nome || 'Cliente sem nome (Bling)',
    clienteTelefone: telefoneContato,
    clienteDocumento: (contato.numeroDocumento || '').replace(/\D/g, '') || null,
    // A loja nem sempre preenche quantidadeVolumes no Bling — quando vem
    // zerado, assume 1 volume por padrão (a empresa ajusta na hora de
    // completar o pedido no nosso painel, se precisar).
    volumes: quantidadeVolumes > 0 ? quantidadeVolumes : 1,
    itensResumo: itensResumo || null,
    valorTotal: pedidoBling.total ?? null,
    dadosBrutos: pedidoBling,
  };
}

// O contato embutido no pedido não traz telefone — busca no cadastro
// completo do contato. Sem essa informação, o aviso por WhatsApp pro
// cliente final (uma das funções centrais do sistema) não teria pra quem
// mandar.
async function resolverTelefoneContato(accessToken: string, contatoId: number | undefined): Promise<string | null> {
  if (!contatoId) return null;
  try {
    const resp = await blingFetch(accessToken, `/contatos/${contatoId}`);
    const contato = resp.data || resp;
    return contato.telefone || contato.celular || null;
  } catch (err: any) {
    console.error(`[BLING] Erro ao buscar telefone do contato ${contatoId}:`, err.message);
    return null;
  }
}

// Busca/cria o cliente_empresa correspondente ao contato do pedido, casando
// por documento (CPF/CNPJ) e, na falta dele, por telefone. Cliente é sempre
// escopado por empresa — nunca cruza dados entre empresas diferentes.
async function resolverCliente(pool: Pool, empresaId: string, dados: ReturnType<typeof mapearPedido>): Promise<string | null> {
  if (dados.clienteDocumento) {
    const existente = await pool.query(
      'SELECT id, telefone FROM cliente_empresa WHERE empresa_id=$1 AND (cpf=$2 OR cnpj=$2)',
      [empresaId, dados.clienteDocumento]
    );
    if (existente.rows.length > 0) {
      // Cliente já cadastrado sem telefone (ex.: veio de um pedido cujo
      // contato não tinha telefone) — completa agora que temos o dado, pra
      // não deixar o aviso por WhatsApp sem pra quem mandar.
      if (!existente.rows[0].telefone && dados.clienteTelefone) {
        await pool.query('UPDATE cliente_empresa SET telefone=$1 WHERE id=$2', [dados.clienteTelefone, existente.rows[0].id]);
      }
      return existente.rows[0].id;
    }
  } else if (dados.clienteTelefone) {
    const existente = await pool.query(
      'SELECT id FROM cliente_empresa WHERE empresa_id=$1 AND telefone=$2',
      [empresaId, dados.clienteTelefone]
    );
    if (existente.rows.length > 0) return existente.rows[0].id;
  }

  const doc = dados.clienteDocumento || '';
  const ehCnpj = doc.length === 14;
  const novo = await pool.query(
    `INSERT INTO cliente_empresa (empresa_id, nome, telefone, cpf, cnpj, observacoes)
     VALUES ($1, $2, $3, $4, $5, 'Importado automaticamente do Bling')
     RETURNING id`,
    [empresaId, dados.clienteNome, dados.clienteTelefone, !ehCnpj ? (doc || null) : null, ehCnpj ? doc : null]
  );
  return novo.rows[0].id;
}

// Parâmetros de um pedido manual de importação por período (tela de
// Integrações → "Importar período") — sobrepõe a janela automática.
export type OpcoesSincronizacao = {
  dataInicial?: string; // YYYY-MM-DD
  dataFinal?: string; // YYYY-MM-DD
};

const LIMITE_PAGINA = 100;
const MAX_PAGINAS = 50; // teto de segurança (5000 pedidos) pra uma importação manual não rodar pra sempre

// Busca todas as páginas de /pedidos/vendas no intervalo pedido. O Bling
// pagina em blocos de até 100 — uma janela de vários dias/semanas (caso de
// uma importação manual retroativa) facilmente passa de 100 pedidos, então
// sem paginar aqui alguns pedidos do período nunca apareceriam.
async function buscarTodosPedidos(accessToken: string, dataInicial: string, dataFinal?: string): Promise<any[]> {
  const pedidos: any[] = [];
  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const params = new URLSearchParams({ dataInicial, limite: String(LIMITE_PAGINA), pagina: String(pagina) });
    if (dataFinal) params.set('dataFinal', dataFinal);
    const resposta = await blingFetch(accessToken, `/pedidos/vendas?${params.toString()}`);
    const pagina_dados: any[] = resposta.data || [];
    pedidos.push(...pagina_dados);
    if (pagina_dados.length < LIMITE_PAGINA) break; // última página
    await esperar(400); // respeita o limite de requisições/segundo entre páginas
  }
  return pedidos;
}

// Sincroniza os pedidos de uma empresa: por padrão, busca no Bling o que
// teve movimentação desde a última sincronização. Passando `opcoes.dataInicial`
// (e opcionalmente `dataFinal`), ignora a janela automática e busca
// exatamente o período pedido — usado pra importação manual retroativa
// (ex.: pedidos anteriores à conexão da integração).
export async function sincronizarEmpresa(pool: Pool, empresaId: string, opcoes?: OpcoesSincronizacao): Promise<{ novos: number }> {
  const accessToken = await obterTokenValido(pool, empresaId);
  if (!accessToken) return { novos: 0 };

  try {
    let dataInicial: string;
    let dataFinal: string | undefined;

    if (opcoes?.dataInicial) {
      dataInicial = opcoes.dataInicial;
      dataFinal = opcoes.dataFinal;
    } else {
      // Sempre olha pelo menos alguns dias pra trás, mesmo em sincronizações
      // seguintes — usar exatamente "ultima_sincronizacao" como início faz a
      // janela encolher a cada ciclo e pedidos de dias anteriores nunca mais
      // aparecem na busca, mesmo que nunca tenham sido importados (ex.:
      // pedido lançado com atraso no Bling). A deduplicação por
      // origem_pedido_id (UNIQUE) já garante que não reprocessa o que já
      // está na fila ou já foi finalizado.
      const JANELA_MINIMA_DIAS = 3;
      const integ = await pool.query('SELECT ultima_sincronizacao, conta_nome FROM bling_integracoes WHERE empresa_id=$1', [empresaId]);
      const desdeUltimaSync: Date | null = integ.rows[0]?.ultima_sincronizacao ? new Date(integ.rows[0].ultima_sincronizacao) : null;
      const janelaMinima = new Date(Date.now() - JANELA_MINIMA_DIAS * 24 * 60 * 60 * 1000);
      const desde = desdeUltimaSync && desdeUltimaSync < janelaMinima ? desdeUltimaSync : janelaMinima;
      dataInicial = desde.toISOString().slice(0, 10);

      // Conexões feitas antes da coluna conta_nome existir ficam sem essa
      // informação pra sempre, a menos que a gente preencha em algum momento
      // depois — aproveita o primeiro ciclo automático pra completar.
      if (!integ.rows[0]?.conta_nome) {
        const conta = await buscarDadosContaBling(accessToken);
        if (conta.nome) {
          await pool.query('UPDATE bling_integracoes SET conta_nome=$1, conta_cnpj=$2 WHERE empresa_id=$3', [conta.nome, conta.cnpj, empresaId]);
        }
      }
    }

    const pedidos = await buscarTodosPedidos(accessToken, dataInicial, dataFinal);

    let novos = 0;
    for (const pedidoResumo of pedidos) {
      // O Bling limita a 3 requisições/segundo — um respiro entre cada
      // pedido evita 429 quando muitos pedidos novos chegam de uma vez.
      await esperar(400);
      // O endpoint de listagem costuma vir resumido — busca o detalhe pra
      // pegar itens/contato completos.
      const detalheResp = await blingFetch(accessToken, `/pedidos/vendas/${pedidoResumo.id}`);
      const pedidoBling = detalheResp.data || detalheResp;

      const jaExiste = await pool.query(
        'SELECT id FROM pedidos_importados WHERE empresa_id=$1 AND origem=$2 AND origem_pedido_id=$3',
        [empresaId, 'bling', String(pedidoBling.id)]
      );
      if (jaExiste.rows.length > 0) continue;

      // Só busca o telefone (chamada extra) pra pedido que realmente vai
      // entrar na fila — evita gastar requisição em pedido já importado.
      await esperar(400);
      const telefoneContato = await resolverTelefoneContato(accessToken, pedidoBling.contato?.id);
      const dados = mapearPedido(pedidoBling, telefoneContato);

      const clienteEmpresaId = await resolverCliente(pool, empresaId, dados);

      await pool.query(
        `INSERT INTO pedidos_importados
          (empresa_id, origem, origem_pedido_id, numero_pedido, data_pedido, cliente_nome, cliente_telefone,
           cliente_documento, cliente_empresa_id, volumes, itens_resumo, valor_total, dados_brutos)
         VALUES ($1,'bling',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [empresaId, dados.origemPedidoId, dados.numeroPedido, dados.dataPedido, dados.clienteNome, dados.clienteTelefone,
          dados.clienteDocumento, clienteEmpresaId, dados.volumes, dados.itensResumo, dados.valorTotal,
          JSON.stringify(dados.dadosBrutos)]
      );
      novos++;
    }

    await pool.query(
      'UPDATE bling_integracoes SET ultima_sincronizacao=NOW(), ultimo_erro=NULL WHERE empresa_id=$1',
      [empresaId]
    );
    return { novos };
  } catch (err: any) {
    await pool.query('UPDATE bling_integracoes SET ultimo_erro=$1 WHERE empresa_id=$2', [err.message, empresaId]);
    throw err;
  }
}

// Roda a sincronização de todas as empresas com integração ativa. Chamado
// pelo loop periódico — precisa rodar só numa instância do processo (ver
// index.ts), nunca uma vez por worker.
export async function sincronizarTodasEmpresas(pool: Pool): Promise<void> {
  const ativos = await pool.query('SELECT empresa_id FROM bling_integracoes WHERE ativo=true');
  for (const row of ativos.rows) {
    try {
      const { novos } = await sincronizarEmpresa(pool, row.empresa_id);
      if (novos > 0) console.log(`[BLING] Empresa ${row.empresa_id}: ${novos} pedido(s) novo(s) importado(s).`);
    } catch (err: any) {
      console.error(`[BLING] Erro ao sincronizar empresa ${row.empresa_id}:`, err.message);
    }
  }
}

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

export function iniciarLoopSincronizacaoBling(pool: Pool): void {
  if (!blingConfigurado()) {
    console.log('[BLING] BLING_CLIENT_ID/SECRET não configurados — integração desabilitada.');
    return;
  }
  console.log('[BLING] Loop de sincronização iniciado (a cada 5min).');
  setInterval(() => {
    sincronizarTodasEmpresas(pool).catch(err => console.error('[BLING] Erro no loop de sincronização:', err.message));
  }, SYNC_INTERVAL_MS);
}
