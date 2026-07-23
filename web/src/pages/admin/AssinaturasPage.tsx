import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useSetPageHeader } from '@/hooks/useSetPageHeader';
import { listarAssinaturasAdmin } from '@/services/admin';
import { formatData } from '@/lib/format';
import { Input } from '@/components/ui/input';
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
import AssinaturaFormDialog from '@/components/admin/AssinaturaFormDialog';
import type { AssinaturaAdmin } from '@/types/admin';

const STATUS_BADGE: Record<string, string> = {
  ativa: 'bg-success/10 text-success hover:bg-success/10',
  suspensa: 'bg-warning/10 text-warning hover:bg-warning/10',
  vencida: 'bg-destructive/10 text-destructive hover:bg-destructive/10',
  cancelada: 'bg-destructive/10 text-destructive hover:bg-destructive/10',
};

export default function AdminAssinaturasPage() {
  useSetPageHeader('Assinaturas', 'Situação de cobrança de todas as empresas');
  const [busca, setBusca] = useState('');
  const [editing, setEditing] = useState<AssinaturaAdmin | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-assinaturas'],
    queryFn: listarAssinaturasAdmin,
  });

  const assinaturas = data?.assinaturas ?? [];

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return assinaturas;
    return assinaturas.filter(a => a.nome_empresa?.toLowerCase().includes(termo));
  }, [assinaturas, busca]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray" />
        <Input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por empresa"
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
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Vencimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray py-8">
                    Nenhuma assinatura encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtradas.map(a => (
                  <TableRow
                    key={a.id}
                    className="cursor-pointer"
                    onClick={() => setEditing(a)}
                  >
                    <TableCell className="font-medium text-clareza">{a.nome_empresa}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE[a.status] ?? ''}>{a.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {a.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell>{formatData(a.data_inicio)}</TableCell>
                    <TableCell>{formatData(a.data_vencimento)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AssinaturaFormDialog open={!!editing} onOpenChange={open => !open && setEditing(null)} assinatura={editing} />
    </div>
  );
}
