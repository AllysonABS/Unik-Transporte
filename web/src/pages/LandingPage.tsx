import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-matriz text-clareza overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-matriz/70 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-5 md:px-16 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pulso to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-pulso/20">
              <span className="text-matriz font-black text-lg">N</span>
            </div>
            <span className="text-xl font-bold tracking-tight">Na Rota</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/empresa/login')}
              className="text-clareza/80 font-semibold px-4 py-2.5 text-sm hover:text-pulso transition-colors duration-300"
            >
              Já é cliente? Entrar
            </button>
            <button
              onClick={() => navigate('/cadastro')}
              className="bg-white/10 border border-white/10 text-clareza font-semibold px-5 py-2.5 rounded-full hover:bg-pulso hover:text-matriz hover:border-pulso transition-all duration-300 text-sm"
            >
              Começar agora
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-5 md:px-16 pt-36 pb-20 md:pt-48 md:pb-32 max-w-7xl mx-auto">
        {/* Glow background */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-pulso/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2 mb-8">
            <span className="w-2 h-2 bg-pulso rounded-full animate-pulse" />
            <span className="text-gray-300 text-xs md:text-sm font-medium">Gestão completa por apenas R$69,90/mês</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-[1.1] mb-8 tracking-tight">
            Gerencie suas{' '}
            <span className="bg-gradient-to-r from-pulso via-emerald-300 to-teal-400 bg-clip-text text-transparent">
              expedições
            </span>
            <br />de forma inteligente
          </h1>

          <p className="text-base md:text-lg text-gray-400 mb-12 max-w-xl mx-auto leading-relaxed">
            Controle pedidos, despachantes, excursões e clientes em um só lugar.
            Acompanhe tudo em tempo real direto do celular.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => navigate('/cadastro')}
              className="w-full sm:w-auto bg-gradient-to-r from-pulso to-emerald-400 text-matriz font-bold text-base px-10 py-4 rounded-full hover:shadow-xl hover:shadow-pulso/25 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Criar minha conta →
            </button>
            <span className="text-gray-500 text-sm">Sem cartão • Cancele quando quiser</span>
          </div>

          {/* Stats inline */}
          <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-lg mx-auto">
            {[
              { value: '100%', label: 'Online' },
              { value: '∞', label: 'Pedidos ilimitados' },
              { value: '24h', label: 'Suporte ativo' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl md:text-3xl font-black bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">{s.value}</p>
                <p className="text-gray-500 text-[11px] md:text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-5 md:px-16 py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1e30] to-transparent pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-14 md:mb-20">
            <span className="text-pulso text-xs font-bold uppercase tracking-widest">Funcionalidades</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-3 tracking-tight">
              Tudo em um só lugar
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {[
              { icon: '📦', title: 'Gestão de Pedidos', desc: 'Crie, acompanhe e gerencie todos os pedidos com timeline em tempo real e fotos.' },
              { icon: '🚚', title: 'Despachantes', desc: 'Atribua pedidos, acompanhe desempenho e veja quem está disponível.' },
              { icon: '👥', title: 'Clientes', desc: 'Cadastro completo com endereço, documentos e histórico de pedidos.' },
              { icon: '🗺️', title: 'Excursões', desc: 'Organize setores, vagas e responsáveis de cada excursão.' },
              { icon: '📊', title: 'Relatórios', desc: 'Taxa de entrega, tempo médio, ranking de despachantes e mais.' },
              { icon: '📱', title: 'App Mobile', desc: 'Seus clientes e despachantes acessam pelo celular com login próprio.' },
            ].map(f => (
              <div key={f.title} className="group relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-7 hover:bg-white/[0.06] hover:border-pulso/20 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-pulso/20 to-pulso/5 border border-pulso/20 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl">{f.icon}</span>
                </div>
                <h3 className="text-base font-bold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-5 md:px-16 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-pulso text-xs font-bold uppercase tracking-widest">Preço</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-3 tracking-tight">Simples e transparente</h2>
            <p className="text-gray-400 mt-4 text-sm md:text-base">Sem taxas escondidas. Sem surpresas na fatura.</p>
          </div>

          <div className="max-w-sm mx-auto relative">
            {/* Glow behind card */}
            <div className="absolute inset-0 bg-pulso/10 rounded-[32px] blur-2xl scale-95 pointer-events-none" />

            <div className="relative bg-white/[0.04] border border-pulso/20 rounded-[28px] p-8 md:p-10 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-8">
                <span className="bg-pulso/10 text-pulso text-xs font-bold px-3 py-1.5 rounded-full border border-pulso/20">Plano Único</span>
                <span className="text-gray-500 text-xs">por empresa</span>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-gray-400">R$</span>
                  <span className="text-5xl md:text-6xl font-black bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">69</span>
                  <span className="text-2xl font-bold text-gray-300">,90</span>
                  <span className="text-gray-500 text-sm ml-1">/mês</span>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {[
                  'Pedidos ilimitados',
                  'Despachantes ilimitados',
                  'Clientes ilimitados',
                  'App para todos os usuários',
                  'Relatórios completos',
                  'Suporte via WhatsApp',
                ].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-pulso/10 border border-pulso/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-pulso text-[10px]">✓</span>
                    </div>
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/cadastro')}
                className="w-full bg-gradient-to-r from-pulso to-emerald-400 text-matriz font-bold text-base py-4 rounded-full hover:shadow-lg hover:shadow-pulso/25 hover:scale-[1.02] active:scale-95 transition-all duration-300"
              >
                Começar agora
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-5 md:px-16 py-16 md:py-24">
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pulso/5 to-blue-500/5 rounded-[32px] blur-xl pointer-events-none" />
          <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-[28px] p-10 md:p-16 text-center backdrop-blur-sm">
            <h2 className="text-2xl md:text-4xl font-bold mb-4 tracking-tight">Pronto para simplificar sua gestão?</h2>
            <p className="text-gray-400 mb-8 text-sm md:text-base max-w-md mx-auto">
              Empresas de transporte já estão economizando tempo e dinheiro com o Na Rota.
            </p>
            <button
              onClick={() => navigate('/cadastro')}
              className="bg-gradient-to-r from-pulso to-emerald-400 text-matriz font-bold text-base px-10 py-4 rounded-full hover:shadow-xl hover:shadow-pulso/25 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Criar minha conta grátis →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 md:px-16 py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">© {new Date().getFullYear()} Norum Tecnologia. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/privacidade')} className="text-gray-500 text-sm hover:text-pulso transition">Privacidade</button>
            <button onClick={() => navigate('/termos')} className="text-gray-500 text-sm hover:text-pulso transition">Termos de Uso</button>
            <button onClick={() => navigate('/exclusao-de-dados')} className="text-gray-500 text-sm hover:text-pulso transition">Exclusão de Dados</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
