import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { criarPedido } from '@/services/pedidos';
import { listarClientesEmpresa } from '@/services/clientes';
import { listarDespachantes } from '@/services/despachantes';
import { listarExcursoes } from '@/services/excursoes';
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

const schema = z.object({
  cliente_id: z.string().min(1, 'Selecione o cliente'),
  despachante_id: z.string().min(1, 'Selecione o despachante'),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { cliente_id: '', despachante_id: '', excursao_id: '', volumes: '1', descricao: '' },
  });

  const { data: clientesData } = useQuery({
    queryKey: ['clientes-picker', empresa?.id],
    queryFn: () => listarClientesEmpresa(empresa!.id),
    enabled: open && !!empresa?.id,
  });
  const { data: despachantesData } = useQuery({
    queryKey: ['despachantes-picker', empresa?.id],
    queryFn: () => listarDespachantes(empresa!.id),
    enabled: open && !!empresa?.id,
  });
  const { data: excursoesData } = useQuery({
    queryKey: ['excursoes-picker', empresa?.id],
    queryFn: () => listarExcursoes(empresa!.id),
    enabled: open && !!empresa?.id,
  });

  const clientes = clientesData?.clientes ?? [];
  const despachantes = despachantesData?.despachantes ?? [];
  const excursoes = excursoesData?.excursoes ?? [];

  const mutation = useMutation({
    mutationFn: () => {
      const values = form.getValues();
      const cliente = clientes.find(c => c.vinculo_id === values.cliente_id);
      const despachante = despachantes.find(d => d.id === values.despachante_id);
      const excursao = excursoes.find(e => e.id === values.excursao_id);
      return criarPedido(empresa!.id, {
        cliente_id: cliente?.cliente_id || undefined,
        despachante_id: values.despachante_id,
        excursao_id: values.excursao_id,
        cliente_nome: cliente?.nome ?? '',
        cliente_telefone: cliente?.telefone || undefined,
        despachante_nome: despachante?.nome ?? '',
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientes.map(c => (
                        <SelectItem key={c.vinculo_id} value={c.vinculo_id}>
                          {c.nome}
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
              name="despachante_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Despachante</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o despachante" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {despachantes.map(d => (
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
                  <FormLabel>Excursão</FormLabel>
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
    </Dialog>
  );
}
