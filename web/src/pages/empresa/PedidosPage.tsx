import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { listarPedidosEmpresa } from '@/services/pedidos';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StatusBadge from '@/components/empresa/StatusBadge';
import PedidoDetailSheet from '@/components/empresa/PedidoDetailSheet';
import CreatePedidoDialog from '@/components/empresa/CreatePedidoDialog';
import type { PedidoData, PedidoStatus } from '@/types/empresa';

export default function PedidosPage() {
  const { empresa } = useEmpresaAuth();
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<PedidoStatus | 'todos'>('todos');
  const [detalhe, setDetalhe] = useState<PedidoData | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['pedidos', empresa?.id],
    queryFn: () => listarPedidosEmpresa(empresa!.id),
    enabled: !!empresa?.id,
  });

  const pedidos = data?.pedidos ?? [];

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pedidos.filter(p => {
      const passaStatus = status === 'todos' || p.status === status;
      const passaBusca =
        !termo ||
        p.cliente_nome?.toLowerCase().includes(termo) ||
        p.despachante_nome?.toLowerCase().includes(termo) ||
        p.excursao_nome?.toLowerCase().includes(termo) ||
        String(p.numero ?? '').includes(termo);
      return passaStatus && passaBusca;
    });
  }, [pedidos, busca, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-clareza">Pedidos</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo pedido
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray" />
          <Input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por cliente, despachante, excursão ou número"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={v => setStatus(v as PedidoStatus | 'todos')}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="aguardando">Aguardando</SelectItem>
            <SelectItem value="em_transito">Em trânsito</SelectItem>
            <SelectItem value="entregue">Entregue</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Despachante</TableHead>
                <TableHead>Excursão</TableHead>
                <TableHead>Volumes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray py-8">
                    Nenhum pedido encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map(p => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-accent/40"
                    onClick={() => setDetalhe(p)}
                  >
                    <TableCell className="font-medium text-clareza">#{p.numero}</TableCell>
                    <TableCell>{p.cliente_nome}</TableCell>
                    <TableCell>{p.despachante_nome}</TableCell>
                    <TableCell>{p.excursao_nome}</TableCell>
                    <TableCell>{p.volumes}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <PedidoDetailSheet pedido={detalhe} onOpenChange={open => !open && setDetalhe(null)} />
      <CreatePedidoDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
