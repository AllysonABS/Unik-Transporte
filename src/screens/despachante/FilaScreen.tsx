import React, {useState, useCallback, useRef} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {DespachanteStackParamList} from '../../navigation/DespachanteNavigator';
import {Colors} from '../../theme/colors';
import {useAuth} from '../../context/AuthContext';
import {listarPedidosDespachante, PedidoData} from '../../services/api';
import {cachePedidos, getCachedPedidos} from '../../services/offlineQueue';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';
import Icon from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
import {SkeletonCard} from '../../components/Skeleton';
import OfflineBanner from '../../components/OfflineBanner';
import {hapticLight} from '../../utils/haptics';

export default function FilaScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<DespachanteStackParamList>>();
  const {despachante} = useAuth();
  const [pedidos, setPedidos] = useState<PedidoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const isOnline = useNetworkStatus();
  const jaCarregou = useRef(false);

  const carregar = async () => {
    if (!despachante?.id) return;
    if (isOnline) {
      const res = await listarPedidosDespachante(despachante.id);
      if (res.success && res.pedidos) {
        setPedidos(res.pedidos);
        cachePedidos(despachante.id, res.pedidos);
      }
    } else {
      const cached = await getCachedPedidos(despachante.id);
      if (cached) setPedidos(cached);
    }
  };

  useFocusEffect(useCallback(() => {
    if (!jaCarregou.current) {
      setLoading(true);
      carregar().finally(() => { setLoading(false); jaCarregou.current = true; });
    } else {
      carregar();
    }
  }, [despachante?.id]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregar().finally(() => setRefreshing(false));
  }, [despachante?.id]);

  const fila = pedidos.filter(p => p.status === 'aguardando');
  const emAndamento = pedidos.filter(p => p.status === 'em_transito');

  const iniciarColeta = (p: PedidoData) => {
    hapticLight();
    navigation.navigate('Checklist', {pedidoId: p.id, etapa: 'coleta', volumes: p.volumes});
  };

  const filtrados = fila.filter(p => {
    const q = busca.toLowerCase();
    return !q || p.cliente_nome.toLowerCase().includes(q) || p.excursao_nome.toLowerCase().includes(q);
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
          placeholder="Buscar pedido..."
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
        ) : filtrados.map(p => (
          <View key={p.id} style={s.card} accessibilityLabel={`Pedido ${p.numero}, ${p.cliente_nome}, ${p.volumes} volumes`}>
            <View style={s.cardContent}>
              <View style={s.cardTop}>
                <Text style={s.pedidoId}>#{p.numero}</Text>
              </View>
              <Text style={s.cliente}>{p.cliente_nome}</Text>
              <Text style={s.empresa}>{p.volumes} vol. · {p.descricao || 'Sem descrição'}</Text>
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
                accessibilityLabel={`Iniciar coleta do pedido ${p.numero}`}>
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
  resumoCard:  {flex: 1, backgroundColor: '#162433', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1E3448', gap: 4},
  resumoTopRow:{flexDirection: 'row', alignItems: 'center', gap: 6},
  resumoValor: {fontSize: 20, fontWeight: '800'},
  resumoLabel: {fontSize: 10, color: Colors.gray, fontWeight: '600'},
  searchBox:   {flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 12, backgroundColor: '#162433', borderRadius: 10, borderWidth: 1, borderColor: '#1E3448', paddingHorizontal: 14, gap: 8},
  searchInput: {flex: 1, height: 44, color: Colors.clareza, fontSize: 15},
  card:        {backgroundColor: '#162433', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#1E3448'},
  cardContent: {flex: 1},
  cardTop:     {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4},
  pedidoId:    {fontSize: 16, fontWeight: '700', color: Colors.clareza},
  cliente:     {fontSize: 14, color: Colors.clareza, marginBottom: 2},
  empresa:     {fontSize: 13, color: '#60A5FA', marginBottom: 4},
  destinoRow:  {flexDirection: 'row', alignItems: 'center', gap: 4},
  destino:     {fontSize: 12, color: Colors.gray},
  actions:     {alignItems: 'center', gap: 8},
  iniciarBtn:  {backgroundColor: Colors.pulso, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6},
  iniciarText: {color: Colors.matriz, fontWeight: '700', fontSize: 13},
});
