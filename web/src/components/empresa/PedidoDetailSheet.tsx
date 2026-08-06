import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StatusBadge from '@/components/empresa/StatusBadge';
import ConfirmDialog from '@/components/empresa/ConfirmDialog';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { excluirPedido, atualizarVolumesPedido } from '@/services/pedidos';
import { formatHora } from '@/lib/format';
import { ApiError } from '@/lib/apiClient';
import type { PedidoData } from '@/types/empresa';

interface Props {
  pedido: PedidoData | null;
  onOpenChange: (open: boolean) => void;
}

export default function PedidoDetailSheet({ pedido, onOpenChange }: Props) {
  const { empresa } = useEmpresaAuth();
  const queryClient = useQueryClient();
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [editandoVolumes, setEditandoVolumes] = useState(false);
  const [novoVolumes, setNovoVolumes] = useState('');

  // Sai do modo de edição sempre que o sheet troca de pedido (ou fecha).
  useEffect(() => {
    setEditandoVolumes(false);
    setNovoVolumes(pedido ? String(pedido.volumes) : '');
  }, [pedido]);

  const excluirMutation = useMutation({
    mutationFn: () => excluirPedido(empresa!.id, pedido!.id),
    onSuccess: () => {
      toast.success('Pedido excluído.');
      queryClient.invalidateQueries({ queryKey: ['pedidos', empresa?.id] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-importados', empresa?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', empresa?.id] });
      setConfirmandoExclusao(false);
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao excluir pedido.');
    },
  });

  const volumesMutation = useMutation({
    mutationFn: (volumes: number) => atualizarVolumesPedido(empresa!.id, pedido!.id, volumes),
    onSuccess: () => {
      toast.success('Volumes atualizados.');
      queryClient.invalidateQueries({ queryKey: ['pedidos', empresa?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', empresa?.id] });
      setEditandoVolumes(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao atualizar volumes.');
    },
  });

  function salvarVolumes() {
    const valor = Number(novoVolumes);
    if (!Number.isInteger(valor) || valor < 1) {
      toast.error('Informe uma quantidade de volumes válida (mínimo 1).');
      return;
    }
    volumesMutation.mutate(valor);
  }

  return (
    <Sheet open={!!pedido} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto bg-card border-border">
        {pedido && (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between pr-6">
                <SheetTitle className="text-clareza">{pedido.cliente_nome}</SheetTitle>
                <StatusBadge status={pedido.status} />
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-3">
              <DetailRow label="Cliente" value={pedido.cliente_nome} />
              <DetailRow label="Entregador" value={pedido.entregador_nome} />
              <DetailRow label="Excursão" value={pedido.excursao_nome} />
              <div className="flex justify-between items-center border-b border-border py-2 text-sm gap-3">
                <span className="text-gray">Volumes</span>
                {editandoVolumes ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      value={novoVolumes}
                      onChange={e => setNovoVolumes(e.target.value)}
                      disabled={volumesMutation.isPending}
                      className="h-7 w-16 text-right text-sm"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-success hover:text-success"
                      disabled={volumesMutation.isPending}
                      onClick={salvarVolumes}
                      aria-label="Salvar volumes"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-gray"
                      disabled={volumesMutation.isPending}
                      onClick={() => { setEditandoVolumes(false); setNovoVolumes(String(pedido.volumes)); }}
                      aria-label="Cancelar edição de volumes"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-clareza font-medium hover:text-pulso"
                    onClick={() => setEditandoVolumes(true)}
                  >
                    {pedido.volumes}
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
              <DetailRow label="Descrição" value={pedido.descricao || '—'} />
            </div>

            <Separator className="my-6" />

            <h3 className="text-sm font-semibold text-pulso mb-4">Progresso</h3>
            {pedido.etapas && pedido.etapas.length > 0 ? (
              <ol className="space-y-4">
                {pedido.etapas
                  .slice()
                  .sort((a, b) => a.ordem - b.ordem)
                  .map(etapa => (
                    <li key={etapa.id} className="flex items-center gap-3">
                      <span
                        className={`h-3.5 w-3.5 rounded-full border-2 ${
                          etapa.concluida ? 'bg-pulso border-pulso' : 'bg-card border-border'
                        }`}
                      />
                      {etapa.hora && (
                        <span className="text-xs text-gray w-12">{formatHora(etapa.hora)}</span>
                      )}
                      <span className={etapa.concluida ? 'text-clareza font-medium' : 'text-gray'}>
                        {etapa.nome}
                      </span>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="text-sm text-gray">Sem etapas registradas.</p>
            )}

            {pedido.fotos && pedido.fotos.length > 0 && (
              <>
                <Separator className="my-6" />
                <h3 className="text-sm font-semibold text-pulso mb-4">
                  Fotos ({pedido.fotos.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {pedido.fotos.map(foto => (
                    <a key={foto.id} href={foto.url} target="_blank" rel="noreferrer">
                      <img
                        src={foto.url}
                        alt={foto.etapa}
                        className="aspect-square w-full rounded-md object-cover border border-border"
                      />
                    </a>
                  ))}
                </div>
              </>
            )}

            {pedido.observacao && (
              <>
                <Separator className="my-6" />
                <h3 className="text-sm font-semibold text-pulso mb-2">Observação</h3>
                <p className="text-sm text-clareza leading-relaxed">{pedido.observacao}</p>
              </>
            )}

            <Separator className="my-6" />
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive w-full justify-start"
              onClick={() => setConfirmandoExclusao(true)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir pedido
            </Button>
          </>
        )}
      </SheetContent>

      <ConfirmDialog
        open={confirmandoExclusao}
        onOpenChange={setConfirmandoExclusao}
        title="Excluir pedido"
        description={`Isso remove o pedido de ${pedido?.cliente_nome ?? ''} e todo o histórico (etapas, fotos) de forma permanente. Se ele veio de uma importação do Bling, volta pra fila de pedidos importados como pendente. Tem certeza?`}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => excluirMutation.mutate()}
      />
    </Sheet>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-2 text-sm">
      <span className="text-gray">{label}</span>
      <span className="text-clareza font-medium text-right">{value}</span>
    </div>
  );
}
