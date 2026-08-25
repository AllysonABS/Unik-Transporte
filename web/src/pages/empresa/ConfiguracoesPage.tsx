import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { useSetPageHeader } from '@/hooks/useSetPageHeader';
import { buscarEmpresa, atualizarEmpresa } from '@/services/empresaPerfil';
import { buscarStatusBling, gerarUrlConexaoBling, desconectarBling, sincronizarBlingAgora, buscarLojasBling, salvarLojasBling } from '@/services/bling';
import { buscarCobranca, trocarCartaoCobranca, cancelarAssinaturaCobranca } from '@/services/cobranca';
import ConfirmDialog from '@/components/empresa/ConfirmDialog';
import { buscarCep } from '@/lib/cep';
import { maskTelefone, maskCep, maskCnpj, maskCpf } from '@/lib/mask';
import { ApiError } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const schema = z.object({
  nome_empresa: z.string().min(1, 'Informe o nome da empresa'),
  telefone: z.string().min(1, 'Informe o telefone'),
  email: z.string().email('E-mail inválido'),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  horario_funcionamento: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ConfiguracoesPage() {
  const { empresa, updateEmpresa } = useEmpresaAuth();
  useSetPageHeader('Configurações', 'Dados e preferências da empresa');
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  // Volta do redirect OAuth do Bling já cai direto na aba de integrações; o
  // middleware de assinatura inativa manda a empresa direto pra cobrança.
  const [aba, setAba] = useState(() => {
    if (searchParams.get('bling')) return 'integracoes';
    if (searchParams.get('aba') === 'cobranca') return 'cobranca';
    return 'configuracoes';
  });

  useEffect(() => {
    const bling = searchParams.get('bling');
    if (bling === 'conectado') {
      toast.success('Bling conectado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['bling-status', empresa?.id] });
    } else if (bling === 'erro') {
      toast.error('Não foi possível conectar o Bling. Tente novamente.');
    }
    if (!searchParams.get('bling') && !searchParams.get('aba')) return;
    searchParams.delete('bling');
    searchParams.delete('motivo');
    searchParams.delete('aba');
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['empresa-perfil', empresa?.id],
    queryFn: () => buscarEmpresa(empresa!.id),
    enabled: !!empresa?.id,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome_empresa: '',
      telefone: '',
      email: '',
      cep: '',
      endereco: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      horario_funcionamento: '',
    },
  });

  useEffect(() => {
    if (data?.empresa) {
      form.reset({
        nome_empresa: data.empresa.nome_empresa,
        telefone: data.empresa.telefone,
        email: data.empresa.email,
        cep: data.empresa.cep ?? '',
        endereco: data.empresa.endereco ?? '',
        numero: data.empresa.numero ?? '',
        bairro: data.empresa.bairro ?? '',
        cidade: data.empresa.cidade ?? '',
        estado: data.empresa.estado ?? '',
        horario_funcionamento: data.empresa.horario_funcionamento ?? '',
      });
    }
  }, [data, form]);

  async function handleCepBlur(cep: string) {
    const resultado = await buscarCep(cep);
    if (resultado) {
      form.setValue('endereco', resultado.logradouro);
      form.setValue('bairro', resultado.bairro);
      form.setValue('cidade', resultado.cidade);
      form.setValue('estado', resultado.estado);
    }
  }

  const mutation = useMutation({
    mutationFn: (values: FormValues) => atualizarEmpresa(empresa!.id, values),
    onSuccess: (_res, values) => {
      toast.success('Dados atualizados.');
      updateEmpresa(values);
      queryClient.invalidateQueries({ queryKey: ['empresa-perfil', empresa?.id] });
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    mutation.mutate({
      ...values,
      telefone: values.telefone.replace(/\D/g, ''),
      cep: values.cep ? values.cep.replace(/\D/g, '') : values.cep,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          <TabsTrigger value="cobranca">Cobrança</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="configuracoes" className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-clareza text-base">Dados da empresa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nome_empresa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da empresa</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{data?.empresa.cnpj ? 'CNPJ' : 'CPF'}</Label>
                      <Input
                        value={data?.empresa.cnpj ? maskCnpj(data.empresa.cnpj) : data?.empresa.cpf ? maskCpf(data.empresa.cpf) : ''}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Responsável</Label>
                      <Input value={data?.empresa.nome_responsavel ?? ''} disabled />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input {...field} onChange={e => field.onChange(maskTelefone(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-clareza text-base">Endereço</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={e => field.onChange(maskCep(e.target.value))}
                            onBlur={e => {
                              field.onBlur();
                              handleCepBlur(e.target.value);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="endereco"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="numero"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="bairro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="estado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UF</FormLabel>
                          <FormControl>
                            <Input maxLength={2} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-clareza text-base">Funcionamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="horario_funcionamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horário de funcionamento</FormLabel>
                        <FormControl>
                          <Input placeholder="Seg-Sex: 07:00-18:00 | Sáb: 07:00-12:00" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}

              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="cobranca">
          <CobrancaCard />
        </TabsContent>

        <TabsContent value="integracoes">
          <IntegracaoBlingCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const CARD_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  ativa: { label: 'Em dia', className: 'bg-emerald-500/15 text-emerald-400' },
  pendente: { label: 'Pendente', className: 'bg-amber-500/15 text-amber-400' },
  inadimplente: { label: 'Inadimplente', className: 'bg-destructive/15 text-destructive' },
  cancelada: { label: 'Cancelada', className: 'bg-gray/15 text-gray' },
};

const cartaoSchema = z.object({
  cartao_numero: z.string().min(1, 'Informe o número do cartão'),
  cartao_nome: z.string().min(1, 'Informe o nome impresso no cartão'),
  cartao_validade: z.string().min(1, 'Informe a validade'),
  cartao_cvv: z.string().min(3, 'CVV inválido'),
});

type CartaoFormValues = z.infer<typeof cartaoSchema>;

const maskCartaoNumero = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const maskCartaoValidade = (v: string) => v.replace(/\D/g, '').slice(0, 6).replace(/^(\d{2})(\d)/, '$1/$2');

function CobrancaCard() {
  const { empresa } = useEmpresaAuth();
  const queryClient = useQueryClient();
  const [trocandoCartao, setTrocandoCartao] = useState(false);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['cobranca', empresa?.id],
    queryFn: () => buscarCobranca(empresa!.id),
    enabled: !!empresa?.id,
  });

  const cartaoForm = useForm<CartaoFormValues>({
    resolver: zodResolver(cartaoSchema),
    defaultValues: { cartao_numero: '', cartao_nome: '', cartao_validade: '', cartao_cvv: '' },
  });

  const trocarMutation = useMutation({
    mutationFn: (values: CartaoFormValues) => {
      const [cartao_mes, cartao_ano] = values.cartao_validade.split('/');
      return trocarCartaoCobranca(empresa!.id, {
        cartao_numero: values.cartao_numero.replace(/\s/g, ''),
        cartao_nome: values.cartao_nome,
        cartao_mes,
        cartao_ano,
        cartao_cvv: values.cartao_cvv,
      });
    },
    onSuccess: () => {
      toast.success('Cartão atualizado com sucesso.');
      cartaoForm.reset();
      setTrocandoCartao(false);
      queryClient.invalidateQueries({ queryKey: ['cobranca', empresa?.id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível trocar o cartão.');
    },
  });

  const cancelarMutation = useMutation({
    mutationFn: () => cancelarAssinaturaCobranca(empresa!.id),
    onSuccess: (res) => {
      const ate = res.acesso_ate ? new Date(res.acesso_ate).toLocaleDateString('pt-BR') : null;
      toast.success(ate ? `Assinatura cancelada. Seu acesso continua até ${ate}.` : 'Assinatura cancelada.');
      setConfirmarCancelamento(false);
      queryClient.invalidateQueries({ queryKey: ['cobranca', empresa?.id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível cancelar a assinatura.');
    },
  });

  function onSubmitCartao(values: CartaoFormValues) {
    const [mes, ano] = values.cartao_validade.split('/');
    if (!mes || !ano || mes.length !== 2 || ano.length !== 4) {
      cartaoForm.setError('cartao_validade', { message: 'Use o formato MM/AAAA' });
      return;
    }
    trocarMutation.mutate(values);
  }

  if (isLoading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  const status = data?.status_assinatura ?? 'pendente';
  const statusInfo = CARD_STATUS_LABEL[status] ?? CARD_STATUS_LABEL.pendente;
  const cancelada = status === 'cancelada';

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-clareza text-base">Assinatura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
              {data?.data_vencimento && (
                <span className="text-sm text-gray">
                  {cancelada ? 'Acesso liberado até' : 'Próxima cobrança em'}{' '}
                  {new Date(data.data_vencimento).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
            <p className="text-clareza font-bold">
              R$ {Number(data?.valor_plano ?? 0).toFixed(2).replace('.', ',')}
              <span className="text-gray text-xs font-normal">/mês</span>
            </p>
          </div>

          {status === 'inadimplente' && (
            <p className="text-sm text-destructive">
              A cobrança do seu cartão não foi confirmada. Atualize os dados do cartão abaixo pra reativar o acesso.
            </p>
          )}

          {data?.cartao_final && (
            <div className="flex items-center gap-2 text-sm text-gray">
              <span>Cartão atual:</span>
              <span className="text-clareza font-medium">
                {data.cartao_bandeira ? `${data.cartao_bandeira} ` : ''}•••• {data.cartao_final}
              </span>
            </div>
          )}

          {!cancelada && (
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setTrocandoCartao(v => !v)}>
                {trocandoCartao ? 'Cancelar troca de cartão' : 'Trocar cartão'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmarCancelamento(true)}
              >
                Cancelar assinatura
              </Button>
            </div>
          )}

          {cancelada && (
            <p className="text-sm text-gray">
              Sua assinatura foi cancelada. O acesso ao sistema continua liberado até a data acima; depois disso, pra
              voltar a usar o Unik Logística, é necessário fazer um novo cadastro.
            </p>
          )}
        </CardContent>
      </Card>

      {trocandoCartao && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-clareza text-base">Novo cartão</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...cartaoForm}>
              <form onSubmit={cartaoForm.handleSubmit(onSubmitCartao)} className="space-y-4">
                <FormField
                  control={cartaoForm.control}
                  name="cartao_numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do cartão</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="numeric"
                          autoComplete="cc-number"
                          placeholder="0000 0000 0000 0000"
                          onChange={e => field.onChange(maskCartaoNumero(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={cartaoForm.control}
                  name="cartao_nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome impresso no cartão</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoComplete="cc-name"
                          onChange={e => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={cartaoForm.control}
                    name="cartao_validade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Validade (MM/AAAA)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            placeholder="MM/AAAA"
                            onChange={e => field.onChange(maskCartaoValidade(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={cartaoForm.control}
                    name="cartao_cvv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CVV</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            inputMode="numeric"
                            autoComplete="cc-csc"
                            placeholder="000"
                            onChange={e => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={trocarMutation.isPending}>
                  {trocarMutation.isPending ? 'Salvando...' : 'Salvar novo cartão'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmarCancelamento}
        onOpenChange={setConfirmarCancelamento}
        title="Cancelar assinatura?"
        description="Você continua com acesso ao sistema até o fim do período já pago. Depois disso, pra voltar a usar o Unik Logística, será necessário um novo cadastro com cartão."
        confirmLabel={cancelarMutation.isPending ? 'Cancelando...' : 'Cancelar assinatura'}
        destructive
        onConfirm={() => cancelarMutation.mutate()}
      />
    </div>
  );
}

// Mesma máscara usada pra exibir CNPJ em ConfiguracoesPage — o valor que
// vem do Bling em geral já chega formatado, mas por segurança reformata a
// partir só dos dígitos.
function formatarCnpjExibicao(cnpj: string) {
  const digitos = cnpj.replace(/\D/g, '');
  if (digitos.length !== 14) return cnpj;
  return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function IntegracaoBlingCard() {
  const { empresa } = useEmpresaAuth();
  const queryClient = useQueryClient();
  const [importarPeriodoAberto, setImportarPeriodoAberto] = useState(false);
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['bling-status', empresa?.id],
    queryFn: () => buscarStatusBling(empresa!.id),
    enabled: !!empresa?.id,
  });

  const conectarMutation = useMutation({
    mutationFn: () => gerarUrlConexaoBling(empresa!.id),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao iniciar conexão com o Bling.');
    },
  });

  const desconectarMutation = useMutation({
    mutationFn: () => desconectarBling(empresa!.id),
    onSuccess: () => {
      toast.success('Bling desconectado.');
      queryClient.invalidateQueries({ queryKey: ['bling-status', empresa?.id] });
    },
    onError: () => toast.error('Erro ao desconectar o Bling.'),
  });

  const sincronizarMutation = useMutation({
    mutationFn: () => sincronizarBlingAgora(empresa!.id),
    onSuccess: (res) => {
      toast.success(res.novos > 0 ? `${res.novos} pedido(s) novo(s) importado(s).` : 'Nenhum pedido novo por enquanto.');
      queryClient.invalidateQueries({ queryKey: ['pedidos-importados', empresa?.id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao sincronizar com o Bling.');
    },
  });

  const importarPeriodoMutation = useMutation({
    mutationFn: () => sincronizarBlingAgora(empresa!.id, { dataInicial, dataFinal: dataFinal || undefined }),
    onSuccess: (res) => {
      toast.success(
        res.novos > 0
          ? `${res.novos} pedido(s) importado(s) do período. Se não aparecerem, ajuste o filtro de período em Pedidos importados pra ver.`
          : 'Nenhum pedido novo nesse período — pode ser que já estejam importados (confira o filtro de período em Pedidos importados).'
      );
      queryClient.invalidateQueries({ queryKey: ['pedidos-importados', empresa?.id] });
      setImportarPeriodoAberto(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao importar o período.');
    },
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-clareza text-base">Integração com o Bling</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-10 rounded-md" />
        ) : data?.conectado ? (
          <>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pulso" />
              <p className="text-sm text-clareza">
                Conectado
                {data.ultima_sincronizacao && (
                  <span className="text-gray"> · última sincronização {new Date(data.ultima_sincronizacao).toLocaleString('pt-BR')}</span>
                )}
              </p>
            </div>
            {data.conta_nome && (
              <div className="text-sm text-gray">
                Conta Bling conectada:{' '}
                <span className="text-clareza font-medium">
                  {data.conta_nome}
                  {data.conta_cnpj && ` (${formatarCnpjExibicao(data.conta_cnpj)})`}
                </span>
              </div>
            )}
            {data.ultimo_erro && (
              <p className="text-xs text-destructive">Último erro: {data.ultimo_erro}</p>
            )}
            <p className="text-sm text-gray">
              Pedidos criados no Bling caem automaticamente na fila de{' '}
              <span className="text-clareza">Pedidos importados</span>, pra você só escolher entregador e excursão.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" size="sm" disabled={sincronizarMutation.isPending} onClick={() => sincronizarMutation.mutate()}>
                {sincronizarMutation.isPending ? 'Sincronizando...' : 'Sincronizar agora'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setImportarPeriodoAberto(v => !v)}>
                {importarPeriodoAberto ? 'Cancelar importação por período' : 'Importar período específico'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={desconectarMutation.isPending}
                onClick={() => desconectarMutation.mutate()}
              >
                Desconectar
              </Button>
            </div>

            <SeletorLojasBling empresaId={empresa!.id} lojasSelecionadasAtuais={data.lojas_selecionadas} />

            {importarPeriodoAberto && (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="text-sm text-gray">
                  Busca no Bling os pedidos feitos no período abaixo, mesmo os anteriores à conexão da integração.
                  Pedidos já importados não são duplicados.
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <div className="space-y-1">
                    <Label htmlFor="bling-data-inicial">De</Label>
                    <Input
                      id="bling-data-inicial"
                      type="date"
                      value={dataInicial}
                      onChange={e => setDataInicial(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bling-data-final">Até (opcional)</Label>
                    <Input
                      id="bling-data-final"
                      type="date"
                      value={dataFinal}
                      onChange={e => setDataFinal(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!dataInicial || importarPeriodoMutation.isPending}
                  onClick={() => importarPeriodoMutation.mutate()}
                >
                  {importarPeriodoMutation.isPending ? 'Importando...' : 'Importar período'}
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-gray">
              Conecte sua conta do Bling pra trazer os pedidos direto do seu sistema de gestão — você só completa
              entregador e excursão antes de liberar pro app.
            </p>
            <Button type="button" size="sm" disabled={conectarMutation.isPending} onClick={() => conectarMutation.mutate()}>
              {conectarMutation.isPending ? 'Abrindo...' : 'Conectar Bling'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Conta Bling pode ter várias lojas cadastradas dentro dela (site próprio,
// Mercado Livre, Shopee etc.) — deixa a empresa escolher de quais delas
// importar pedido, em vez de trazer tudo misturado. Sem nada marcado (ou
// com todas marcadas), o filtro é removido — importa de todas de novo.
function SeletorLojasBling({ empresaId, lojasSelecionadasAtuais }: { empresaId: string; lojasSelecionadasAtuais?: number[] | null }) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [selecao, setSelecao] = useState<Set<number> | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['bling-lojas', empresaId],
    queryFn: () => buscarLojasBling(empresaId),
    enabled: aberto,
  });

  useEffect(() => {
    if (data?.lojas && selecao === null) {
      const atuais = lojasSelecionadasAtuais && lojasSelecionadasAtuais.length > 0
        ? lojasSelecionadasAtuais
        : data.lojas.map(l => l.id);
      setSelecao(new Set(atuais));
    }
  }, [data, selecao, lojasSelecionadasAtuais]);

  const salvarMutation = useMutation({
    mutationFn: (lojaIds: number[]) => salvarLojasBling(empresaId, lojaIds),
    onSuccess: (res, lojaIds) => {
      toast.success(
        lojaIds.length === 0
          ? 'Voltou a importar pedidos de todas as lojas da conta.'
          : `Filtro salvo — importando só das lojas marcadas.${res.removidosDaFila > 0 ? ` ${res.removidosDaFila} pedido(s) pendente(s) de fora do filtro foram removidos da fila.` : ''}`
      );
      queryClient.invalidateQueries({ queryKey: ['bling-status', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-importados', empresaId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar as lojas selecionadas.');
    },
  });

  const alternarLoja = (id: number) => {
    setSelecao(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  };

  if (!aberto) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setAberto(true)}>
        {lojasSelecionadasAtuais && lojasSelecionadasAtuais.length > 0 ? 'Editar lojas importadas' : 'Filtrar por loja'}
      </Button>
    );
  }

  const todasMarcadas = !!(data?.lojas && selecao && data.lojas.every(l => selecao.has(l.id)));

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <p className="text-sm text-gray">
        Escolha de quais lojas cadastradas na sua conta Bling os pedidos devem ser importados. Com todas marcadas
        (ou nenhuma), importa de todas — sem filtro.
      </p>
      {isLoading ? (
        <Skeleton className="h-10 rounded-md" />
      ) : error ? (
        <p className="text-sm text-destructive">Erro ao buscar as lojas no Bling. Tente de novo em instantes.</p>
      ) : data?.lojas.length === 0 ? (
        <p className="text-sm text-gray">A conta Bling conectada não tem lojas cadastradas.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {data?.lojas.map(loja => {
            const marcada = selecao?.has(loja.id) ?? false;
            return (
              <button
                key={loja.id}
                type="button"
                onClick={() => alternarLoja(loja.id)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  marcada ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-gray hover:text-clareza'
                }`}
              >
                {marcada ? '✓ ' : ''}
                {loja.nome}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!data?.lojas.length || salvarMutation.isPending}
          onClick={() => salvarMutation.mutate(todasMarcadas ? [] : Array.from(selecao || []))}
        >
          {salvarMutation.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
