import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { useSetPageHeader } from '@/hooks/useSetPageHeader';
import { listarPedidosEmpresa } from '@/services/pedidos';
import { listarDespachantes } from '@/services/despachantes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Periodo = 'hoje' | 'semana' | 'mes';

const periodos: { value: Periodo; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
];

function inicioPeriodo(periodo: Periodo): Date {
  const agora = new Date();
  if (periodo === 'hoje') {
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  }
  if (periodo === 'semana') {
    const inicio = new Date(agora);
    inicio.setDate(agora.getDate() - 7);
    return inicio;
  }
  const inicio = new Date(agora);
  inicio.setDate(agora.getDate() - 30);
  return inicio;
}

export default function RelatoriosPage() {
  const { empresa } = useEmpresaAuth();
  useSetPageHeader('Relatórios', 'Acompanhe o desempenho da operação');
  const [periodo, setPeriodo] = useState<Periodo>('hoje');

  const { data: pedidosData, isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos', empresa?.id],
    queryFn: () => listarPedidosEmpresa(empresa!.id),
    enabled: !!empresa?.id,
  });
  const { data: despachantesData, isLoading: loadingDespachantes } = useQuery({
    queryKey: ['despachantes', empresa?.id],
    queryFn: () => listarDespachantes(empresa!.id),
    enabled: !!empresa?.id,
  });

  const isLoading = loadingPedidos || loadingDespachantes;
  const pedidos = pedidosData?.pedidos ?? [];
  const despachantes = despachantesData?.despachantes ?? [];

  const filtrados = useMemo(() => {
    const inicio = inicioPeriodo(periodo);
    return pedidos.filter(p => new Date(p.criado_em) >= inicio);
  }, [pedidos, periodo]);

  const totalPedidos = filtrados.length;
  const entregues = filtrados.filter(p => p.status === 'entregue').length;
  const aguardando = filtrados.filter(p => p.status === 'aguardando').length;
  const emTransito = filtrados.filter(p => p.status === 'em_transito').length;
  const cancelados = filtrados.filter(p => p.status === 'cancelado').length;
  const totalVolumes = filtrados.reduce((acc, p) => acc + (p.volumes || 0), 0);
  const taxaEntrega = totalPedidos > 0 ? Math.round((entregues / totalPedidos) * 100) : 0;
  const corTaxa = taxaEntrega >= 90 ? '#86EFAC' : taxaEntrega >= 50 ? '#F59E0B' : '#EF4444';

  const ranking = useMemo(() => {
    return despachantes
      .map(d => {
        const pedidosDespachante = filtrados.filter(p => p.despachante_id === d.id);
        return {
          id: d.id,
          nome: d.nome,
          entregas: pedidosDespachante.filter(p => p.status === 'entregue').length,
          pendentes: pedidosDespachante.filter(p => p.status !== 'entregue' && p.status !== 'cancelado').length,
        };
      })
      .filter(d => d.entregas > 0 || d.pendentes > 0)
      .sort((a, b) => b.entregas - a.entregas);
  }, [despachantes, filtrados]);

  const maiorEntregas = Math.max(1, ...ranking.map(r => r.entregas));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex gap-2 rounded-lg border border-border bg-card p-1">
          {periodos.map(p => (
            <Button
              key={p.value}
              size="sm"
              variant="ghost"
              onClick={() => setPeriodo(p.value)}
              className={cn(
                'h-8',
                periodo === p.value ? 'bg-pulso/10 text-pulso' : 'text-gray hover:text-clareza',
              )}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total de despachos" value={totalPedidos} color="#F1F5F9" />
            <StatCard label="Entregues" value={entregues} color="#86EFAC" />
            <StatCard label="Aguardando" value={aguardando} color="#F59E0B" />
            <StatCard label="Em trânsito" value={emTransito} color="#00E676" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-widest text-gray font-semibold mb-3">
                  Taxa de entrega
                </p>
                <p className="text-3xl font-extrabold mb-2" style={{ color: corTaxa }}>
                  {taxaEntrega}%
                </p>
                <div className="h-2 rounded-full bg-border overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${taxaEntrega}%`, backgroundColor: corTaxa }}
                  />
                </div>
                <p className="text-xs text-gray">
                  {entregues} de {totalPedidos} despachos entregues
                  {cancelados > 0 && ` · ${cancelados} cancelados`}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-widest text-gray font-semibold mb-3">
                  Volumes transportados
                </p>
                <p className="text-3xl font-extrabold text-clareza">{totalVolumes}</p>
                <p className="text-xs text-gray mt-2">no período selecionado</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-xs uppercase tracking-widest text-gray font-semibold mb-3">
              Top despachantes
            </h2>
            {ranking.length === 0 ? (
              <p className="text-sm text-gray py-6">Sem entregas no período selecionado.</p>
            ) : (
              <div className="space-y-3">
                {ranking.map(r => (
                  <Card key={r.id} className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-clareza">{r.nome}</span>
                        <span className="text-xs text-gray">
                          {r.entregas} entregues · {r.pendentes} pendentes
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-pulso"
                          style={{ width: `${(r.entregas / maiorEntregas) * 100}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <p className="text-2xl font-extrabold" style={{ color }}>
          {value}
        </p>
        <p className="text-xs text-gray font-medium mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
