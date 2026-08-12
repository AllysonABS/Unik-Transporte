// Cobrança recorrente via Asaas — cartão de crédito apenas, sem período
// grátis. A empresa só fica "ativa" se o cartão for aprovado na hora do
// cadastro; depois disso o Asaas cobra automaticamente todo mês e nos avisa
// via webhook (ver rota /api/webhooks/asaas em index.ts).
//
// Os dados do cartão passam pelo nosso backend só de forma volátil — vêm no
// corpo da requisição, seguem direto pra chamada do Asaas e nunca são
// gravados em banco, log ou em lugar nenhum além da memória da própria
// requisição.

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_ENV = process.env.ASAAS_ENV === 'production' ? 'production' : 'sandbox';
const ASAAS_BASE_URL = ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

export function asaasConfigurado(): boolean {
  return !!ASAAS_API_KEY;
}

async function asaasFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || `Asaas respondeu ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export type CartaoInfo = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type TitularInfo = {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone: string;
};

export async function criarClienteAsaas(dados: { name: string; cpfCnpj: string; email: string; mobilePhone?: string }): Promise<string> {
  const cliente = await asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
  return cliente.id;
}

// Cria a assinatura mensal e já dispara a primeira cobrança no cartão
// informado. O valor de retorno reflete o resultado real da cobrança —
// não basta a assinatura ter sido criada, o primeiro pagamento precisa ter
// sido confirmado pra empresa poder usar o sistema.
export async function criarAssinaturaComCartao(
  customerId: string,
  valor: number,
  cartao: CartaoInfo,
  titular: TitularInfo,
  remoteIp: string
): Promise<{ subscriptionId: string; cartaoFinal: string; cartaoBandeira: string; pagamentoConfirmado: boolean; proximoVencimento: string }> {
  const hoje = new Date().toISOString().slice(0, 10);
  const sub = await asaasFetch('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: valor,
      nextDueDate: hoje,
      cycle: 'MONTHLY',
      description: 'Unik Logística - Plano único',
      creditCard: cartao,
      creditCardHolderInfo: titular,
      remoteIp,
    }),
  });

  const pagamentoConfirmado = await primeiroPagamentoConfirmado(sub.id);

  return {
    subscriptionId: sub.id,
    cartaoFinal: sub.creditCard?.creditCardNumber || '',
    cartaoBandeira: sub.creditCard?.creditCardBrand || '',
    pagamentoConfirmado,
    proximoVencimento: sub.nextDueDate,
  };
}

async function primeiroPagamentoConfirmado(subscriptionId: string): Promise<boolean> {
  const payments = await asaasFetch(`/payments?subscription=${subscriptionId}&limit=1`);
  const status = payments?.data?.[0]?.status;
  return status === 'CONFIRMED' || status === 'RECEIVED';
}

// Troca o cartão de uma assinatura existente — o próximo ciclo já cobra no
// cartão novo. Também revalida o cartão imediatamente (o Asaas faz uma
// pré-autorização), então erro aqui geralmente significa cartão inválido.
export async function trocarCartao(
  subscriptionId: string,
  cartao: CartaoInfo,
  titular: TitularInfo,
  remoteIp: string
): Promise<{ cartaoFinal: string; cartaoBandeira: string }> {
  const sub = await asaasFetch(`/subscriptions/${subscriptionId}/creditCard`, {
    method: 'PUT',
    body: JSON.stringify({
      creditCard: cartao,
      creditCardHolderInfo: titular,
      remoteIp,
    }),
  });
  return {
    cartaoFinal: sub.creditCard?.creditCardNumber || '',
    cartaoBandeira: sub.creditCard?.creditCardBrand || '',
  };
}

// Cancela a assinatura no Asaas — não cobra mais os próximos ciclos. O
// acesso da empresa continua até o vencimento já pago (isso é controlado no
// nosso banco, não aqui).
export async function cancelarAssinatura(subscriptionId: string): Promise<void> {
  await asaasFetch(`/subscriptions/${subscriptionId}`, { method: 'DELETE' });
}

export async function buscarAssinatura(subscriptionId: string): Promise<any> {
  return asaasFetch(`/subscriptions/${subscriptionId}`);
}
