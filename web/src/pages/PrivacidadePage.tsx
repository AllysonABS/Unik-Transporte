import { useNavigate } from 'react-router-dom';

export default function PrivacidadePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-matriz text-clareza">
      <header className="fixed top-0 left-0 right-0 z-50 bg-matriz/70 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-5 md:px-16 py-4 max-w-7xl mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80 transition">
            <img src="/Logo.png" alt="Unik Logística" className="w-10 h-10 rounded-xl" />
            <span className="text-xl font-bold tracking-tight">Unik Logística</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 md:px-8 pt-28 pb-20">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-gray text-sm mb-10">Última atualização: Julho de 2025</p>

        <div className="space-y-8 text-gray text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">1. Informações Gerais</h2>
            <p>
              Esta Política de Privacidade descreve como a <strong>Unik Tecnologia</strong> (CPF: 100.136.644-17),
              doravante denominada "Nós", coleta, utiliza, armazena e protege as informações pessoais dos usuários do
              aplicativo e plataforma <strong>Unik Logística</strong>.
            </p>
            <p className="mt-3">
              Ao utilizar o Unik Logística, você concorda com as práticas descritas nesta política, em conformidade com a
              Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e demais legislações aplicáveis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">2. Dados que Coletamos</h2>
            <p>Coletamos os seguintes dados pessoais:</p>
            <ul className="list-disc list-inside mt-3 space-y-2">
              <li><strong>Dados de identificação:</strong> Nome completo, CPF, CNPJ, RG, e-mail, telefone, data de nascimento.</li>
              <li><strong>Dados de endereço:</strong> CEP, logradouro, número, bairro, complemento, cidade, estado.</li>
              <li><strong>Dados de acesso:</strong> Senha (armazenada de forma criptografada com hash bcrypt).</li>
              <li><strong>Dados de uso:</strong> Registros de pedidos, fotos de comprovantes, observações de entregas.</li>
              <li><strong>Dados do dispositivo:</strong> Token de notificações push (FCM) para envio de alertas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">3. Como Utilizamos seus Dados</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Criar e gerenciar sua conta no aplicativo.</li>
              <li>Processar e rastrear pedidos de transporte.</li>
              <li>Enviar notificações sobre status de pedidos.</li>
              <li>Vincular clientes a empresas de transporte.</li>
              <li>Gerar relatórios operacionais para as empresas.</li>
              <li>Enviar códigos de recuperação de senha por e-mail.</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">4. Compartilhamento de Dados</h2>
            <p>Seus dados pessoais podem ser compartilhados com:</p>
            <ul className="list-disc list-inside mt-3 space-y-2">
              <li><strong>Empresas de transporte:</strong> Quando você se vincula a uma loja, ela terá acesso ao seu nome, CPF/CNPJ, telefone e e-mail para gestão de pedidos.</li>
              <li><strong>Entregadores:</strong> Acesso limitado a informações do pedido (nome do cliente, destino, volumes).</li>
              <li><strong>Prestadores de serviço:</strong> Cloudflare (armazenamento de fotos), Google Firebase (notificações push), Gmail SMTP (envio de e-mails).</li>
            </ul>
            <p className="mt-3">Não vendemos, alugamos ou comercializamos seus dados pessoais com terceiros para fins de marketing.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">5. Armazenamento e Segurança</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Senhas são armazenadas com hash criptográfico (bcrypt) — nunca em texto puro.</li>
              <li>Comunicações são protegidas com HTTPS/TLS.</li>
              <li>Autenticação via tokens JWT com expiração.</li>
              <li>Acesso ao banco de dados restrito a usuários com permissões mínimas.</li>
              <li>Headers de segurança implementados (Helmet).</li>
              <li>Proteção contra ataques de força bruta no login.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">6. Seus Direitos (LGPD)</h2>
            <p>Você tem direito a:</p>
            <ul className="list-disc list-inside mt-3 space-y-2">
              <li>Confirmar a existência de tratamento de seus dados.</li>
              <li>Acessar seus dados pessoais.</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
              <li>Solicitar a exclusão de seus dados pessoais.</li>
              <li>Revogar o consentimento a qualquer momento.</li>
              <li>Solicitar a portabilidade dos dados.</li>
            </ul>
            <p className="mt-3">
              Para exercer seus direitos, entre em contato pelo e-mail{' '}
              <a href="mailto:suporte.unikcrm@gmail.com" className="text-pulso hover:underline">suporte.unikcrm@gmail.com</a> ou
              utilize o formulário de exclusão de dados disponível em{' '}
              <a href="/exclusao-de-dados" className="text-pulso hover:underline">transporte.unikcrm.com/exclusao-de-dados</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">7. Retenção de Dados</h2>
            <p>
              Seus dados serão mantidos enquanto sua conta estiver ativa ou pelo tempo necessário para cumprir obrigações legais.
              Após solicitação de exclusão, seus dados serão removidos em até <strong>30 (trinta) dias</strong>, exceto quando houver
              obrigação legal de retenção.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">8. Cookies e Tecnologias</h2>
            <p>
              O aplicativo Unik Logística não utiliza cookies. A versão web pode utilizar armazenamento local (localStorage)
              exclusivamente para manter preferências do usuário.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">9. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Notificaremos os usuários sobre mudanças significativas
              por meio do aplicativo ou e-mail. A data de última atualização será sempre indicada no topo desta página.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">10. Contato</h2>
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

      <footer className="px-5 md:px-16 py-8 border-t border-border text-center">
        <p className="text-gray/70 text-sm">© {new Date().getFullYear()} Unik Tecnologia. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
