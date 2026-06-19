import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import StatusBadge from '@/components/empresa/StatusBadge';
import { formatHora } from '@/lib/format';
import type { PedidoData } from '@/types/empresa';

interface Props {
  pedido: PedidoData | null;
  onOpenChange: (open: boolean) => void;
}

export default function PedidoDetailSheet({ pedido, onOpenChange }: Props) {
  return (
    <Sheet open={!!pedido} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto bg-card border-border">
        {pedido && (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between pr-6">
                <SheetTitle className="text-clareza">#{pedido.numero}</SheetTitle>
                <StatusBadge status={pedido.status} />
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-3">
              <DetailRow label="Cliente" value={pedido.cliente_nome} />
              <DetailRow label="Despachante" value={pedido.despachante_nome} />
              <DetailRow label="Excursão" value={pedido.excursao_nome} />
              <DetailRow label="Volumes" value={String(pedido.volumes)} />
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
          </>
        )}
      </SheetContent>
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
