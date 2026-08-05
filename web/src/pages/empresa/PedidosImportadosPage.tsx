import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { useSetPageHeader } from '@/hooks/useSetPageHeader';
import { listarPedidosImportados, type PedidoImportado, type FiltroPedidosImportados } from '@/services/pedidosImportados';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FinalizarPedidoImportadoDialog from '@/components/empresa/FinalizarPedidoImportadoDialog';

const FILTROS: { value: FiltroPedidosImportados; label: string }[] = [
  { value: 'pendente', label: 'Pendentes (a completar)' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'entregue', label: 'Entregues' },
  { value: 'ignorado', label: 'Ignorados' },
  { value: 'todos', label: 'Todos' },
];

function statusPill(p: PedidoImportado) {
  if (p.status === 'pendente') return { label: 'Aguardando completar', cls: 'bg-warning/15 text-warning' };
  if (p.status === 'ignorado') return { label: 'Ignorado', cls: 'bg-gray/15 text-gray' };
  if (p.pedido_status === 'entregue') return { label: 'Entregue', cls: 'bg-success/15 text-success' };
  if (p.pedido_status === 'cancelado') return { label: 'Cancelado', cls: 'bg-destructive/15 text-destructive' };
  if (p.pedido_status === 'em_transito') return { label: 'Em trânsito', cls: 'bg-info/15 text-info' };
  return { label: 'Aguardando coleta', cls: 'bg-pulso/15 text-pulso' };
}

function formatarDataPedido(data: string | null) {
  if (!data) return '—';
  // O Postgres serializa a coluna DATE como datetime completo (ex.:
  // "2026-08-04T00:00:00.000Z") — usa timeZone UTC no format pra não
  // deslocar um dia por causa do fuso do navegador.
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export default function PedidosImportadosPage() {
  const { empresa } = useEmpresaAuth();
  useSetPageHeader('Pedidos importados', 'Pedidos vindos do Bling — complete e acompanhe até a entrega');
  const [selecionado, setSelecionado] = useState<PedidoImportado | null>(null);
  const [filtro, setFiltro] = useState<FiltroPedidosImportados>('pendente');
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [busca, setBusca] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pedidos-importados', empresa?.id, filtro, mes],
    queryFn: () => listarPedidosImportados(empresa!.id, filtro, mes),
    enabled: !!empresa?.id,
    refetchInterval: 30000,
  });

  const pedidos = data?.pedidos_importados ?? [];

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return pedidos;
    return pedidos.filter(
      p =>
        p.cliente_nome?.toLowerCase().includes(termo) ||
        p.numero_pedido?.toLowerCase().includes(termo),
    );
  }, [pedidos, busca]);

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray" />
          <Input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por cliente ou número do pedido"
            className="pl-9"
          />
        </div>
        <Input
          type="month"
          value={mes}
          onChange={e => setMes(e.target.value)}
          className="w-44"
          aria-label="Filtrar por mês"
        />
        <Select value={filtro} onValueChange={v => setFiltro(v as FiltroPedidosImportados)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTROS.map(f => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-md" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº do pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Volumes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
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
                filtrados.map(p => {
                  const pill = statusPill(p);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono font-semibold text-clareza">#{p.numero_pedido}</TableCell>
                      <TableCell className="text-gray">{formatarDataPedido(p.data_pedido)}</TableCell>
                      <TableCell className="text-clareza">
                        {p.cliente_nome}
                        {!p.cliente_telefone && p.status === 'pendente' && (
                          <span className="ml-2 text-[10px] font-semibold uppercase text-warning">sem telefone</span>
                        )}
                      </TableCell>
                      <TableCell>{p.volumes}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${pill.cls}`}>
                          {pill.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status === 'pendente' && (
                          <Button size="sm" onClick={() => setSelecionado(p)}>Completar pedido</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <FinalizarPedidoImportadoDialog pedido={selecionado} onOpenChange={open => !open && setSelecionado(null)} />
    </div>
  );
}
