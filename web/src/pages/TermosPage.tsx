import { useNavigate } from 'react-router-dom';

export default function TermosPage() {
  const navigate = useNavigate();

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

      <main className="max-w-3xl mx-auto px-5 md:px-8 pt-28 pb-20">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-gray-400 text-sm mb-10">Última atualização: Julho de 2025</p>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao criar uma conta ou utilizar o aplicativo <strong>Unik Transporte</strong>, você declara que leu, compreendeu e concorda
              com estes Termos de Uso. Caso não concorde, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">2. Descrição do Serviço</h2>
            <p>
              O Unik Transporte é uma plataforma de gestão de expedições e transporte que permite a empresas:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2">
              <li>Gerenciar pedidos de transporte com rastreamento em tempo real.</li>
              <li>Cadastrar e gerenciar clientes, entregadores e excursões.</li>
              <li>Enviar notificações push sobre status de pedidos.</li>
              <li>Registrar comprovantes fotográficos de coleta e entrega.</li>
              <li>Gerar relatórios operacionais.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">3. Tipos de Usuários</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Empresa:</strong> Pessoa jurídica que contrata o serviço para gerenciar suas expedições.</li>
              <li><strong>Entregador:</strong> Colaborador cadastrado pela empresa para realizar coletas e entregas.</li>
              <li><strong>Cliente:</strong> Pessoa física ou jurídica que recebe serviços de transporte da empresa.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">4. Cadastro e Conta</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Você deve fornecer informações verdadeiras, completas e atualizadas.</li>
              <li>Você é responsável por manter a segurança de sua senha.</li>
              <li>A senha deve conter no mínimo 8 caracteres, incluindo 1 letra maiúscula e 1 número.</li>
              <li>Cada CPF/CNPJ pode ter apenas uma conta ativa.</li>
              <li>Contas de entregadores são criadas pelas empresas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">5. Assinatura e Pagamento</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>O plano custa <strong>R$ 69,90/mês</strong> por empresa.</li>
              <li>O primeiro período de 30 dias é concedido automaticamente no cadastro.</li>
              <li>Inclui pedidos, clientes, entregadores e excursões ilimitados.</li>
              <li>Clientes e entregadores utilizam o app gratuitamente.</li>
              <li>A empresa pode cancelar a assinatura a qualquer momento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">6. Obrigações do Usuário</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Não utilizar o serviço para fins ilícitos.</li>
              <li>Não compartilhar credenciais de acesso com terceiros.</li>
              <li>Não enviar conteúdo ofensivo, ilegal ou que viole direitos de terceiros nas fotos e observações.</li>
              <li>Manter seus dados cadastrais atualizados.</li>
              <li>Não tentar acessar dados de outros usuários sem autorização.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">7. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo do aplicativo Unik Transporte (código, design, marca, textos) é propriedade da Unik Tecnologia.
              É proibida a reprodução, modificação ou distribuição sem autorização expressa.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">8. Limitação de Responsabilidade</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>O Unik Transporte é uma ferramenta de gestão e não se responsabiliza pela execução física do transporte.</li>
              <li>Não garantimos disponibilidade ininterrupta do serviço (manutenções podem ocorrer).</li>
              <li>Não somos responsáveis por perdas decorrentes de uso indevido de credenciais pelo usuário.</li>
              <li>A responsabilidade máxima da Unik Tecnologia é limitada ao valor pago pelo usuário no último mês.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">9. Suspensão e Encerramento</h2>
            <p>Podemos suspender ou encerrar sua conta nos seguintes casos:</p>
            <ul className="list-disc list-inside mt-3 space-y-2">
              <li>Violação destes termos de uso.</li>
              <li>Inadimplência da assinatura.</li>
              <li>Uso fraudulento ou abusivo da plataforma.</li>
              <li>Solicitação do próprio usuário.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">10. Exclusão de Dados</h2>
            <p>
              Você pode solicitar a exclusão de seus dados a qualquer momento através do formulário disponível em{' '}
              <a href="/exclusao-de-dados" className="text-pulso hover:underline">transporte.unikcrm.com/exclusao-de-dados</a> ou
              pelo e-mail <a href="mailto:suporte.unikcrm@gmail.com" className="text-pulso hover:underline">suporte.unikcrm@gmail.com</a>.
              A exclusão será processada em até 30 dias.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">11. Alterações nos Termos</h2>
            <p>
              Reservamo-nos o direito de alterar estes termos a qualquer momento. Alterações significativas serão
              comunicadas através do aplicativo. O uso continuado após alterações implica aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">12. Legislação Aplicável</h2>
            <p>
              Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de
              Caruaru/PE para dirimir quaisquer questões decorrentes destes termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">13. Contato</h2>
            <p>
              <strong>Unik Tecnologia</strong><br />
              CPF: 100.136.644-17<br />
              Rua Maria de Lourdes Case Porto, 51 — Sala 810<br />
              Mauricio de Nassau, Caruaru/PE — CEP: 55012-075<br />
              E-mail: <a href="mailto:suporte.unikcrm@gmail.com" className="text-pulso hover:underline">suporte.unikcrm@gmail.com</a>
            </p>
          </section>
        </div>
      </main>

      <footer className="px-5 md:px-16 py-8 border-t border-white/5 text-center">
        <p className="text-gray-600 text-sm">© {new Date().getFullYear()} Unik Tecnologia. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
