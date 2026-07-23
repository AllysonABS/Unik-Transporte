import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MoreHorizontal, Search } from 'lucide-react';
import { useSetPageHeader } from '@/hooks/useSetPageHeader';
import { listarPedidosAdmin, excluirPedidoAdmin } from '@/services/admin';
import { formatDataHora, STATUS_CONFIG } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ConfirmDialog from '@/components/empresa/ConfirmDialog';
import { ApiError } from '@/lib/apiClient';
import type { PedidoAdmin } from '@/types/admin';
import type { PedidoStatus } from '@/types/empresa';

export default function AdminPedidosPage() {
  useSetPageHeader('Pedidos', 'Todos os pedidos despachados na plataforma');
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [deleting, setDeleting] = useState<PedidoAdmin | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pedidos'],
    queryFn: listarPedidosAdmin,
  });

  const pedidos = data?.pedidos ?? [];

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return pedidos;
    return pedidos.filter(
      p =>
        p.nome_empresa?.toLowerCase().includes(termo) ||
        p.cliente_nome?.toLowerCase().includes(termo) ||
        String(p.numero).includes(termo),
    );
  }, [pedidos, busca]);

  const excluirMutation = useMutation({
    mutationFn: (id: string) => excluirPedidoAdmin(id),
    onSuccess: () => {
      toast.success('Pedido excluído.');
      queryClient.invalidateQueries({ queryKey: ['admin-pedidos'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao excluir pedido.');
    },
  });

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray" />
        <Input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por empresa, cliente ou número"
          className="pl-9"
        />
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
                <TableHead>#</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Excursão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-10" />
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
                  const config = STATUS_CONFIG[p.status as PedidoStatus] ?? {
                    label: p.status,
                    color: '#9CA3AF',
                    bg: 'transparent',
                  };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-clareza">#{p.numero}</TableCell>
                      <TableCell>{p.nome_empresa}</TableCell>
                      <TableCell>{p.cliente_nome}</TableCell>
                      <TableCell>{p.excursao_nome}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: `${config.color}1A`, color: config.color }} className="border-transparent">
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDataHora(p.criado_em)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border">
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(p)}>
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
        title="Excluir pedido"
        description={`O pedido #${deleting?.numero} de "${deleting?.nome_empresa}" será excluído permanentemente, junto com etapas e fotos.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (deleting) excluirMutation.mutate(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
