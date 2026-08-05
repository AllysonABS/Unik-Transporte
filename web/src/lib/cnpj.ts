export type CnpjResult = {
  razaoSocial: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  situacao: string;
};

// BrasilAPI — pública, sem chave. Mesmo domínio já usado pela busca de CEP.
export async function buscarCnpj(cnpjValue: string): Promise<CnpjResult | null> {
  const digits = cnpjValue.replace(/\D/g, '');
  if (digits.length !== 14) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      razaoSocial: data.razao_social || data.nome_fantasia || '',
      logradouro: data.logradouro || '',
      numero: data.numero || '',
      bairro: data.bairro || '',
      cidade: data.municipio || '',
      estado: data.uf || '',
      cep: data.cep ? String(data.cep).replace(/\D/g, '') : '',
      situacao: data.descricao_situacao_cadastral || '',
    };
  } catch {
    return null;
  }
}
