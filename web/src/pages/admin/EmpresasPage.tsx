import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MoreHorizontal, Search } from 'lucide-react';
import { useSetPageHeader } from '@/hooks/useSetPageHeader';
import { listarEmpresasAdmin, excluirEmpresaAdmin } from '@/services/admin';
import { formatData } from '@/lib/format';
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
import EmpresaFormDialog from '@/components/admin/EmpresaFormDialog';
import { ApiError } from '@/lib/apiClient';
import type { EmpresaAdmin } from '@/types/admin';

export default function AdminEmpresasPage() {
  useSetPageHeader('Empresas', 'Todas as empresas cadastradas na plataforma');
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [editing, setEditing] = useState<EmpresaAdmin | null>(null);
  const [deleting, setDeleting] = useState<EmpresaAdmin | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-empresas'],
    queryFn: listarEmpresasAdmin,
  });

  const empresas = data?.empresas ?? [];

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return empresas;
    return empresas.filter(
      e =>
        e.nome_empresa?.toLowerCase().includes(termo) ||
        e.cnpj?.includes(termo) ||
        e.cidade?.toLowerCase().includes(termo),
    );
  }, [empresas, busca]);

  const excluirMutation = useMutation({
    mutationFn: (id: string) => excluirEmpresaAdmin(id),
    onSuccess: () => {
      toast.success('Empresa excluída.');
      queryClient.invalidateQueries({ queryKey: ['admin-empresas'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao excluir empresa.');
    },
  });

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray" />
        <Input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, CNPJ ou cidade"
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
                <TableHead>CNPJ</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Assinatura</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray py-8">
                    Nenhuma empresa encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtradas.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-clareza">{e.nome_empresa}</TableCell>
                    <TableCell>{e.cnpj}</TableCell>
                    <TableCell>{e.cidade ? `${e.cidade}/${e.estado}` : '—'}</TableCell>
                    <TableCell className="capitalize">{e.status_assinatura}</TableCell>
                    <TableCell>{formatData(e.data_vencimento)}</TableCell>
                    <TableCell>
                      {e.ativa ? (
                        <Badge className="bg-success/10 text-success hover:bg-success/10">Ativa</Badge>
                      ) : (
                        <Badge variant="destructive">Inativa</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuItem onClick={() => setEditing(e)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(e)}>
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <EmpresaFormDialog open={!!editing} onOpenChange={open => !open && setEditing(null)} empresa={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
        title="Excluir empresa"
        description={`"${deleting?.nome_empresa}" será excluída junto com todos os clientes vinculados, pedidos, excursões e assinaturas. Essa ação não pode ser desfeita.`}
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
