import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, Package, AlertTriangle, Bell } from 'lucide-react';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { listarNotificacoes, marcarNotificacoesLidas } from '@/services/notificacoes';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativo } from '@/lib/format';
import type { NotificacaoData } from '@/types/empresa';

const ICONS: Record<string, { icon: typeof Link2; color: string }> = {
  novo_vinculo: { icon: Link2, color: '#60A5FA' },
  novo_pedido: { icon: Package, color: '#00E676' },
  alerta: { icon: AlertTriangle, color: '#F59E0B' },
};

export default function NotificacoesPage() {
  const { empresa } = useEmpresaAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notificacoes', empresa?.id],
    queryFn: () => listarNotificacoes(empresa!.id),
    enabled: !!empresa?.id,
  });

  const notificacoes = data?.notificacoes ?? [];

  useEffect(() => {
    if (!empresa?.id || notificacoes.length === 0) return;
    const temNaoLida = notificacoes.some(n => !n.lida);
    if (!temNaoLida) return;
    marcarNotificacoesLidas(empresa.id).then(() => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes-nao-lidas', empresa.id] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa?.id, notificacoes.length]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-clareza">Notificações</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : notificacoes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-gray">
          <Bell className="h-8 w-8" />
          <p className="text-sm">Nenhuma notificação por aqui</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notificacoes.map((n: NotificacaoData) => {
            const config = ICONS[n.tipo] ?? { icon: Bell, color: '#9CA3AF' };
            const Icon = config.icon;
            return (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
              >
                <Icon className="h-5 w-5 mt-0.5 shrink-0" style={{ color: config.color }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-clareza">{n.titulo}</p>
                    <span className="text-xs text-gray shrink-0">{formatRelativo(n.criado_em)}</span>
                  </div>
                  <p className="text-sm text-gray mt-1">{n.mensagem}</p>
                </div>
                {!n.lida && <span className="h-2 w-2 rounded-full bg-pulso mt-1.5 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
