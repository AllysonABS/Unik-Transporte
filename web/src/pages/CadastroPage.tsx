import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buscarCep } from '@/lib/cep';
import { buscarCnpj } from '@/lib/cnpj';
import { trackPixelEvent } from '@/lib/metaPixel';

// Masks
const maskCNPJ = (v: string) => v.replace(/\D/g, '').slice(0, 14)
  .replace(/^(\d{2})(\d)/, '$1.$2')
  .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
  .replace(/\.(\d{3})(\d)/, '.$1/$2')
  .replace(/(\d{4})(\d)/, '$1-$2');

const maskCPF = (v: string) => v.replace(/\D/g, '').slice(0, 11)
  .replace(/(\d{3})(\d)/, '$1.$2')
  .replace(/(\d{3})(\d)/, '$1.$2')
  .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const maskPhone = (v: string) => v.replace(/\D/g, '').slice(0, 11)
  .replace(/^(\d{2})(\d)/, '($1) $2')
  .replace(/(\d{5})(\d)/, '$1-$2');

const maskCEP = (v: string) => v.replace(/\D/g, '').slice(0, 8)
  .replace(/^(\d{5})(\d)/, '$1-$2');

const maskCartaoNumero = (v: string) => v.replace(/\D/g, '').slice(0, 16)
  .replace(/(\d{4})(?=\d)/g, '$1 ');

const maskCartaoValidade = (v: string) => v.replace(/\D/g, '').slice(0, 6)
  .replace(/^(\d{2})(\d)/, '$1/$2');

type DocTipo = 'cnpj' | 'cpf';
type Etapa = 'dados' | 'endereco' | 'acesso';

const STEPS: { key: Etapa; label: string }[] = [
  { key: 'dados', label: 'Dados' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'acesso', label: 'Acesso e pagamento' },
];

export default function CadastroPage() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>('dados');
  const [docTipo, setDocTipo] = useState<DocTipo>('cnpj');
  const [buscandoDoc, setBuscandoDoc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');

  const [form, setForm] = useState({
    nome_empresa: '',
    doc: '',
    nome_responsavel: '',
    email: '',
    telefone: '',
    senha: '',
    confirmar_senha: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    cartao_numero: '',
    cartao_nome: '',
    cartao_validade: '',
    cartao_cvv: ''
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const stepIndex = STEPS.findIndex(s => s.key === etapa);

  async function handleDocBlur() {
    if (docTipo !== 'cnpj') return;
    const digits = form.doc.replace(/\D/g, '');
    if (digits.length !== 14) return;
    setBuscandoDoc(true);
    const dados = await buscarCnpj(digits);
    setBuscandoDoc(false);
    if (!dados) return;
    setForm(prev => ({
      ...prev,
      nome_empresa: dados.razaoSocial || prev.nome_empresa,
      endereco: dados.logradouro || prev.endereco,
      numero: dados.numero || prev.numero,
      bairro: dados.bairro || prev.bairro,
      cidade: dados.cidade || prev.cidade,
      estado: dados.estado || prev.estado,
      cep: dados.cep ? maskCEP(dados.cep) : prev.cep,
    }));
  }

  async function handleCepBlur() {
    const dados = await buscarCep(form.cep);
    if (!dados) return;
    setForm(prev => ({
      ...prev,
      endereco: dados.logradouro || prev.endereco,
      bairro: dados.bairro || prev.bairro,
      cidade: dados.cidade || prev.cidade,
      estado: dados.estado || prev.estado,
    }));
  }

  function validarEtapaDados(): string | null {
    if (!form.nome_empresa || !form.doc || !form.nome_responsavel || !form.email || !form.telefone) {
      return 'Preencha todos os campos obrigatórios.';
    }
    const docDigits = form.doc.replace(/\D/g, '');
    if (docTipo === 'cnpj' && docDigits.length !== 14) return 'CNPJ deve ter 14 dígitos.';
    if (docTipo === 'cpf' && docDigits.length !== 11) return 'CPF deve ter 11 dígitos.';
    if (form.telefone.replace(/\D/g, '').length < 10) return 'Telefone inválido.';
    return null;
  }

  function validarEtapaAcesso(): string | null {
    if (!form.senha || !form.confirmar_senha) return 'Preencha a senha e a confirmação.';
    if (form.senha !== form.confirmar_senha) return 'As senhas não coincidem.';
    if (form.senha.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
    if (!/[A-Z]/.test(form.senha)) return 'A senha deve conter ao menos uma letra maiúscula.';
    if (!/[0-9]/.test(form.senha)) return 'A senha deve conter ao menos um número.';
    const cartaoDigits = form.cartao_numero.replace(/\D/g, '');
    if (!cartaoDigits || !form.cartao_nome || !form.cartao_validade || !form.cartao_cvv) {
      return 'Preencha os dados do cartão de crédito. A cobrança é feita na hora do cadastro — não trabalhamos com período grátis.';
    }
    if (cartaoDigits.length < 13) return 'Número do cartão inválido.';
    const [mes, ano] = form.cartao_validade.split('/');
    if (!mes || !ano || mes.length !== 2 || ano.length !== 4) return 'Validade do cartão inválida. Use o formato MM/AAAA.';
    if (Number(mes) < 1 || Number(mes) > 12) return 'Mês de validade inválido.';
    if (form.cartao_cvv.length < 3) return 'CVV inválido.';
    return null;
  }

  function irParaProximaEtapa() {
    if (etapa === 'dados') {
      const msg = validarEtapaDados();
      if (msg) { setErro(msg); return; }
      setErro('');
      setEtapa('endereco');
    } else if (etapa === 'endereco') {
      setErro('');
      setEtapa('acesso');
      trackPixelEvent('InitiateCheckout', { value: 69.9, currency: 'BRL' });
    }
  }

  function voltarEtapa() {
    setErro('');
    if (etapa === 'endereco') setEtapa('dados');
    else if (etapa === 'acesso') setEtapa('endereco');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Proteção contra submit acidental fora da última etapa (ex.: toque que
    // acerta o botão "Continuar" bem no instante em que ele vira "Finalizar
    // cadastro" na troca de etapa) — sem isso a validação da senha/cartão
    // roda antes da hora e mostra erro num formulário que o usuário nem
    // preencheu ainda.
    if (etapa !== 'acesso') return;

    setErro('');

    const msgAcesso = validarEtapaAcesso();
    if (msgAcesso) { setErro(msgAcesso); return; }

    const docDigits = form.doc.replace(/\D/g, '');
    const [cartao_mes, cartao_ano] = form.cartao_validade.split('/');
    setLoading(true);
    try {
      const res = await fetch('/api/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_empresa: form.nome_empresa,
          nome_responsavel: form.nome_responsavel,
          email: form.email,
          telefone: form.telefone,
          senha: form.senha,
          endereco: form.endereco,
          numero: form.numero,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
          cep: form.cep,
          cnpj: docTipo === 'cnpj' ? docDigits : '',
          cpf: docTipo === 'cpf' ? docDigits : '',
          cartao_numero: form.cartao_numero.replace(/\s/g, ''),
          cartao_nome: form.cartao_nome,
          cartao_mes,
          cartao_ano,
          cartao_cvv: form.cartao_cvv,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || 'Erro ao cadastrar.'); setLoading(false); return; }
      // Conversão real — cartão já foi cobrado com sucesso nesse ponto
      // (ver /api/cadastro no backend, que só cria a empresa depois de
      // confirmar o pagamento).
      trackPixelEvent('CompleteRegistration', { value: 69.9, currency: 'BRL' });
      setSucesso(true);
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    }
    setLoading(false);
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-matriz flex items-center justify-center px-5">
        <div className="bg-card border border-border shadow-xl shadow-black/5 rounded-3xl p-10 md:p-12 text-center max-w-md w-full">
          <span className="text-5xl mb-6 block">🎉</span>
          <h1 className="text-2xl font-bold text-clareza mb-4">Cadastro realizado!</h1>
          <p className="text-gray mb-8 text-sm md:text-base">Sua conta foi criada com sucesso. Use seu e-mail e senha para acessar o aplicativo Unik Logística.</p>
          <button onClick={() => navigate('/')} className="w-full bg-pulso text-white font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform">
            Voltar para o início
          </button>
        </div>
      </div>
    );
  }

  const inputClass = "w-full h-12 bg-secondary/40 border border-border rounded-lg px-4 text-clareza focus:border-pulso focus:bg-card focus:ring-1 focus:ring-pulso/30 outline-none transition text-sm";

  return (
    <div className="min-h-screen bg-matriz py-8 md:py-12 px-5">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <button onClick={() => navigate('/')} className="text-pulso text-sm font-semibold mb-4 inline-flex items-center gap-1 hover:underline">
            ← Voltar ao início
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-clareza mb-2">Criar sua conta</h1>
          <p className="text-gray text-sm md:text-base">Preencha os dados da sua empresa para começar.</p>
        </div>

        {/* Indicador de etapas */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 ${i <= stepIndex ? 'text-pulso' : 'text-gray/60'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i <= stepIndex ? 'bg-pulso text-white' : 'bg-secondary text-gray'}`}>
                  {i + 1}
                </span>
                <span className="text-xs font-semibold hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <span className="w-6 md:w-10 h-px bg-border" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border shadow-xl shadow-black/5 rounded-2xl p-6 md:p-8 space-y-6">
          {/* Etapa 1: Dados */}
          {etapa === 'dados' && (
            <>
              <h2 className="text-pulso font-bold text-xs uppercase tracking-wider">Dados da Empresa</h2>

              <div className="flex gap-2">
                {(['cnpj', 'cpf'] as DocTipo[]).map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => { setDocTipo(tipo); update('doc', ''); }}
                    className={`flex-1 h-10 rounded-lg text-sm font-semibold border transition ${
                      docTipo === tipo
                        ? 'bg-pulso text-white border-pulso'
                        : 'bg-secondary/40 text-gray border-border'
                    }`}
                  >
                    Tenho {tipo.toUpperCase()}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-gray text-xs font-medium block mb-1.5">
                  {docTipo === 'cnpj' ? 'CNPJ *' : 'CPF *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.doc}
                    onChange={e => update('doc', docTipo === 'cnpj' ? maskCNPJ(e.target.value) : maskCPF(e.target.value))}
                    onBlur={handleDocBlur}
                    placeholder={docTipo === 'cnpj' ? '00.000.000/0001-00' : '000.000.000-00'}
                    className={inputClass}
                  />
                  {buscandoDoc && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-pulso text-xs">Buscando...</span>
                  )}
                </div>
                {docTipo === 'cnpj' && (
                  <p className="text-gray/70 text-[11px] mt-1">Preenchemos os dados automaticamente ao sair do campo.</p>
                )}
                {docTipo === 'cpf' && (
                  <p className="text-gray/70 text-[11px] mt-1">Sem CNPJ ainda? Sem problema, cadastre com seu CPF.</p>
                )}
              </div>

              <div>
                <label className="text-gray text-xs font-medium block mb-1.5">Nome da empresa *</label>
                <input
                  type="text"
                  value={form.nome_empresa}
                  onChange={e => update('nome_empresa', e.target.value)}
                  maxLength={100}
                  className={inputClass}
                />
                <span className="text-gray/70 text-[10px] mt-0.5 block text-right">{form.nome_empresa.length}/100</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray text-xs font-medium block mb-1.5">Nome do responsável *</label>
                  <input
                    type="text"
                    value={form.nome_responsavel}
                    onChange={e => update('nome_responsavel', e.target.value)}
                    maxLength={80}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-gray text-xs font-medium block mb-1.5">Telefone *</label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={e => update('telefone', maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="text-gray text-xs font-medium block mb-1.5">E-mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  maxLength={120}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Etapa 2: Endereço */}
          {etapa === 'endereco' && (
            <>
              <h2 className="text-pulso font-bold text-xs uppercase tracking-wider">Endereço</h2>

              <div>
                <label className="text-gray text-xs font-medium block mb-1.5">CEP</label>
                <input
                  type="text"
                  value={form.cep}
                  onChange={e => update('cep', maskCEP(e.target.value))}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  className={`${inputClass} max-w-[200px]`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-gray text-xs font-medium block mb-1.5">Rua / Avenida</label>
                  <input
                    type="text"
                    value={form.endereco}
                    onChange={e => update('endereco', e.target.value)}
                    maxLength={150}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-gray text-xs font-medium block mb-1.5">Número</label>
                  <input
                    type="text"
                    value={form.numero}
                    onChange={e => update('numero', e.target.value)}
                    maxLength={10}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-gray text-xs font-medium block mb-1.5">Bairro</label>
                  <input
                    type="text"
                    value={form.bairro}
                    onChange={e => update('bairro', e.target.value)}
                    maxLength={80}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-gray text-xs font-medium block mb-1.5">Cidade</label>
                  <input
                    type="text"
                    value={form.cidade}
                    onChange={e => update('cidade', e.target.value)}
                    maxLength={60}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-gray text-xs font-medium block mb-1.5">UF</label>
                  <input
                    type="text"
                    value={form.estado}
                    onChange={e => update('estado', e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
                    maxLength={2}
                    className={`${inputClass} uppercase`}
                  />
                </div>
              </div>
            </>
          )}

          {/* Etapa 3: Acesso e pagamento */}
          {etapa === 'acesso' && (
            <>
              <h2 className="text-pulso font-bold text-xs uppercase tracking-wider">Acesso</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray text-xs font-medium block mb-1.5">Senha *</label>
                  <input
                    type="password"
                    value={form.senha}
                    onChange={e => update('senha', e.target.value)}
                    maxLength={50}
                    placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 número"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-gray text-xs font-medium block mb-1.5">Confirmar senha *</label>
                  <input
                    type="password"
                    value={form.confirmar_senha}
                    onChange={e => update('confirmar_senha', e.target.value)}
                    maxLength={50}
                    className={inputClass}
                  />
                </div>
              </div>

              <h2 className="text-pulso font-bold text-xs uppercase tracking-wider pt-2">Pagamento</h2>
              <div className="bg-secondary/40 border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-clareza font-semibold text-sm">Plano Mensal</p>
                  <p className="text-gray text-xs">Acesso completo ao sistema</p>
                </div>
                <p className="text-pulso font-black text-xl">R$89,90</p>
              </div>

              <p className="text-gray text-[11px] -mt-2">
                A cobrança é feita agora, no cartão informado abaixo. Trabalhamos só com cartão de crédito — sem período grátis.
              </p>

              <div>
                <label className="text-gray text-xs font-medium block mb-1.5">Número do cartão *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={form.cartao_numero}
                  onChange={e => update('cartao_numero', maskCartaoNumero(e.target.value))}
                  placeholder="0000 0000 0000 0000"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-gray text-xs font-medium block mb-1.5">Nome impresso no cartão *</label>
                <input
                  type="text"
                  autoComplete="cc-name"
                  value={form.cartao_nome}
                  onChange={e => update('cartao_nome', e.target.value.toUpperCase())}
                  maxLength={80}
                  placeholder="Como está no cartão"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray text-xs font-medium block mb-1.5">Validade (MM/AAAA) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={form.cartao_validade}
                    onChange={e => update('cartao_validade', maskCartaoValidade(e.target.value))}
                    placeholder="MM/AAAA"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-gray text-xs font-medium block mb-1.5">CVV *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={form.cartao_cvv}
                    onChange={e => update('cartao_cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="000"
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          {/* Erro */}
          {erro && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-3">
              <p className="text-danger text-sm">{erro}</p>
            </div>
          )}

          {/* Navegação */}
          <div className="flex items-center gap-3 pt-2">
            {etapa !== 'dados' && (
              <button
                type="button"
                onClick={voltarEtapa}
                className="h-14 px-6 border border-border text-clareza font-bold rounded-xl hover:bg-secondary transition-colors"
              >
                Voltar
              </button>
            )}
            {etapa !== 'acesso' ? (
              <button
                key="continuar"
                type="button"
                onClick={irParaProximaEtapa}
                className="flex-1 h-14 bg-pulso text-white font-bold text-lg rounded-xl hover:scale-[1.01] active:scale-95 transition-transform"
              >
                Continuar
              </button>
            ) : (
              <button
                key="finalizar"
                type="submit"
                disabled={loading}
                className="flex-1 h-14 bg-pulso text-white font-bold text-lg rounded-xl hover:scale-[1.01] active:scale-95 transition-transform disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading ? 'Cadastrando...' : 'Finalizar cadastro'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
