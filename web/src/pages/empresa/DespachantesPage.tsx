import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { useSetPageHeader } from '@/hooks/useSetPageHeader';
import {
  listarDespachantes,
  toggleDespachante,
  excluirDespachante,
} from '@/services/despachantes';
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
import DespachanteFormDialog from '@/components/empresa/DespachanteFormDialog';
import ConfirmDialog from '@/components/empresa/ConfirmDialog';
import { ApiError } from '@/lib/apiClient';
import { maskCpf, maskTelefone } from '@/lib/mask';
import type { DespachanteData } from '@/types/empresa';

export default function DespachantesPage() {
  const { empresa } = useEmpresaAuth();
  useSetPageHeader('Despachantes', 'Gerencie seus despachantes');
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DespachanteData | null>(null);
  const [deleting, setDeleting] = useState<DespachanteData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['despachantes', empresa?.id],
    queryFn: () => listarDespachantes(empresa!.id),
    enabled: !!empresa?.id,
  });

  const despachantes = data?.despachantes ?? [];

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return despachantes;
    return despachantes.filter(
      d => d.nome?.toLowerCase().includes(termo) || d.cpf?.includes(termo) || d.telefone?.includes(termo),
    );
  }, [despachantes, busca]);

  const toggleMutation = useMutation({
    mutationFn: (despachanteId: string) => toggleDespachante(empresa!.id, despachanteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despachantes', empresa?.id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao atualizar despachante.');
    },
  });

  const excluirMutation = useMutation({
    mutationFn: (despachanteId: string) => excluirDespachante(empresa!.id, despachanteId),
    onSuccess: () => {
      toast.success('Despachante removido.');
      queryClient.invalidateQueries({ queryKey: ['despachantes', empresa?.id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao excluir despachante.');
    },
  });

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(d: DespachanteData) {
    setEditing(d);
    setFormOpen(true);
  }

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
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo despachante
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
                    Nenhum despachante encontrado.
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
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuItem onClick={() => openEdit(d)}>Editar</DropdownMenuItem>
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

      <DespachanteFormDialog open={formOpen} onOpenChange={setFormOpen} despachante={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
        title="Excluir despachante"
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
