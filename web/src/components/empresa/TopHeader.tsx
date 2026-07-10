import { useEffect, useState } from 'react';
import { Bell, Link2, Package, AlertTriangle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { usePageHeader } from '@/context/PageHeaderContext';
import { contarNotificacoesNaoLidas, listarNotificacoes, marcarNotificacoesLidas } from '@/services/notificacoes';
import { formatRelativo } from '@/lib/format';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import type { NotificacaoData } from '@/types/empresa';

const ICONS: Record<string, { icon: typeof Link2; color: string }> = {
  novo_vinculo: { icon: Link2, color: '#60A5FA' },
  novo_pedido: { icon: Package, color: '#00E676' },
  alerta: { icon: AlertTriangle, color: '#F59E0B' },
};

export default function TopHeader() {
  const { title, subtitle } = usePageHeader();
  const { empresa } = useEmpresaAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: countData } = useQuery({
    queryKey: ['notificacoes-nao-lidas', empresa?.id],
    queryFn: () => contarNotificacoesNaoLidas(empresa!.id),
    enabled: !!empresa?.id,
    refetchInterval: 60_000,
  });
  const naoLidas = countData?.total ?? 0;

  const { data: listData, isLoading } = useQuery({
    queryKey: ['notificacoes', empresa?.id],
    queryFn: () => listarNotificacoes(empresa!.id),
    enabled: !!empresa?.id && open,
  });
  const notificacoes = listData?.notificacoes ?? [];

  useEffect(() => {
    if (!open || !empresa?.id || notificacoes.length === 0) return;
    const temNaoLida = notificacoes.some(n => !n.lida);
    if (!temNaoLida) return;
    marcarNotificacoesLidas(empresa.id).then(() => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes-nao-lidas', empresa.id] });
    });
  }, [open, empresa?.id, notificacoes]);

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 h-14">
      <div>
        <h1 className="text-xl font-bold text-clareza leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray mt-0.5">{subtitle}</p>}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className="relative rounded-md p-2 text-gray hover:bg-accent hover:text-clareza transition-colors"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            {naoLidas > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {naoLidas > 9 ? '9+' : naoLidas}
              </span>
            )}
          </button>
        </SheetTrigger>
        <SheetContent className="bg-card border-border w-96 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-clareza">Notificações</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))
            ) : notificacoes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-gray">
                <Bell className="h-6 w-6" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              notificacoes.map((n: NotificacaoData) => {
                const config = ICONS[n.tipo] ?? { icon: Bell, color: '#9CA3AF' };
                const Icon = config.icon;
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 rounded-lg border border-border p-3"
                  >
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: config.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-clareza truncate">{n.titulo}</p>
                        {!n.lida && <span className="h-2 w-2 rounded-full bg-pulso shrink-0" />}
                      </div>
                      <p className="text-xs text-gray mt-0.5 line-clamp-2">{n.mensagem}</p>
                      <span className="text-[10px] text-gray/60 mt-1 block">{formatRelativo(n.criado_em)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
