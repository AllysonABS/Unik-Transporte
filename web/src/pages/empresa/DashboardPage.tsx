import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Truck, Map, Package, Navigation, Clock, CheckCircle, Inbox } from 'lucide-react';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { getDashboard } from '@/services/dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import StatusBadge from '@/components/empresa/StatusBadge';
import PedidoDetailSheet from '@/components/empresa/PedidoDetailSheet';
import type { PedidoData } from '@/types/empresa';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function DashboardPage() {
  const { empresa } = useEmpresaAuth();
  const [detalhe, setDetalhe] = useState<PedidoData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', empresa?.id],
    queryFn: () => getDashboard(empresa!.id),
    enabled: !!empresa?.id,
  });

  const pedidos = data?.pedidos ?? [];
  const stats = data?.stats;

  const hoje = new Date().toDateString();
  const pedidosHoje = pedidos.filter(p => new Date(p.criado_em).toDateString() === hoje);
  const emTransito = pedidos.filter(p => p.status === 'em_transito').length;
  const aguardando = pedidos.filter(p => p.status === 'aguardando').length;
  const entreguesHoje = pedidosHoje.filter(p => p.status === 'entregue').length;
  const recentes = pedidos.slice(0, 5);

  const statCards = [
    { label: 'Clientes ativos', value: stats?.total_clientes ?? 0, icon: Users, color: '#00E676' },
    { label: 'Despachantes', value: stats?.total_despachantes ?? 0, icon: Truck, color: '#60A5FA' },
    { label: 'Excursões', value: stats?.total_excursoes ?? 0, icon: Map, color: '#F59E0B' },
    { label: 'Pedidos hoje', value: pedidosHoje.length, icon: Package, color: '#C084FC' },
  ];

  const statusCards = [
    { label: 'Em trânsito', value: emTransito, icon: Navigation, color: '#00E676' },
    { label: 'Aguardando', value: aguardando, icon: Clock, color: '#F59E0B' },
    { label: 'Entregues hoje', value: entreguesHoje, icon: CheckCircle, color: '#86EFAC' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-gray">{getGreeting()}</p>
        <h1 className="text-2xl font-bold text-clareza">{empresa?.nome_empresa}</h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map(item => (
              <Card key={item.label} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                    <span className="text-2xl font-extrabold" style={{ color: item.color }}>
                      {item.value}
                    </span>
                  </div>
                  <p className="text-xs text-gray font-medium mt-2">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <h2 className="text-xs uppercase tracking-widest text-gray font-semibold mb-3">
              Status dos pedidos
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {statusCards.map(item => (
                <Card key={item.label} className="bg-card border-border">
                  <CardContent className="p-4 flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" style={{ color: item.color }} />
                      <span className="text-xl font-extrabold" style={{ color: item.color }}>
                        {item.value}
                      </span>
                    </div>
                    <p className="text-xs text-gray font-medium text-center">{item.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs uppercase tracking-widest text-gray font-semibold mb-3">
              Pedidos recentes
            </h2>
            {recentes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-gray">
                <Inbox className="h-8 w-8" />
                <p className="text-sm">Nenhum pedido criado ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentes.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setDetalhe(p)}
                    className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:border-pulso/30 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-clareza">
                        #{p.numero} · {p.cliente_nome}
                      </p>
                      <p className="text-xs text-gray mt-0.5">{p.excursao_nome}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <PedidoDetailSheet pedido={detalhe} onOpenChange={open => !open && setDetalhe(null)} />
    </div>
  );
}
