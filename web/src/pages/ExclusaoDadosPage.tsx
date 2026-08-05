import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export default function ExclusaoDadosPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');

  const [form, setForm] = useState({
    nome: '',
    documento: '',
    email: '',
    motivo: '',
    confirmacao: false,
  });

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!form.nome || !form.documento || !form.email) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }
    if (!form.confirmacao) {
      setErro('Você deve confirmar que entende que a exclusão é irreversível.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/exclusao-dados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          documento: form.documento.replace(/\D/g, ''),
          email: form.email,
          motivo: form.motivo || 'Não informado',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || 'Erro ao enviar solicitação.');
        setLoading(false);
        return;
      }
      setSucesso(true);
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    }
    setLoading(false);
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-matriz flex items-center justify-center px-5">
        <div className="bg-[#081544] border border-[#0B1E5A] rounded-3xl p-10 md:p-12 text-center max-w-md w-full">
          <span className="text-5xl mb-6 block">✅</span>
          <h1 className="text-2xl font-bold text-clareza mb-4">Solicitação enviada</h1>
          <p className="text-gray-400 mb-4 text-sm">
            Sua solicitação de exclusão de dados foi recebida. Processaremos em até <strong>30 dias úteis</strong>.
          </p>
          <p className="text-gray-400 mb-8 text-sm">
            Você receberá um e-mail de confirmação em <strong>{form.email}</strong> quando a exclusão for concluída.
          </p>
          <button onClick={() => navigate('/')} className="w-full bg-pulso text-clareza font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform">
            Voltar para o início
          </button>
        </div>
      </div>
    );
  }

  const inputClass = "w-full h-12 bg-[#081544] border border-[#0B1E5A] rounded-lg px-4 text-clareza focus:border-pulso focus:ring-1 focus:ring-pulso/30 outline-none transition text-sm";

  return (
    <div className="min-h-screen bg-matriz text-clareza">
      <header className="fixed top-0 left-0 right-0 z-50 bg-matriz/70 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-5 md:px-16 py-4 max-w-7xl mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80 transition">
            <img src="/Logo.png" alt="Unik Transporte" className="w-10 h-10 rounded-xl" />
            <span className="text-xl font-bold tracking-tight">Unik Transporte</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 md:px-8 pt-28 pb-20">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Exclusão de Dados</h1>
        <p className="text-gray-400 text-sm mb-10">
          Preencha o formulário abaixo para solicitar a exclusão completa dos seus dados pessoais da plataforma Unik Transporte.
        </p>

        <div className="bg-[#081544] border border-[#0B1E5A] rounded-2xl p-6 md:p-8 mb-8">
          <h2 className="text-pulso font-bold text-xs uppercase tracking-wider mb-4">⚠️ Informações Importantes</h2>
          <ul className="text-gray-400 text-sm space-y-3">
            <li>• A exclusão é <strong className="text-clareza">irreversível</strong>. Todos os seus dados serão permanentemente removidos.</li>
            <li>• Serão excluídos: dados pessoais, histórico de pedidos, fotos, vínculos com empresas e tokens de acesso.</li>
            <li>• O prazo para conclusão é de até <strong className="text-clareza">30 dias úteis</strong>.</li>
            <li>• Dados que precisamos manter por obrigação legal (fiscal/contábil) serão anonimizados.</li>
            <li>• Após a exclusão, você não poderá recuperar sua conta.</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#081544] border border-[#0B1E5A] rounded-2xl p-6 md:p-8 space-y-5">
          <h2 className="text-pulso font-bold text-xs uppercase tracking-wider">Dados para Identificação</h2>

          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1.5">Nome completo *</label>
            <input
              type="text"
              value={form.nome}
              onChange={e => update('nome', e.target.value)}
              placeholder="Seu nome completo"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1.5">CPF ou CNPJ *</label>
            <input
              type="text"
              value={form.documento}
              onChange={e => update('documento', maskCpfCnpj(e.target.value))}
              placeholder="000.000.000-00"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1.5">E-mail cadastrado *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="seu@email.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1.5">Motivo da exclusão (opcional)</label>
            <textarea
              value={form.motivo}
              onChange={e => update('motivo', e.target.value)}
              placeholder="Conte-nos o motivo da sua solicitação..."
              rows={3}
              className={`${inputClass} h-auto py-3 resize-none`}
            />
          </div>

          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="confirmacao"
              checked={form.confirmacao}
              onChange={e => update('confirmacao', e.target.checked)}
              className="mt-1 w-4 h-4 accent-pulso"
            />
            <label htmlFor="confirmacao" className="text-gray-400 text-sm">
              Eu entendo que esta ação é <strong className="text-clareza">irreversível</strong> e que todos os meus dados serão permanentemente excluídos da plataforma Unik Transporte.
            </label>
          </div>

          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{erro}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-red-500 text-white font-bold text-base rounded-xl hover:bg-red-600 active:scale-95 transition-all disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? 'Enviando...' : 'Solicitar Exclusão de Dados'}
          </button>
        </form>

        <p className="text-gray-500 text-xs text-center mt-6">
          Em caso de dúvidas, entre em contato: <a href="mailto:norumtecnologia@gmail.com" className="text-pulso hover:underline">norumtecnologia@gmail.com</a>
        </p>
      </main>

      <footer className="px-5 md:px-16 py-8 border-t border-white/5 text-center">
        <p className="text-gray-600 text-sm">© {new Date().getFullYear()} Unik Tecnologia. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
