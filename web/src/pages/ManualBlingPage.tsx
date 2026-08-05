import { useNavigate } from 'react-router-dom';

export default function ManualBlingPage() {
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
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Manual — Integração com o Bling</h1>
        <p className="text-gray-400 text-sm mb-10">Como conectar e usar a integração Unik Transporte + Bling</p>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">O que essa integração faz</h2>
            <p>
              O Unik Transporte organiza a entrega de pedidos até o ônibus de uma excursão, antes dela partir.
              Conectando sua conta do Bling, os pedidos de venda que você já cadastra por lá caem automaticamente
              no painel do Unik Transporte — junto com os dados do cliente — sem precisar digitar nada de novo.
              Você só completa duas informações que o Bling não tem: <strong className="text-clareza">qual excursão</strong> e{' '}
              <strong className="text-clareza">qual entregador</strong> vai levar aquele pedido.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">1. Conectar sua conta do Bling</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Acesse o painel do Unik Transporte e faça login com a conta da sua empresa.</li>
              <li>Vá em <strong className="text-clareza">Configurações</strong> → seção <strong className="text-clareza">Integração com o Bling</strong>.</li>
              <li>Clique em <strong className="text-clareza">Conectar Bling</strong> — você será levado pra tela de autorização do próprio Bling.</li>
              <li>Faça login na sua conta Bling e autorize o acesso.</li>
              <li>Você volta automaticamente pro Unik Transporte com a integração já ativa.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">2. Como os pedidos chegam</h2>
            <p>
              A cada poucos minutos, o Unik Transporte verifica se há pedidos novos ou atualizados no Bling.
              Cada pedido encontrado entra numa fila chamada <strong className="text-clareza">Pedidos importados</strong>,
              disponível no menu lateral do painel. O cliente do pedido é localizado ou cadastrado automaticamente
              (por CPF/CNPJ ou telefone), sem duplicar cadastro.
            </p>
            <p className="mt-3">
              Se precisar forçar uma busca imediata (sem esperar o ciclo automático), use o botão{' '}
              <strong className="text-clareza">Sincronizar agora</strong> na mesma tela de Configurações.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">3. Completar o pedido</h2>
            <p>Na tela de Pedidos importados, cada linha mostra o número do pedido (o mesmo número do Bling), o cliente e os itens. Clique em <strong className="text-clareza">Completar pedido</strong> para:</p>
            <ul className="list-disc list-inside mt-3 space-y-2">
              <li>Escolher o <strong className="text-clareza">entregador</strong> responsável pela coleta e entrega.</li>
              <li>Escolher a <strong className="text-clareza">excursão</strong> em que o pedido vai embarcar.</li>
              <li>Conferir volumes e descrição (já vêm preenchidos, mas dá pra ajustar).</li>
            </ul>
            <p className="mt-3">
              Ao confirmar, o pedido sai da fila de importação e vira um pedido de verdade — visível na aba{' '}
              <strong className="text-clareza">Despachos</strong> e já disponível pro entregador no aplicativo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">4. Número do pedido</h2>
            <p>
              Todo pedido importado do Bling carrega o número original do pedido de venda — o mesmo que aparece
              no Bling e pode ser anotado fisicamente no volume/etiqueta. Esse número fica visível tanto na fila de
              importação quanto na lista de Despachos, facilitando identificar qual volume é qual quando há mais
              de um pacote por pedido.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">Desconectar</h2>
            <p>
              Em Configurações → Integração com o Bling, o botão <strong className="text-clareza">Desconectar</strong> revoga
              o acesso a qualquer momento. Pedidos já importados não são apagados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-clareza mb-3">Suporte</h2>
            <p>
              Dúvidas sobre a integração: <a href="mailto:suporte.unikcrm@gmail.com" className="text-pulso hover:underline">suporte.unikcrm@gmail.com</a>.
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
