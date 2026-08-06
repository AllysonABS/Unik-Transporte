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

// Cor da situação de origem no Bling — independente do statusPill acima
// (que é o nosso fluxo interno). Nomes fora dessa lista (situação
// customizada na conta do cliente) caem no estilo neutro.
const SITUACAO_BLING_CLS: Record<string, string> = {
  'Em aberto': 'bg-warning/15 text-warning',
  'Atendido': 'bg-success/15 text-success',
  'Verificado': 'bg-success/15 text-success',
  'Cancelado': 'bg-destructive/15 text-destructive',
  'Em andamento': 'bg-info/15 text-info',
  'Venda agenciada': 'bg-info/15 text-info',
  'Em digitação': 'bg-gray/15 text-gray',
};

function situacaoBlingCls(nome: string) {
  return SITUACAO_BLING_CLS[nome] || 'bg-gray/15 text-gray';
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
  // Situação de origem no Bling (Em aberto, Atendido...) — eixo de filtro
  // independente do status interno (fila/entrega) acima. 'todas' não filtra.
  const [situacaoBling, setSituacaoBling] = useState('todas');

  const { data, isLoading } = useQuery({
    queryKey: ['pedidos-importados', empresa?.id, filtro, mes],
    queryFn: () => listarPedidosImportados(empresa!.id, filtro, mes),
    enabled: !!empresa?.id,
    refetchInterval: 30000,
  });

  const pedidos = useMemo(() => data?.pedidos_importados ?? [], [data]);

  // Opções do filtro de situação Bling vêm dos pedidos já carregados — não
  // é uma lista fixa porque a conta pode ter situações customizadas.
  const situacoesBlingDisponiveis = useMemo(() => {
    const nomes = new Set<string>();
    for (const p of pedidos) if (p.situacao_bling_nome) nomes.add(p.situacao_bling_nome);
    return Array.from(nomes).sort();
  }, [pedidos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pedidos.filter(p => {
      if (situacaoBling !== 'todas' && p.situacao_bling_nome !== situacaoBling) return false;
      if (!termo) return true;
      return (
        p.cliente_nome?.toLowerCase().includes(termo) ||
        p.numero_pedido?.toLowerCase().includes(termo)
      );
    });
  }, [pedidos, busca, situacaoBling]);

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
        <Select value={situacaoBling} onValueChange={setSituacaoBling}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Situação no Bling" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Situação no Bling: todas</SelectItem>
            {situacoesBlingDisponiveis.map(nome => (
              <SelectItem key={nome} value={nome}>{nome}</SelectItem>
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
                <TableHead>Situação no Bling</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray py-8">
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
                        {p.situacao_bling_nome ? (
                          <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${situacaoBlingCls(p.situacao_bling_nome)}`}>
                            {p.situacao_bling_nome}
                          </span>
                        ) : (
                          <span className="text-gray">—</span>
                        )}
                      </TableCell>
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
