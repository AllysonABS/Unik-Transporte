import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import {
  listarClientesEmpresa,
  bloquearVinculoCliente,
  excluirVinculoCliente,
} from '@/services/clientes';
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
import ClienteFormDialog from '@/components/empresa/ClienteFormDialog';
import ConfirmDialog from '@/components/empresa/ConfirmDialog';
import { ApiError } from '@/lib/apiClient';
import type { ClienteVinculo } from '@/types/empresa';

export default function ClientesPage() {
  const { empresa } = useEmpresaAuth();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClienteVinculo | null>(null);
  const [blocking, setBlocking] = useState<ClienteVinculo | null>(null);
  const [deleting, setDeleting] = useState<ClienteVinculo | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', empresa?.id],
    queryFn: () => listarClientesEmpresa(empresa!.id),
    enabled: !!empresa?.id,
  });

  const clientes = data?.clientes ?? [];

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter(
      c =>
        c.nome?.toLowerCase().includes(termo) ||
        c.cpf?.includes(termo) ||
        c.telefone?.includes(termo),
    );
  }, [clientes, busca]);

  const bloquearMutation = useMutation({
    mutationFn: (vinculoId: string) => bloquearVinculoCliente(vinculoId),
    onSuccess: () => {
      toast.success('Cliente bloqueado.');
      queryClient.invalidateQueries({ queryKey: ['clientes', empresa?.id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao bloquear cliente.');
    },
  });

  const excluirMutation = useMutation({
    mutationFn: (vinculoId: string) => excluirVinculoCliente(vinculoId),
    onSuccess: () => {
      toast.success('Vínculo removido.');
      queryClient.invalidateQueries({ queryKey: ['clientes', empresa?.id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao excluir vínculo.');
    },
  });

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(cliente: ClienteVinculo) {
    setEditing(cliente);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-clareza">Clientes</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray" />
        <Input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF ou telefone"
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
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray py-8">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map(c => (
                  <TableRow key={c.vinculo_id}>
                    <TableCell className="font-medium text-clareza">{c.nome}</TableCell>
                    <TableCell>{c.cpf || c.cnpj || '—'}</TableCell>
                    <TableCell>{c.telefone || '—'}</TableCell>
                    <TableCell>
                      {c.status === 'bloqueado' ? (
                        <Badge variant="destructive">Bloqueado</Badge>
                      ) : (
                        <Badge className="bg-success/10 text-success hover:bg-success/10">Ativo</Badge>
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
                          <DropdownMenuItem onClick={() => openEdit(c)}>Editar</DropdownMenuItem>
                          {c.status !== 'bloqueado' && (
                            <DropdownMenuItem onClick={() => setBlocking(c)}>
                              Bloquear
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleting(c)}
                          >
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

      <ClienteFormDialog open={formOpen} onOpenChange={setFormOpen} cliente={editing} />

      <ConfirmDialog
        open={!!blocking}
        onOpenChange={open => !open && setBlocking(null)}
        title="Bloquear cliente"
        description={`"${blocking?.nome}" não poderá se vincular novamente à sua empresa. Deseja continuar?`}
        confirmLabel="Bloquear"
        destructive
        onConfirm={() => {
          if (blocking) bloquearMutation.mutate(blocking.vinculo_id);
          setBlocking(null);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
        title="Excluir vínculo"
        description={`"${deleting?.nome}" será desvinculado da sua empresa e poderá se vincular novamente depois. Deseja continuar?`}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (deleting) excluirMutation.mutate(deleting.vinculo_id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
