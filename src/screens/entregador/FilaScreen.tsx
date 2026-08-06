import React, {useState, useCallback, useRef, useMemo} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {EntregadorStackParamList} from '../../navigation/EntregadorNavigator';
import {Colors} from '../../theme/colors';
import {useAuth} from '../../context/AuthContext';
import {listarPedidosEntregador, PedidoData} from '../../services/api';
import {cachePedidos, getCachedPedidos} from '../../services/offlineQueue';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';
import Icon from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
import {SkeletonCard} from '../../components/Skeleton';
import OfflineBanner from '../../components/OfflineBanner';
import {hapticLight} from '../../utils/haptics';

function PedidoCard({p, mostrarEmpresa, onIniciar}: {p: PedidoData; mostrarEmpresa: boolean; onIniciar: (p: PedidoData) => void}) {
  return (
    <View style={s.card} accessibilityLabel={`Pedido de ${p.cliente_nome}, ${p.volumes} volumes, empresa ${p.nome_empresa ?? ''}`}>
      <View style={s.cardContent}>
        {mostrarEmpresa && !!p.nome_empresa && (
          <View style={s.empresaBadge}>
            <Icon name="briefcase" size={10} color="#60A5FA" />
            <Text style={s.empresaBadgeText} numberOfLines={1}>{p.nome_empresa}</Text>
          </View>
        )}
        <Text style={s.cliente}>{p.cliente_nome}</Text>
        <Text style={s.detalhes}>{p.volumes} vol. · {p.descricao || 'Sem descrição'}</Text>
        <View style={s.destinoRow}>
          <Icon name="map-pin" size={12} color={Colors.gray} />
          <Text style={s.destino}>{p.excursao_nome}</Text>
        </View>
      </View>
      <View style={s.actions}>
        <TouchableOpacity
          style={s.iniciarBtn}
          onPress={() => onIniciar(p)}
          accessibilityRole="button"
          accessibilityLabel={`Iniciar coleta do pedido de ${p.cliente_nome}`}>
          <Icon name="play" size={14} color={Colors.clareza} />
          <Text style={s.iniciarText}>Iniciar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FilaScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<EntregadorStackParamList>>();
  const {entregador} = useAuth();
  const [pedidos, setPedidos] = useState<PedidoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // Empresas com o grupo aberto (mostrando os pedidos). Fechado por padrão —
  // é exatamente o que resolve o caso de um entregador com 200 pedidos de
  // uma única empresa (ex.: Magefield) misturados na fila.
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(new Set());

  const isOnline = useNetworkStatus();
  const jaCarregou = useRef(false);

  const carregar = async () => {
    if (!entregador?.id) return;
    if (isOnline) {
      const res = await listarPedidosEntregador(entregador.id);
      if (res.success && res.pedidos) {
        setPedidos(res.pedidos);
        cachePedidos(entregador.id, res.pedidos);
      }
    } else {
      const cached = await getCachedPedidos(entregador.id);
      if (cached) setPedidos(cached);
    }
  };

  // Recarrega ao focar a aba e a cada 15s enquanto ela estiver aberta — pedidos
  // criados pela empresa no web precisam aparecer sem o entregador ter que
  // puxar pra atualizar manualmente.
  useFocusEffect(useCallback(() => {
    if (!jaCarregou.current) {
      setLoading(true);
      carregar().finally(() => { setLoading(false); jaCarregou.current = true; });
    } else {
      carregar();
    }
    const intervalo = setInterval(carregar, 15000);
    return () => clearInterval(intervalo);
  }, [entregador?.id]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregar().finally(() => setRefreshing(false));
  }, [entregador?.id]);

  const fila = pedidos.filter(p => p.status === 'aguardando');
  const emAndamento = pedidos.filter(p => p.status === 'em_transito');

  const iniciarColeta = (p: PedidoData) => {
    hapticLight();
    navigation.navigate('Checklist', {pedidoId: p.id, etapa: 'coleta', volumes: p.volumes});
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return fila;
    return fila.filter(p =>
      p.cliente_nome.toLowerCase().includes(q)
      || p.excursao_nome.toLowerCase().includes(q)
      || (p.nome_empresa ?? '').toLowerCase().includes(q),
    );
  }, [fila, busca]);

  // Agrupa por empresa — pra um entregador que atende várias empresas (ou
  // uma só com centenas de clientes, tipo a Magefield) não ficar tudo numa
  // lista só. Mantém a ordem alfabética.
  const grupos = useMemo(() => {
    const mapa = new Map<string, PedidoData[]>();
    filtrados.forEach(p => {
      const chave = p.nome_empresa || 'Sem empresa';
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(p);
    });
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtrados]);

  const buscaAtiva = busca.trim().length > 0;

  const toggleGrupo = (nome: string) => {
    hapticLight();
    setGruposAbertos(prev => {
      const novo = new Set(prev);
      if (novo.has(nome)) novo.delete(nome);
      else novo.add(nome);
      return novo;
    });
  };

  return (
    <View style={s.container}>
      <OfflineBanner />
      <View style={s.header}>
        <Text style={s.title} accessibilityRole="header">Fila de Expedição</Text>
        <View style={s.badge}><Text style={s.badgeText}>{fila.length}</Text></View>
      </View>

      <View style={s.resumoRow}>
        <View style={s.resumoCard} accessibilityLabel={`Na fila: ${fila.length}`}>
          <View style={s.resumoTopRow}>
            <Icon name="clock" size={16} color="#F59E0B" />
            <Text style={[s.resumoValor, {color: '#F59E0B'}]}>{fila.length}</Text>
          </View>
          <Text style={s.resumoLabel}>Na fila</Text>
        </View>
        <View style={s.resumoCard} accessibilityLabel={`Em andamento: ${emAndamento.length}`}>
          <View style={s.resumoTopRow}>
            <Icon name="navigation" size={16} color={Colors.pulso} />
            <Text style={[s.resumoValor, {color: Colors.pulso}]}>{emAndamento.length}</Text>
          </View>
          <Text style={s.resumoLabel}>Em andamento</Text>
        </View>
        <View style={s.resumoCard} accessibilityLabel={`Entregues: ${pedidos.filter(p => p.status === 'entregue').length}`}>
          <View style={s.resumoTopRow}>
            <Icon name="check-circle" size={16} color="#86EFAC" />
            <Text style={[s.resumoValor, {color: '#86EFAC'}]}>{pedidos.filter(p => p.status === 'entregue').length}</Text>
          </View>
          <Text style={s.resumoLabel}>Entregues</Text>
        </View>
      </View>

      <View style={s.searchBox}>
        <Icon name="search" size={16} color={Colors.gray} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar pedido ou empresa..."
          placeholderTextColor={Colors.gray}
          value={busca}
          onChangeText={setBusca}
          accessibilityLabel="Buscar pedido"
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{padding: 24, paddingTop: 0, gap: 10}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.pulso} />}
      >
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filtrados.length === 0 ? (
          <EmptyState icon="inbox" title="Nenhum pedido na fila" subtitle="Novos pedidos aparecerão aqui quando forem criados" />
        ) : grupos.length === 1 ? (
          // Uma empresa só — mostra a lista direto, sem cabeçalho de grupo pra abrir.
          grupos[0][1].map(p => <PedidoCard key={p.id} p={p} mostrarEmpresa={false} onIniciar={iniciarColeta} />)
        ) : (
          grupos.map(([nome, itens]) => {
            const aberto = buscaAtiva || gruposAbertos.has(nome);
            return (
              <View key={nome}>
                <TouchableOpacity
                  style={s.grupoHeader}
                  onPress={() => toggleGrupo(nome)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{expanded: aberto}}
                  accessibilityLabel={`${nome}, ${itens.length} pedido${itens.length === 1 ? '' : 's'}`}>
                  <Icon name="briefcase" size={14} color="#60A5FA" />
                  <Text style={s.grupoNome} numberOfLines={1}>{nome}</Text>
                  <View style={s.grupoBadge}><Text style={s.grupoBadgeText}>{itens.length}</Text></View>
                  <Icon name={aberto ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gray} />
                </TouchableOpacity>
                {aberto && (
                  <View style={s.grupoLista}>
                    {itens.map(p => <PedidoCard key={p.id} p={p} mostrarEmpresa={false} onIniciar={iniciarColeta} />)}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:   {flex: 1, backgroundColor: Colors.matriz},
  header:      {flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 56, paddingBottom: 12, gap: 12},
  title:       {fontSize: 20, fontWeight: '700', color: Colors.clareza},
  badge:       {backgroundColor: Colors.pulso, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3},
  badgeText:   {color: Colors.clareza, fontWeight: '800', fontSize: 14},
  resumoRow:   {flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginBottom: 12},
  resumoCard:  {flex: 1, backgroundColor: '#081544', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#0B1E5A', gap: 4},
  resumoTopRow:{flexDirection: 'row', alignItems: 'center', gap: 6},
  resumoValor: {fontSize: 20, fontWeight: '800'},
  resumoLabel: {fontSize: 10, color: Colors.gray, fontWeight: '600'},
  searchBox:   {flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 12, backgroundColor: '#081544', borderRadius: 10, borderWidth: 1, borderColor: '#0B1E5A', paddingHorizontal: 14, gap: 8},
  searchInput: {flex: 1, height: 44, color: Colors.clareza, fontSize: 15},
  grupoHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#081544', borderRadius: 10, borderWidth: 1, borderColor: '#0B1E5A', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4},
  grupoNome:   {flex: 1, fontSize: 14, fontWeight: '700', color: Colors.clareza},
  grupoBadge:  {backgroundColor: '#60A5FA20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2},
  grupoBadgeText:{color: '#60A5FA', fontWeight: '800', fontSize: 12},
  grupoLista:  {gap: 10, marginTop: 8, marginBottom: 4},
  card:        {backgroundColor: '#081544', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#0B1E5A'},
  cardContent: {flex: 1},
  empresaBadge:{flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4},
  empresaBadgeText:{fontSize: 11, fontWeight: '700', color: '#60A5FA'},
  cliente:     {fontSize: 14, color: Colors.clareza, marginBottom: 2, marginTop: 2},
  detalhes:    {fontSize: 13, color: Colors.gray, marginBottom: 4},
  destinoRow:  {flexDirection: 'row', alignItems: 'center', gap: 4},
  destino:     {fontSize: 12, color: Colors.gray},
  actions:     {alignItems: 'center', gap: 8},
  iniciarBtn:  {backgroundColor: Colors.pulso, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6},
  iniciarText: {color: Colors.clareza, fontWeight: '700', fontSize: 13},
});
