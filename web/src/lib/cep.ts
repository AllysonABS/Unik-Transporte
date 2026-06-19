export type CepResult = {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento: string;
};

async function viaCep(digits: string): Promise<CepResult> {
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  const data = await res.json();
  if (data.erro) throw new Error('CEP não encontrado');
  return {
    logradouro: data.logradouro || '',
    bairro: data.bairro || '',
    cidade: data.localidade || '',
    estado: data.uf || '',
    complemento: data.complemento || '',
  };
}

async function brasilApi(digits: string): Promise<CepResult> {
  const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`);
  if (!res.ok) throw new Error('CEP não encontrado');
  const data = await res.json();
  return {
    logradouro: data.street || '',
    bairro: data.neighborhood || '',
    cidade: data.city || '',
    estado: data.state || '',
    complemento: '',
  };
}

export async function buscarCep(cepValue: string): Promise<CepResult | null> {
  const digits = cepValue.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    return await viaCep(digits);
  } catch {
    try {
      return await brasilApi(digits);
    } catch {
      return null;
    }
  }
}
