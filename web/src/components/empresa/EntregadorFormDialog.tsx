import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, UserCheck } from 'lucide-react';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { buscarEntregadorPorCpf, vincularEntregador } from '@/services/entregadores';
import { ApiError } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { maskCpf, maskTelefone } from '@/lib/mask';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (entregador: { id: string; nome: string }) => void;
}

interface Encontrado {
  id: string;
  nome: string;
  cpf: string;
  telefone?: string;
}

export default function EntregadorFormDialog({ open, onOpenChange, onSaved }: Props) {
  const { empresa } = useEmpresaAuth();
  const queryClient = useQueryClient();
  const [cpf, setCpf] = useState('');
  const [encontrado, setEncontrado] = useState<Encontrado | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCpf('');
      setEncontrado(null);
      setServerError(null);
    }
  }, [open]);

  const buscarMutation = useMutation({
    mutationFn: () => buscarEntregadorPorCpf(empresa!.id, cpf.replace(/\D/g, '')),
    onSuccess: data => {
      setEncontrado(data.entregador);
      setServerError(null);
    },
    onError: (err: unknown) => {
      setEncontrado(null);
      setServerError(err instanceof ApiError ? err.message : 'Erro ao buscar entregador.');
    },
  });

  const vincularMutation = useMutation({
    mutationFn: () => vincularEntregador(empresa!.id, cpf.replace(/\D/g, '')),
    onSuccess: data => {
      toast.success('Entregador vinculado.');
      queryClient.invalidateQueries({ queryKey: ['entregadores', empresa?.id] });
      queryClient.invalidateQueries({ queryKey: ['entregadores-picker', empresa?.id] });
      if (encontrado) onSaved?.({ id: data.id, nome: encontrado.nome });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao vincular entregador.');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-clareza">Vincular entregador</DialogTitle>
          <DialogDescription>
            O entregador precisa ter criado a própria conta no app antes. Peça o CPF que ele usou lá.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={cpf}
              onChange={e => {
                setCpf(maskCpf(e.target.value));
                setEncontrado(null);
              }}
              placeholder="CPF do entregador"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => buscarMutation.mutate()}
              disabled={buscarMutation.isPending || cpf.replace(/\D/g, '').length !== 11}
            >
              <Search className="h-4 w-4" />
              {buscarMutation.isPending ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          {encontrado && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10">
                <UserCheck className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="font-medium text-clareza">{encontrado.nome}</p>
                <p className="text-xs text-gray">
                  {maskCpf(encontrado.cpf)}
                  {encontrado.telefone ? ` · ${maskTelefone(encontrado.telefone)}` : ''}
                </p>
              </div>
            </div>
          )}

          {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={!encontrado || vincularMutation.isPending}
            onClick={() => vincularMutation.mutate()}
          >
            {vincularMutation.isPending ? 'Vinculando...' : 'Vincular'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
