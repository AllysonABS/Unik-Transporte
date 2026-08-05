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

export default function FilaScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<EntregadorStackParamList>>();
  const {entregador} = useAuth();
  const [pedidos, setPedidos] = useState<PedidoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string | null>(null);

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

  // Empresas distintas com pedido na fila agora — só aparece a barra de filtro
  // quando faz sentido (entregador vinculado a várias empresas ao mesmo tempo).
  const empresas = useMemo(() => {
    const nomes = new Set<string>();
    fila.forEach(p => { if (p.nome_empresa) nomes.add(p.nome_empresa); });
    return Array.from(nomes).sort((a, b) => a.localeCompare(b));
  }, [fila]);

  const iniciarColeta = (p: PedidoData) => {
    hapticLight();
    navigation.navigate('Checklist', {pedidoId: p.id, etapa: 'coleta', volumes: p.volumes});
  };

  const filtrados = fila.filter(p => {
    const q = busca.toLowerCase();
    const passaBusca = !q
      || p.cliente_nome.toLowerCase().includes(q)
      || p.excursao_nome.toLowerCase().includes(q)
      || (p.nome_empresa ?? '').toLowerCase().includes(q);
    const passaEmpresa = !empresaSelecionada || p.nome_empresa === empresaSelecionada;
    return passaBusca && passaEmpresa;
  });

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

      {empresas.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
          style={s.chipsScroll}>
          <TouchableOpacity
            style={[s.chip, !empresaSelecionada && s.chipAtivo]}
            onPress={() => setEmpresaSelecionada(null)}
            accessibilityRole="button"
            accessibilityLabel="Todas as empresas">
            <Text style={[s.chipText, !empresaSelecionada && s.chipTextAtivo]}>Todas ({fila.length})</Text>
          </TouchableOpacity>
          {empresas.map(nome => {
            const qtd = fila.filter(p => p.nome_empresa === nome).length;
            const ativo = empresaSelecionada === nome;
            return (
              <TouchableOpacity
                key={nome}
                style={[s.chip, ativo && s.chipAtivo]}
                onPress={() => setEmpresaSelecionada(ativo ? null : nome)}
                accessibilityRole="button"
                accessibilityLabel={`Filtrar por ${nome}`}>
                <Text style={[s.chipText, ativo && s.chipTextAtivo]} numberOfLines={1}>{nome} ({qtd})</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

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
        ) : filtrados.map(p => (
          <View key={p.id} style={s.card} accessibilityLabel={`Pedido de ${p.cliente_nome}, ${p.volumes} volumes, empresa ${p.nome_empresa ?? ''}`}>
            <View style={s.cardContent}>
              {!!p.nome_empresa && (
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
                onPress={() => iniciarColeta(p)}
                accessibilityRole="button"
                accessibilityLabel={`Iniciar coleta do pedido de ${p.cliente_nome}`}>
                <Icon name="play" size={14} color={Colors.matriz} />
                <Text style={s.iniciarText}>Iniciar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:   {flex: 1, backgroundColor: Colors.matriz},
  header:      {flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 56, paddingBottom: 12, gap: 12},
  title:       {fontSize: 20, fontWeight: '700', color: Colors.clareza},
  badge:       {backgroundColor: Colors.pulso, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3},
  badgeText:   {color: Colors.matriz, fontWeight: '800', fontSize: 14},
  resumoRow:   {flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginBottom: 12},
  resumoCard:  {flex: 1, backgroundColor: '#102255', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1E3A6B', gap: 4},
  resumoTopRow:{flexDirection: 'row', alignItems: 'center', gap: 6},
  resumoValor: {fontSize: 20, fontWeight: '800'},
  resumoLabel: {fontSize: 10, color: Colors.gray, fontWeight: '600'},
  searchBox:   {flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 12, backgroundColor: '#102255', borderRadius: 10, borderWidth: 1, borderColor: '#1E3A6B', paddingHorizontal: 14, gap: 8},
  searchInput: {flex: 1, height: 44, color: Colors.clareza, fontSize: 15},
  chipsScroll: {marginBottom: 12},
  chipsRow:    {flexDirection: 'row', gap: 8, paddingHorizontal: 24},
  chip:        {flexDirection: 'row', alignItems: 'center', backgroundColor: '#102255', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#1E3A6B'},
  chipAtivo:   {backgroundColor: Colors.pulso, borderColor: Colors.pulso},
  chipText:    {fontSize: 12, fontWeight: '600', color: Colors.gray, maxWidth: 160},
  chipTextAtivo:{color: Colors.matriz},
  card:        {backgroundColor: '#102255', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#1E3A6B'},
  cardContent: {flex: 1},
  empresaBadge:{flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4},
  empresaBadgeText:{fontSize: 11, fontWeight: '700', color: '#60A5FA'},
  cliente:     {fontSize: 14, color: Colors.clareza, marginBottom: 2, marginTop: 2},
  detalhes:    {fontSize: 13, color: Colors.gray, marginBottom: 4},
  destinoRow:  {flexDirection: 'row', alignItems: 'center', gap: 4},
  destino:     {fontSize: 12, color: Colors.gray},
  actions:     {alignItems: 'center', gap: 8},
  iniciarBtn:  {backgroundColor: Colors.pulso, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6},
  iniciarText: {color: Colors.matriz, fontWeight: '700', fontSize: 13},
});
