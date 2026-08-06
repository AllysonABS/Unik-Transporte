import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { criarPedido } from '@/services/pedidos';
import { listarEntregadores } from '@/services/entregadores';
import { listarExcursoes } from '@/services/excursoes';
import { ApiError } from '@/lib/apiClient';
import type { ClienteVinculo } from '@/types/empresa';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import EntregadorFormDialog from '@/components/empresa/EntregadorFormDialog';
import ExcursaoFormDialog from '@/components/empresa/ExcursaoFormDialog';
import ClientePicker from '@/components/empresa/ClientePicker';

const schema = z.object({
  cliente_id: z.string().min(1, 'Selecione o cliente'),
  entregador_id: z.string().min(1, 'Selecione o entregador'),
  excursao_id: z.string().min(1, 'Selecione a excursão'),
  volumes: z
    .string()
    .min(1, 'Informe ao menos 1 volume')
    .refine(v => Number.isInteger(Number(v)) && Number(v) >= 1, 'Informe ao menos 1 volume'),
  descricao: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreatePedidoDialog({ open, onOpenChange }: Props) {
  const { empresa } = useEmpresaAuth();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [entregadorFormOpen, setEntregadorFormOpen] = useState(false);
  const [excursaoFormOpen, setExcursaoFormOpen] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteVinculo | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { cliente_id: '', entregador_id: '', excursao_id: '', volumes: '1', descricao: '' },
  });

  const { data: entregadoresData } = useQuery({
    queryKey: ['entregadores-picker', empresa?.id],
    queryFn: () => listarEntregadores(empresa!.id),
    enabled: open && !!empresa?.id,
  });
  const { data: excursoesData } = useQuery({
    queryKey: ['excursoes-picker', empresa?.id],
    queryFn: () => listarExcursoes(empresa!.id),
    enabled: open && !!empresa?.id,
  });

  const entregadores = entregadoresData?.entregadores ?? [];
  const excursoes = excursoesData?.excursoes ?? [];

  // Empresa com um único entregador: seleciona automaticamente para agilizar o cadastro.
  useEffect(() => {
    const unico = entregadoresData?.entregadores;
    if (unico?.length === 1 && !form.getValues('entregador_id')) {
      form.setValue('entregador_id', unico[0].id, { shouldValidate: true });
    }
  }, [entregadoresData, form]);

  useEffect(() => {
    if (!open) {
      setEntregadorFormOpen(false);
      setExcursaoFormOpen(false);
      setClienteSelecionado(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => {
      const values = form.getValues();
      const entregador = entregadores.find(d => d.id === values.entregador_id);
      const excursao = excursoes.find(e => e.id === values.excursao_id);
      return criarPedido(empresa!.id, {
        entregador_id: values.entregador_id,
        excursao_id: values.excursao_id,
        cliente_nome: clienteSelecionado?.nome ?? '',
        cliente_telefone: clienteSelecionado?.telefone || undefined,
        entregador_nome: entregador?.nome ?? '',
        excursao_nome: excursao?.nome ?? '',
        volumes: Number(values.volumes),
        descricao: values.descricao,
      });
    },
    onSuccess: () => {
      toast.success('Despacho criado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['pedidos', empresa?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', empresa?.id] });
      form.reset();
      setClienteSelecionado(null);
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao criar despacho.');
    },
  });

  function onSubmit() {
    setServerError(null);
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-clareza">Novo despacho</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cliente_id"
              render={() => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <FormControl>
                    <ClientePicker
                      empresaId={empresa!.id}
                      value={clienteSelecionado}
                      onChange={cliente => {
                        setClienteSelecionado(cliente);
                        form.setValue('cliente_id', cliente?.vinculo_id ?? '', { shouldValidate: true });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="entregador_id"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Entregador</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-clareza/70 hover:text-clareza"
                      onClick={() => setEntregadorFormOpen(true)}
                    >
                      <Plus className="h-3 w-3" />
                      Novo entregador
                    </Button>
                  </div>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o entregador" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {entregadores.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="excursao_id"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Excursão</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-clareza/70 hover:text-clareza"
                      onClick={() => setExcursaoFormOpen(true)}
                    >
                      <Plus className="h-3 w-3" />
                      Nova excursão
                    </Button>
                  </div>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a excursão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {excursoes.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="volumes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Volumes</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Criando...' : 'Criar despacho'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      <EntregadorFormDialog
        open={entregadorFormOpen}
        onOpenChange={setEntregadorFormOpen}
        onSaved={entregador => form.setValue('entregador_id', entregador.id, { shouldValidate: true })}
      />
      <ExcursaoFormDialog
        open={excursaoFormOpen}
        onOpenChange={setExcursaoFormOpen}
        onSaved={excursao => form.setValue('excursao_id', excursao.id, { shouldValidate: true })}
      />
    </Dialog>
  );
}
