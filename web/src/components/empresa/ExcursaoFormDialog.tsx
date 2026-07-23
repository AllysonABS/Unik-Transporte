import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { cadastrarExcursao, atualizarExcursao } from '@/services/excursoes';
import { ApiError } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import type { ExcursaoData } from '@/types/empresa';

const schema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  setor: z.string().min(1, 'Informe o setor').max(200, 'Máximo de 200 caracteres'),
  vaga: z.string().min(1, 'Informe a vaga').max(200, 'Máximo de 200 caracteres'),
  responsavel: z.string().min(1, 'Informe o responsável'),
  telefone: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excursao?: ExcursaoData | null;
}

export default function ExcursaoFormDialog({ open, onOpenChange, excursao }: Props) {
  const { empresa } = useEmpresaAuth();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!excursao;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', setor: '', vaga: '', responsavel: '', telefone: '', observacoes: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        excursao
          ? { ...excursao, telefone: excursao.telefone ?? '', observacoes: excursao.observacoes ?? '' }
          : { nome: '', setor: '', vaga: '', responsavel: '', telefone: '', observacoes: '' },
      );
      setServerError(null);
    }
  }, [open, excursao, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit ? atualizarExcursao(excursao!.id, values) : cadastrarExcursao(empresa!.id, values),
    onSuccess: () => {
      toast.success(isEdit ? 'Excursão atualizada.' : 'Excursão cadastrada.');
      queryClient.invalidateQueries({ queryKey: ['excursoes', empresa?.id] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao salvar excursão.');
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
            {isEdit ? 'Editar excursão' : 'Nova excursão'}
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
                name="setor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={200} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vaga"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vaga</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={200} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="responsavel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
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
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
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
