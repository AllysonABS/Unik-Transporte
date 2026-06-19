import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { cadastrarDespachante, atualizarDespachante } from '@/services/despachantes';
import { ApiError } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { DespachanteData } from '@/types/empresa';

const schema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  cpf: z.string().min(1, 'Informe o CPF'),
  telefone: z.string().optional(),
  senha: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  despachante?: DespachanteData | null;
}

export default function DespachanteFormDialog({ open, onOpenChange, despachante }: Props) {
  const { empresa } = useEmpresaAuth();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!despachante;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', cpf: '', telefone: '', senha: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        despachante
          ? { nome: despachante.nome, cpf: despachante.cpf, telefone: despachante.telefone ?? '', senha: '' }
          : { nome: '', cpf: '', telefone: '', senha: '' },
      );
      setServerError(null);
    }
  }, [open, despachante, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (isEdit) {
        return atualizarDespachante(despachante!.id, {
          nome: values.nome,
          cpf: values.cpf,
          telefone: values.telefone,
          senha: values.senha || undefined,
        });
      }
      if (!values.senha) {
        return Promise.reject(new ApiError(400, 'Informe a senha.'));
      }
      return cadastrarDespachante(empresa!.id, {
        nome: values.nome,
        cpf: values.cpf,
        telefone: values.telefone,
        senha: values.senha,
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Despachante atualizado.' : 'Despachante cadastrado.');
      queryClient.invalidateQueries({ queryKey: ['despachantes', empresa?.id] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao salvar despachante.');
    },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    mutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-clareza">
            {isEdit ? 'Editar despachante' : 'Novo despachante'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="senha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isEdit ? 'Nova senha (opcional)' : 'Senha'}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <p className="text-xs text-gray">Mínimo 8 caracteres, 1 letra maiúscula e 1 número.</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
