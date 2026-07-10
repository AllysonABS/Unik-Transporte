import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { useSetPageHeader } from '@/hooks/useSetPageHeader';
import { listarExcursoes, excluirExcursao } from '@/services/excursoes';
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
import ExcursaoFormDialog from '@/components/empresa/ExcursaoFormDialog';
import ConfirmDialog from '@/components/empresa/ConfirmDialog';
import { ApiError } from '@/lib/apiClient';
import type { ExcursaoData } from '@/types/empresa';

export default function ExcursoesPage() {
  const { empresa } = useEmpresaAuth();
  useSetPageHeader('Excursões', 'Gerencie suas rotas e excursões');
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExcursaoData | null>(null);
  const [deleting, setDeleting] = useState<ExcursaoData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['excursoes', empresa?.id],
    queryFn: () => listarExcursoes(empresa!.id),
    enabled: !!empresa?.id,
  });

  const excursoes = data?.excursoes ?? [];

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return excursoes;
    return excursoes.filter(
      e =>
        e.nome?.toLowerCase().includes(termo) ||
        e.responsavel?.toLowerCase().includes(termo) ||
        e.setor?.toLowerCase().includes(termo),
    );
  }, [excursoes, busca]);

  const excluirMutation = useMutation({
    mutationFn: (excursaoId: string) => excluirExcursao(excursaoId),
    onSuccess: () => {
      toast.success('Excursão removida.');
      queryClient.invalidateQueries({ queryKey: ['excursoes', empresa?.id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao excluir excursão.');
    },
  });

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(e: ExcursaoData) {
    setEditing(e);
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
            placeholder="Buscar por nome, setor ou responsável"
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova excursão
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
                <TableHead>Setor</TableHead>
                <TableHead>Vaga</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray py-8">
                    Nenhuma excursão encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-clareza">{e.nome}</TableCell>
                    <TableCell>
                      <Badge className="bg-success/10 text-success hover:bg-success/10">{e.setor}</Badge>
                    </TableCell>
                    <TableCell>{e.vaga}</TableCell>
                    <TableCell>{e.responsavel}</TableCell>
                    <TableCell>{e.telefone || '—'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuItem onClick={() => openEdit(e)}>Editar</DropdownMenuItem>
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

      <ExcursaoFormDialog open={formOpen} onOpenChange={setFormOpen} excursao={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
        title="Excluir excursão"
        description={`"${deleting?.nome}" será removida permanentemente. Deseja continuar?`}
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
