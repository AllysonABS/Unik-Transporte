import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MoreHorizontal, Search } from 'lucide-react';
import { useSetPageHeader } from '@/hooks/useSetPageHeader';
import { listarClientesAdmin, excluirClienteAdmin } from '@/services/admin';
import { formatData } from '@/lib/format';
import { maskCpf } from '@/lib/mask';
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
import ClienteFormDialog from '@/components/admin/ClienteFormDialog';
import { ApiError } from '@/lib/apiClient';
import type { ClienteAdmin } from '@/types/admin';

export default function AdminClientesPage() {
  useSetPageHeader('Clientes', 'Todos os clientes cadastrados na plataforma');
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [editing, setEditing] = useState<ClienteAdmin | null>(null);
  const [deleting, setDeleting] = useState<ClienteAdmin | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-clientes'],
    queryFn: listarClientesAdmin,
    refetchInterval: 5000,
  });

  const clientes = data?.clientes ?? [];

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter(
      c => c.nome?.toLowerCase().includes(termo) || c.cpf?.includes(termo) || c.email?.toLowerCase().includes(termo),
    );
  }, [clientes, busca]);

  const excluirMutation = useMutation({
    mutationFn: (id: string) => excluirClienteAdmin(id),
    onSuccess: () => {
      toast.success('Cliente excluído.');
      queryClient.invalidateQueries({ queryKey: ['admin-clientes'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao excluir cliente.');
    },
  });

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray" />
        <Input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF ou e-mail"
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
                <TableHead>E-mail</TableHead>
                <TableHead>Lojas vinculadas</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray py-8">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-clareza">
                      {c.nome}
                      {c.manual && (
                        <Badge variant="outline" className="ml-2 text-[10px] font-normal text-gray">
                          Sem conta no app
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{c.cpf ? maskCpf(c.cpf) : '—'}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.total_vinculos}</TableCell>
                    <TableCell>{formatData(c.data_cadastro)}</TableCell>
                    <TableCell>
                      {c.ativo ? (
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
                          <DropdownMenuItem onClick={() => setEditing(c)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(c)}>
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

      <ClienteFormDialog open={!!editing} onOpenChange={open => !open && setEditing(null)} cliente={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
        title="Excluir cliente"
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
