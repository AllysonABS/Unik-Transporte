import React, {useState, useCallback, useRef} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, RefreshControl, Pressable} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {DespachanteStackParamList} from '../../navigation/DespachanteNavigator';
import {Colors} from '../../theme/colors';
import {useAuth} from '../../context/AuthContext';
import {listarPedidosDespachante, PedidoData} from '../../services/api';
import {cachePedidos, getCachedPedidos} from '../../services/offlineQueue';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';
import {formatHora} from '../../utils/date';
import Icon from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
import OfflineBanner from '../../components/OfflineBanner';
import {SkeletonCard} from '../../components/Skeleton';
import {hapticLight} from '../../utils/haptics';

export default function EmAndamentoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<DespachanteStackParamList>>();
  const {despachante} = useAuth();
  const [pedidos, setPedidos] = useState<PedidoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalhe, setDetalhe] = useState<PedidoData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isOnline = useNetworkStatus();
  const jaCarregou = useRef(false);

  const carregar = async () => {
    if (!despachante?.id) return;
    if (isOnline) {
      const res = await listarPedidosDespachante(despachante.id);
      if (res.success && res.pedidos) {
        setPedidos(res.pedidos.filter(p => p.status === 'em_transito'));
        cachePedidos(despachante.id, res.pedidos);
      }
    } else {
      const cached = await getCachedPedidos(despachante.id);
      if (cached) setPedidos(cached.filter((p: PedidoData) => p.status === 'em_transito'));
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

  const confirmarEntrega = (p: PedidoData) => {
    hapticLight();
    navigation.navigate('Checklist', {pedidoId: p.id, etapa: 'entrega'});
  };

  return (
    <View style={s.container}>
      <OfflineBanner />
      <View style={s.header}>
        <Text style={s.title} accessibilityRole="header">Em Andamento</Text>
        <View style={s.badge}><Text style={s.badgeText}>{pedidos.length}</Text></View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{padding: 24, paddingTop: 0, gap: 10}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.pulso} />}
      >
        {loading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : pedidos.length === 0 ? (
          <EmptyState icon="navigation" title="Nenhum pedido em andamento" subtitle="Inicie uma coleta na aba Fila para ver aqui" />
        ) : pedidos.map(p => {
          const etapaAtual = 'Em rota para a excursão';
          return (
            <View key={p.id} style={s.card} accessibilityLabel={`Pedido ${p.numero}, ${p.cliente_nome}, ${etapaAtual}`}>
              <View style={s.cardLeft}>
                <View style={s.pulse} />
              </View>
              <View style={s.info}>
                <View style={s.cardTop}>
                  <Text style={s.id}>#{p.numero} · {p.cliente_nome}</Text>
                </View>
                <Text style={s.empresa}>{p.volumes} vol.</Text>
                <View style={s.etapaRow2}>
                  <Icon name="activity" size={12} color={Colors.pulso} />
                  <Text style={s.etapa}>{etapaAtual}</Text>
                </View>
                <View style={s.destinoRow}>
                  <Icon name="map-pin" size={12} color={Colors.gray} />
                  <Text style={s.destino}>{p.excursao_nome}</Text>
                </View>
              </View>
              <View style={s.actions}>
                <TouchableOpacity
                  style={s.entregarBtn}
                  onPress={() => confirmarEntrega(p)}
                  accessibilityRole="button"
                  accessibilityLabel={`Entregar pedido ${p.numero}`}>
                  <Icon name="check" size={14} color={Colors.pulso} />
                  <Text style={s.entregarText}>Entregar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.detalhesBtn}
                  onPress={() => setDetalhe(p)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver detalhes do pedido ${p.numero}`}>
                  <Icon name="eye" size={14} color="#60A5FA" />
                  <Text style={s.detalhesText}>Detalhes</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={!!detalhe} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setDetalhe(null)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>#{detalhe?.numero}</Text>
                <TouchableOpacity onPress={() => setDetalhe(null)} style={s.closeX} accessibilityRole="button" accessibilityLabel="Fechar">
                  <Icon name="x" size={18} color={Colors.gray} />
                </TouchableOpacity>
              </View>
              <View style={s.detRow}><Text style={s.detLabel}>Cliente</Text><Text style={s.detValue}>{detalhe?.cliente_nome}</Text></View>
              <View style={s.detRow}><Text style={s.detLabel}>Destino</Text><Text style={s.detValue}>{detalhe?.excursao_nome}</Text></View>
              <View style={s.detRow}><Text style={s.detLabel}>Volumes</Text><Text style={s.detValue}>{detalhe?.volumes}</Text></View>
              <View style={s.detRow}><Text style={s.detLabel}>Descrição</Text><Text style={s.detValue}>{detalhe?.descricao || '—'}</Text></View>

              <Text style={s.sectionTitle}>Etapas</Text>
              {detalhe?.etapas?.slice().map((etapa) => (
                <View key={etapa.id} style={s.etapaRowDet}>
                  <View style={[s.etapaDot, etapa.concluida && s.etapaDotDone]} />
                  <Text style={[s.etapaNome, etapa.concluida && s.etapaNomeDone]}>{etapa.nome}</Text>
                  {etapa.hora && <Text style={s.etapaHora}>{formatHora(etapa.hora)}</Text>}
                </View>
              ))}

            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:   {flex: 1, backgroundColor: Colors.matriz},
  header:      {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 24, paddingTop: 56, paddingBottom: 20},
  title:       {fontSize: 22, fontWeight: '700', color: Colors.clareza},
  badge:       {backgroundColor: Colors.pulso, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3},
  badgeText:   {color: Colors.matriz, fontWeight: '800', fontSize: 14},
  card:        {backgroundColor: '#162433', borderRadius: 12, padding: 16, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#1E3448'},
  cardLeft:    {paddingTop: 4},
  pulse:       {width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.pulso},
  info:        {flex: 1},
  cardTop:     {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  id:          {fontSize: 14, fontWeight: '700', color: Colors.clareza},
  empresa:     {fontSize: 13, color: '#60A5FA', marginTop: 4},
  etapaRow2:   {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
  etapa:       {fontSize: 13, color: Colors.pulso},
  destinoRow:  {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
  destino:     {fontSize: 12, color: Colors.gray},
  actions:     {justifyContent: 'center', alignItems: 'center', gap: 14},
  entregarBtn: {backgroundColor: '#162433', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.pulso, flexDirection: 'row', alignItems: 'center', gap: 4},
  entregarText:{color: Colors.pulso, fontWeight: '700', fontSize: 13},
  detalhesBtn: {backgroundColor: '#162433', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#60A5FA', flexDirection: 'row', alignItems: 'center', gap: 4},
  detalhesText:{color: '#60A5FA', fontWeight: '700', fontSize: 13},
  overlay:     {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  sheet:       {backgroundColor: '#0F1F2E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 40, maxHeight: '80%'},
  sheetHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16},
  sheetTitle:  {fontSize: 20, fontWeight: '700', color: Colors.clareza},
  closeX:      {width: 32, height: 32, borderRadius: 16, backgroundColor: '#162433', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E3448'},
  detRow:      {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E3448'},
  detLabel:    {fontSize: 13, color: Colors.gray},
  detValue:    {fontSize: 13, fontWeight: '600', color: Colors.clareza},
  sectionTitle:{fontSize: 14, fontWeight: '700', color: Colors.pulso, marginTop: 20, marginBottom: 12},
  etapaRowDet: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8},
  etapaDot:    {width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#1E3448', backgroundColor: '#0F1F2E'},
  etapaDotDone:{backgroundColor: Colors.pulso, borderColor: Colors.pulso},
  etapaNome:   {flex: 1, fontSize: 14, color: Colors.gray},
  etapaNomeDone:{color: Colors.clareza, fontWeight: '600'},
  etapaHora:   {fontSize: 12, color: Colors.gray},
});
