import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Masks
const maskCNPJ = (v: string) => v.replace(/\D/g, '').slice(0, 14)
  .replace(/^(\d{2})(\d)/, '$1.$2')
  .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
  .replace(/\.(\d{3})(\d)/, '.$1/$2')
  .replace(/(\d{4})(\d)/, '$1-$2');

const maskPhone = (v: string) => v.replace(/\D/g, '').slice(0, 11)
  .replace(/^(\d{2})(\d)/, '($1) $2')
  .replace(/(\d{5})(\d)/, '$1-$2');

const maskCEP = (v: string) => v.replace(/\D/g, '').slice(0, 8)
  .replace(/^(\d{5})(\d)/, '$1-$2');

export default function CadastroPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');

  const [form, setForm] = useState({
    nome_empresa: '',
    cnpj: '',
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
    cep: ''
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!form.nome_empresa || !form.cnpj || !form.email || !form.senha || !form.nome_responsavel || !form.telefone) {
      setErro('Preencha todos os campos obrigatórios.'); return;
    }
    if (form.cnpj.replace(/\D/g, '').length !== 14) {
      setErro('CNPJ deve ter 14 dígitos.'); return;
    }
    if (form.telefone.replace(/\D/g, '').length < 10) {
      setErro('Telefone inválido.'); return;
    }
    if (form.senha !== form.confirmar_senha) {
      setErro('As senhas não coincidem.'); return;
    }
    if (form.senha.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.'); return;
    }
    if (!/[A-Z]/.test(form.senha)) {
      setErro('A senha deve conter ao menos uma letra maiúscula.'); return;
    }
    if (!/[0-9]/.test(form.senha)) {
      setErro('A senha deve conter ao menos um número.'); return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, cnpj: form.cnpj.replace(/\D/g, '') }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || 'Erro ao cadastrar.'); setLoading(false); return; }
      setSucesso(true);
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    }
    setLoading(false);
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-matriz flex items-center justify-center px-5">
        <div className="bg-[#162433] border border-[#1E3448] rounded-3xl p-10 md:p-12 text-center max-w-md w-full">
          <span className="text-5xl mb-6 block">🎉</span>
          <h1 className="text-2xl font-bold text-clareza mb-4">Cadastro realizado!</h1>
          <p className="text-gray-400 mb-8 text-sm md:text-base">Sua conta foi criada com sucesso. Use seu e-mail e senha para acessar o aplicativo Na Rota.</p>
          <button onClick={() => navigate('/')} className="w-full bg-pulso text-matriz font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform">
            Voltar para o início
          </button>
        </div>
      </div>
    );
  }

  const inputClass = "w-full h-12 bg-[#0F1F2E] border border-[#1E3448] rounded-lg px-4 text-clareza focus:border-pulso focus:ring-1 focus:ring-pulso/30 outline-none transition text-sm";

  return (
    <div className="min-h-screen bg-matriz py-8 md:py-12 px-5">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <button onClick={() => navigate('/')} className="text-pulso text-sm font-semibold mb-4 inline-flex items-center gap-1 hover:underline">
            ← Voltar ao início
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-clareza mb-2">Criar sua conta</h1>
          <p className="text-gray-400 text-sm md:text-base">Preencha os dados da sua empresa para começar.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#162433] border border-[#1E3448] rounded-2xl p-6 md:p-8 space-y-6">
          {/* Empresa */}
          <h2 className="text-pulso font-bold text-xs uppercase tracking-wider">Dados da Empresa</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs font-medium block mb-1.5">Nome da empresa *</label>
              <input
                type="text"
                value={form.nome_empresa}
                onChange={e => update('nome_empresa', e.target.value)}
                maxLength={100}
                className={inputClass}
              />
              <span className="text-gray-600 text-[10px] mt-0.5 block text-right">{form.nome_empresa.length}/100</span>
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium block mb-1.5">CNPJ *</label>
              <input
                type="text"
                value={form.cnpj}
                onChange={e => update('cnpj', maskCNPJ(e.target.value))}
                placeholder="00.000.000/0001-00"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs font-medium block mb-1.5">Nome do responsável *</label>
              <input
                type="text"
                value={form.nome_responsavel}
                onChange={e => update('nome_responsavel', e.target.value)}
                maxLength={80}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium block mb-1.5">Telefone *</label>
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
            <label className="text-gray-400 text-xs font-medium block mb-1.5">E-mail *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              maxLength={120}
              className={inputClass}
            />
          </div>

          {/* Endereço */}
          <h2 className="text-pulso font-bold text-xs uppercase tracking-wider pt-2">Endereço</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-gray-400 text-xs font-medium block mb-1.5">Cidade</label>
              <input
                type="text"
                value={form.cidade}
                onChange={e => update('cidade', e.target.value)}
                maxLength={60}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium block mb-1.5">UF</label>
              <input
                type="text"
                value={form.estado}
                onChange={e => update('estado', e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
                maxLength={2}
                className={`${inputClass} uppercase`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-gray-400 text-xs font-medium block mb-1.5">Rua / Avenida</label>
              <input
                type="text"
                value={form.endereco}
                onChange={e => update('endereco', e.target.value)}
                maxLength={150}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium block mb-1.5">CEP</label>
              <input
                type="text"
                value={form.cep}
                onChange={e => update('cep', maskCEP(e.target.value))}
                placeholder="00000-000"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs font-medium block mb-1.5">Número</label>
              <input
                type="text"
                value={form.numero}
                onChange={e => update('numero', e.target.value)}
                maxLength={10}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium block mb-1.5">Bairro</label>
              <input
                type="text"
                value={form.bairro}
                onChange={e => update('bairro', e.target.value)}
                maxLength={80}
                className={inputClass}
              />
            </div>
          </div>

          {/* Acesso */}
          <h2 className="text-pulso font-bold text-xs uppercase tracking-wider pt-2">Acesso</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs font-medium block mb-1.5">Senha *</label>
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
              <label className="text-gray-400 text-xs font-medium block mb-1.5">Confirmar senha *</label>
              <input
                type="password"
                value={form.confirmar_senha}
                onChange={e => update('confirmar_senha', e.target.value)}
                maxLength={50}
                className={inputClass}
              />
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{erro}</p>
            </div>
          )}

          {/* Plano */}
          <div className="bg-[#0F1F2E] border border-[#1E3448] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-clareza font-semibold text-sm">Plano Mensal</p>
              <p className="text-gray-400 text-xs">Acesso completo ao sistema</p>
            </div>
            <p className="text-pulso font-black text-xl">R$69,90</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-pulso text-matriz font-bold text-lg rounded-xl hover:scale-[1.01] active:scale-95 transition-transform disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? 'Cadastrando...' : 'Finalizar cadastro'}
          </button>
        </form>
      </div>
    </div>
  );
}
