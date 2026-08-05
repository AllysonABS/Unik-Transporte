import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MoreHorizontal, Search } from 'lucide-react';
import { useSetPageHeader } from '@/hooks/useSetPageHeader';
import { listarEntregadoresAdmin, excluirEntregadorAdmin } from '@/services/admin';
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
import EntregadorFormDialog from '@/components/admin/EntregadorFormDialog';
import { ApiError } from '@/lib/apiClient';
import { maskCpf, maskTelefone } from '@/lib/mask';
import type { EntregadorAdmin } from '@/types/admin';

export default function AdminEntregadoresPage() {
  useSetPageHeader('Entregadores', 'Todos os entregadores cadastrados na plataforma');
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [editing, setEditing] = useState<EntregadorAdmin | null>(null);
  const [deleting, setDeleting] = useState<EntregadorAdmin | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-entregadores'],
    queryFn: listarEntregadoresAdmin,
    refetchInterval: 5000,
  });

  const entregadores = data?.entregadores ?? [];

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return entregadores;
    return entregadores.filter(d => d.nome?.toLowerCase().includes(termo) || d.cpf?.includes(termo));
  }, [entregadores, busca]);

  const excluirMutation = useMutation({
    mutationFn: (id: string) => excluirEntregadorAdmin(id),
    onSuccess: () => {
      toast.success('Entregador excluído.');
      queryClient.invalidateQueries({ queryKey: ['admin-entregadores'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao excluir entregador.');
    },
  });

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray" />
        <Input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou CPF"
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
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Empresas vinculadas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray py-8">
                    Nenhum entregador encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-clareza">{d.nome}</TableCell>
                    <TableCell>{maskCpf(d.cpf)}</TableCell>
                    <TableCell>{d.telefone ? maskTelefone(d.telefone) : '—'}</TableCell>
                    <TableCell>{(d.empresas ?? []).map(e => e.nome_empresa).join(', ') || '—'}</TableCell>
                    <TableCell>
                      {d.ativo ? (
                        <Badge className="bg-success/10 text-success hover:bg-success/10">Ativo</Badge>
                      ) : (
                        <Badge variant="destructive">Inativo</Badge>
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
                          <DropdownMenuItem onClick={() => setEditing(d)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(d)}>
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

      <EntregadorFormDialog
        open={!!editing}
        onOpenChange={open => !open && setEditing(null)}
        entregador={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
        title="Excluir entregador"
        description={`"${deleting?.nome}" será excluído da plataforma. Se tiver pedidos vinculados, a exclusão será bloqueada.`}
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
