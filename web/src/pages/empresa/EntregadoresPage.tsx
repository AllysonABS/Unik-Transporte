import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { useSetPageHeader } from '@/hooks/useSetPageHeader';
import {
  listarEntregadores,
  toggleEntregador,
  excluirEntregador,
} from '@/services/entregadores';
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
import EntregadorFormDialog from '@/components/empresa/EntregadorFormDialog';
import ConfirmDialog from '@/components/empresa/ConfirmDialog';
import { ApiError } from '@/lib/apiClient';
import { maskCpf, maskTelefone } from '@/lib/mask';
import type { EntregadorData } from '@/types/empresa';

export default function EntregadoresPage() {
  const { empresa } = useEmpresaAuth();
  useSetPageHeader('Entregadores', 'Gerencie seus entregadores');
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<EntregadorData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['entregadores', empresa?.id],
    queryFn: () => listarEntregadores(empresa!.id),
    enabled: !!empresa?.id,
  });

  const entregadores = data?.entregadores ?? [];

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return entregadores;
    return entregadores.filter(
      d => d.nome?.toLowerCase().includes(termo) || d.cpf?.includes(termo) || d.telefone?.includes(termo),
    );
  }, [entregadores, busca]);

  const toggleMutation = useMutation({
    mutationFn: (entregadorId: string) => toggleEntregador(empresa!.id, entregadorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores', empresa?.id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao atualizar entregador.');
    },
  });

  const excluirMutation = useMutation({
    mutationFn: (entregadorId: string) => excluirEntregador(empresa!.id, entregadorId),
    onSuccess: () => {
      toast.success('Entregador removido.');
      queryClient.invalidateQueries({ queryKey: ['entregadores', empresa?.id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao excluir entregador.');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray" />
          <Input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF ou telefone"
            className="pl-9"
          />
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Vincular entregador
        </Button>
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
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray py-8">
                    Nenhum entregador encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-clareza">{d.nome}</TableCell>
                    <TableCell>{maskCpf(d.cpf)}</TableCell>
                    <TableCell>{d.telefone ? maskTelefone(d.telefone) : '—'}</TableCell>
                    <TableCell>
                      {d.ativo === false ? (
                        <Badge variant="destructive">Desativado</Badge>
                      ) : (
                        <Badge className="bg-success/10 text-success hover:bg-success/10">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuItem onClick={() => toggleMutation.mutate(d.id)}>
                            {d.ativo === false ? 'Ativar' : 'Desativar'}
                          </DropdownMenuItem>
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

      <EntregadorFormDialog open={formOpen} onOpenChange={setFormOpen} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
        title="Excluir entregador"
        description={`"${deleting?.nome}" será desvinculado da sua empresa. Deseja continuar?`}
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
