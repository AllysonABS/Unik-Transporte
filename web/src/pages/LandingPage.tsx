import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

const CONTATO_EMAIL = 'suporte.unikcrm@gmail.com';

export default function LandingPage() {
  const navigate = useNavigate();
  const [faqAberta, setFaqAberta] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-matriz text-clareza overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-matriz/70 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-5 md:px-16 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <img src="/Logo.png" alt="Unik Logística" className="w-10 h-10 rounded-xl shadow-lg shadow-pulso/20" />
            <span className="text-xl font-bold tracking-tight">
              Unik <span className="text-gray-400">Logística</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/empresa/login')}
              className="hidden sm:block text-clareza/80 font-semibold px-4 py-2.5 text-sm hover:text-pulso transition-colors duration-300"
            >
              Já sou cliente
            </button>
            <button
              onClick={() => navigate('/cadastro')}
              className="bg-[linear-gradient(135deg,#3B82F6,#0B1E5A)] text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-[0_0_40px_rgba(59,130,246,0.5),0_4px_20px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-100 transition-all duration-300"
            >
              Criar conta
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-5 md:px-16 pt-32 pb-20 md:pt-44 md:pb-28 max-w-7xl mx-auto">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-pulso/5 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-32 right-0 w-[300px] h-[300px] bg-indigo/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.12] mb-7 tracking-tight">
            A forma mais rápida de{' '}
            <span className="bg-gradient-to-r from-pulso via-emerald-300 to-teal-400 bg-clip-text text-transparent">
              enviar os comprovantes
            </span>{' '}
            após
            <br />cada entrega.
          </h1>

          <p className="text-base md:text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            O Unik Logística centraliza todo o processo, aciona o entregador certo e <strong className="text-clareza font-semibold">confirma cada entrega com foto</strong>, tudo em tempo real.
            Chega de pedir comprovante de entrega e torcer pra ninguém esquecer de mandar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <button
              onClick={() => navigate('/cadastro')}
              className="w-full sm:w-auto bg-[linear-gradient(135deg,#3B82F6,#0B1E5A)] text-white font-bold text-base px-10 py-4 rounded-xl shadow-[0_0_40px_rgba(59,130,246,0.5),0_4px_20px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-100 transition-all duration-300"
            >
              Criar minha conta →
            </button>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-5 md:px-16 py-20 md:py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#081544] to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-pulso text-xs font-bold uppercase tracking-widest">Como funciona</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-3 tracking-tight">
              Seu envio sem burocracia
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { n: '1', title: 'Entrada do pedido', desc: 'O cliente faz o pedido no sistema ou a sua empresa cadastra diretamente na plataforma em segundos.' },
              { n: '2', title: 'Coleta e conferência', desc: 'O entregador recebe a notificação no app, confere os itens no local e aceita a corrida.' },
              { n: '3', title: 'Entrega com comprovante', desc: 'O pedido é entregue na excursão e o cliente recebe a confirmação com o comprovante no WhatsApp.' },
            ].map(step => (
              <div key={step.n} className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                <span className="text-4xl font-black text-pulso/25">{step.n}</span>
                <h3 className="text-base font-bold mt-3 mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problema / Dor */}
      <section className="px-5 md:px-16 py-20 md:py-24">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-pulso text-xs font-bold uppercase tracking-widest">O problema</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3 mb-6 tracking-tight leading-tight">
              Sem sistema, cada entrega é uma aposta
            </h2>
            <div className="space-y-4">
              {[
                'A excursão não espera se atrasar, o cliente vai embora sem a encomenda.',
                'Comprovante não chega a tempo e o cliente diz "não recebi nada".',
                'Entregador avulso, combinado por telefone, sem histórico de nada.',
                'Cliente errado, excursão errada e a culpa sempre cai na loja.',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-400 text-[11px]">✕</span>
                  </span>
                  <p className="text-gray-300 text-sm md:text-base">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-pulso/25 to-pulso/5 border border-pulso/40 rounded-2xl p-8">
            <span className="text-pulso text-xs font-bold uppercase tracking-widest">Com o Unik Logística</span>
            <div className="space-y-4 mt-6">
              {[
                'Pedido feito, entregador acionado, pedido enviado e registrado em um só lugar.',
                'Foto de confirmação em cada entrega, segurança para você e seu cliente.',
                'Tenha o histórico do entregador, desempenho e disponibilidade visíveis.',
                'Cliente avisado automaticamente por WhatsApp quando a entrega acontece.',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full bg-pulso/15 border border-pulso/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-pulso text-[11px] font-bold">✓</span>
                  </span>
                  <p className="text-clareza text-sm md:text-base">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-5 md:px-16 py-20 md:py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#081544] to-transparent pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-14 md:mb-16">
            <span className="text-pulso text-xs font-bold uppercase tracking-widest">Funcionalidades</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-3 tracking-tight">
              Tudo que sua loja precisa
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {[
              { icon: '📦', title: 'Gestão de pedidos', desc: 'Crie o pedido em segundos e acompanhe a linha do tempo completa até a entrega.' },
              { icon: '🧾', title: 'Foto de confirmação', desc: 'Toda entrega fecha com uma foto anexada ao pedido.' },
              { icon: '🛵', title: 'Rede de entregadores', desc: 'Entregadores autônomos criam a própria conta no app você só vincula pelo CPF, sem contratar ninguém.' },
              { icon: '🗺️', title: 'Excursões e rotas', desc: 'Organize setor, vaga e responsável de cada excursão que passa pela sua loja.' },
              { icon: '💬', title: 'Aviso automático no WhatsApp', desc: 'O cliente recebe a confirmação de entrega direto no WhatsApp.' },
              { icon: '📊', title: 'Relatórios', desc: 'Taxa de entrega, tempo médio e ranking de entregador.' },
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

      {/* Entregador autônomo — diferencial */}
      <section className="px-5 md:px-16 py-20 md:py-24">
        <div className="max-w-5xl mx-auto bg-white/[0.03] border border-white/[0.06] rounded-[28px] p-8 md:p-12 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-pulso text-xs font-bold uppercase tracking-widest">Sem contratar ninguém</span>
            <h2 className="text-2xl md:text-3xl font-bold mt-3 mb-4 tracking-tight leading-tight">
              Seus entregadores já podem estar no app
            </h2>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-5">
              O entregador cria a própria conta no app de graça, sozinho, quando quiser. Você não cadastra senha
              de ninguém: só busca o CPF que ele te passou e vincula à sua loja. Um mesmo entregador pode atender
              várias lojas ao mesmo tempo.
            </p>
            <button
              onClick={() => navigate('/cadastro')}
              className="text-pulso font-semibold text-sm hover:underline"
            >
              Comece a vincular entregadores →
            </button>
          </div>
          <div className="space-y-3">
            {[
              { n: '01', label: 'Entregador baixa o app e cria a conta' },
              { n: '02', label: 'Passa o CPF pra você, por WhatsApp ou pessoalmente' },
              { n: '03', label: 'Você busca o CPF no painel e vincula' },
              { n: '04', label: 'Pronto ele já vê os pedidos da sua loja na fila dele' },
            ].map(s => (
              <div key={s.n} className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-3.5">
                <span className="text-pulso font-black text-sm">{s.n}</span>
                <span className="text-gray-300 text-sm">{s.label}</span>
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
            <p className="text-gray-400 mt-4 text-sm md:text-base">Um preço fixo por loja. Nunca cobramos por entregador vinculado.</p>
          </div>

          <div className="max-w-sm mx-auto relative">
            <div className="absolute inset-0 bg-pulso/10 rounded-[32px] blur-2xl scale-95 pointer-events-none" />

            <div className="relative bg-white/[0.04] border border-pulso/20 rounded-[28px] p-8 md:p-10 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-8">
                <span className="bg-pulso/10 text-pulso text-xs font-bold px-3 py-1.5 rounded-full border border-pulso/20">Plano Único</span>
                <span className="text-gray-500 text-xs">por loja</span>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-gray-400">R$</span>
                  <span className="text-5xl md:text-6xl font-black bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">89</span>
                  <span className="text-2xl font-bold text-gray-300">,90</span>
                  <span className="text-gray-500 text-sm ml-1">/mês</span>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {[
                  'Pedidos ilimitados',
                  'Entregadores ilimitados, sem taxa extra',
                  'Clientes ilimitados',
                  'App gratuito para os entregadores',
                  'Foto de confirmação em toda entrega',
                  'Aviso automático por WhatsApp',
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
                className="w-full bg-[linear-gradient(135deg,#3B82F6,#0B1E5A)] text-white font-bold text-base py-4 rounded-xl shadow-[0_0_40px_rgba(59,130,246,0.5),0_4px_20px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-100 transition-all duration-300"
              >
                Começar agora
              </button>
              <p className="text-center text-gray-500 text-xs mt-4">Pague no cartão. Cancele quando quiser, sem multa.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 md:px-16 py-20 md:py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-pulso text-xs font-bold uppercase tracking-widest">Dúvidas</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3 tracking-tight">Perguntas frequentes</h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Eu pago pelos meus entregadores?',
                a: 'Não. Os entregadores usam o app de graça e você não paga nada por vincular quantos quiser. O plano é único, por loja.',
              },
              {
                q: 'Preciso ter CNPJ pra usar?',
                a: 'Não. Aceitamos cadastro tanto com CNPJ quanto com CPF se você ainda não formalizou sua loja, pode começar mesmo assim.',
              },
              {
                q: 'O entregador precisa ser meu funcionário?',
                a: 'Não. A maioria dos entregadores é autônoma e pode atender várias lojas ao mesmo tempo. Você só vincula pelo CPF que ele te passar.',
              },
              {
                q: 'Como funciona a foto de confirmação?',
                a: 'Quando o entregador marca a entrega como concluída, o app pede uma foto na hora. Ela fica anexada ao pedido.',
              },
              {
                q: 'O cliente final precisa instalar algum app?',
                a: 'Não. O cliente não acessa nada o cadastro dele é feito por você, e ele só recebe um aviso no WhatsApp quando a entrega acontece.',
              },
              {
                q: 'Posso cancelar quando quiser?',
                a: 'Sim, a qualquer momento, sem multa. Você paga no cartão de crédito mês a mês.',
              },
            ].map((faq, i) => {
              const aberta = faqAberta === i;
              return (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFaqAberta(aberta ? null : i)}
                    aria-expanded={aberta}
                    className="w-full flex items-center justify-between gap-4 text-left p-6"
                  >
                    <span className="text-clareza font-semibold text-sm md:text-base">{faq.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 shrink-0 transition-transform duration-300 ${aberta ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${aberta ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-gray-400 text-sm leading-relaxed px-6 pb-6">{faq.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 md:px-16 py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">© {new Date().getFullYear()} Unik Tecnologia. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <a href={`mailto:${CONTATO_EMAIL}`} className="text-gray-500 text-sm hover:text-pulso transition">Fale conosco</a>
            <button onClick={() => navigate('/privacidade')} className="text-gray-500 text-sm hover:text-pulso transition">Privacidade</button>
            <button onClick={() => navigate('/termos')} className="text-gray-500 text-sm hover:text-pulso transition">Termos de Uso</button>
            <button onClick={() => navigate('/exclusao-de-dados')} className="text-gray-500 text-sm hover:text-pulso transition">Exclusão de Dados</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
