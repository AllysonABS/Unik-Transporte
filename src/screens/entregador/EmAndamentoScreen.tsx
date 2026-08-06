import React, {useState, useCallback, useRef, useMemo} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, RefreshControl, Pressable} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {EntregadorStackParamList} from '../../navigation/EntregadorNavigator';
import {Colors} from '../../theme/colors';
import {useAuth} from '../../context/AuthContext';
import {listarPedidosEntregador, PedidoData} from '../../services/api';
import {cachePedidos, getCachedPedidos} from '../../services/offlineQueue';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';
import {formatHora} from '../../utils/date';
import Icon from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
import OfflineBanner from '../../components/OfflineBanner';
import {SkeletonCard} from '../../components/Skeleton';
import {hapticLight} from '../../utils/haptics';

function PedidoEmAndamentoCard({p, onEntregar, onDetalhes}: {p: PedidoData; onEntregar: (p: PedidoData) => void; onDetalhes: (p: PedidoData) => void}) {
  const etapaAtual = 'Em rota para a excursão';
  return (
    <View style={s.card} accessibilityLabel={`Pedido de ${p.cliente_nome}, ${etapaAtual}`}>
      <View style={s.cardLeft}>
        <View style={s.pulse} />
      </View>
      <View style={s.info}>
        <View style={s.cardTop}>
          <Text style={s.id}>{p.cliente_nome}</Text>
        </View>
        <Text style={s.detalhes}>{p.volumes} vol.</Text>
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
          onPress={() => onEntregar(p)}
          accessibilityRole="button"
          accessibilityLabel={`Entregar pedido de ${p.cliente_nome}`}>
          <Icon name="check" size={14} color={Colors.pulso} />
          <Text style={s.entregarText}>Entregar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.detalhesBtn}
          onPress={() => onDetalhes(p)}
          accessibilityRole="button"
          accessibilityLabel={`Ver detalhes do pedido de ${p.cliente_nome}`}>
          <Icon name="eye" size={14} color="#60A5FA" />
          <Text style={s.detalhesText}>Detalhes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function EmAndamentoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<EntregadorStackParamList>>();
  const {entregador} = useAuth();
  const [pedidos, setPedidos] = useState<PedidoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalhe, setDetalhe] = useState<PedidoData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Mesma ideia da Fila: agrupado por empresa e fechado por padrão — pra não
  // virar uma lista gigante quando o entregador atende empresa com muitos
  // pedidos em andamento ao mesmo tempo.
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(new Set());

  const isOnline = useNetworkStatus();
  const jaCarregou = useRef(false);

  const carregar = async () => {
    if (!entregador?.id) return;
    if (isOnline) {
      const res = await listarPedidosEntregador(entregador.id);
      if (res.success && res.pedidos) {
        setPedidos(res.pedidos.filter(p => p.status === 'em_transito'));
        cachePedidos(entregador.id, res.pedidos);
      }
    } else {
      const cached = await getCachedPedidos(entregador.id);
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
    const intervalo = setInterval(carregar, 15000);
    return () => clearInterval(intervalo);
  }, [entregador?.id]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregar().finally(() => setRefreshing(false));
  }, [entregador?.id]);

  const confirmarEntrega = (p: PedidoData) => {
    hapticLight();
    navigation.navigate('Checklist', {pedidoId: p.id, etapa: 'entrega'});
  };

  const grupos = useMemo(() => {
    const mapa = new Map<string, PedidoData[]>();
    pedidos.forEach(p => {
      const chave = p.nome_empresa || 'Sem empresa';
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(p);
    });
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [pedidos]);

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
        ) : grupos.length === 1 ? (
          grupos[0][1].map(p => <PedidoEmAndamentoCard key={p.id} p={p} onEntregar={confirmarEntrega} onDetalhes={setDetalhe} />)
        ) : (
          grupos.map(([nome, itens]) => {
            const aberto = gruposAbertos.has(nome);
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
                    {itens.map(p => <PedidoEmAndamentoCard key={p.id} p={p} onEntregar={confirmarEntrega} onDetalhes={setDetalhe} />)}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!detalhe} transparent animationType="slide">
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetalhe(null)} />
          <View style={s.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle} numberOfLines={1}>{detalhe?.cliente_nome}</Text>
                <TouchableOpacity onPress={() => setDetalhe(null)} style={s.closeX} accessibilityRole="button" accessibilityLabel="Fechar">
                  <Icon name="x" size={18} color={Colors.gray} />
                </TouchableOpacity>
              </View>
              {!!detalhe?.nome_empresa && <View style={s.detRow}><Text style={s.detLabel}>Empresa</Text><Text style={s.detValue}>{detalhe.nome_empresa}</Text></View>}
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
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:   {flex: 1, backgroundColor: Colors.matriz},
  header:      {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 24, paddingTop: 56, paddingBottom: 20},
  title:       {fontSize: 22, fontWeight: '700', color: Colors.clareza},
  badge:       {backgroundColor: Colors.pulso, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3},
  badgeText:   {color: Colors.clareza, fontWeight: '800', fontSize: 14},
  grupoHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#081544', borderRadius: 10, borderWidth: 1, borderColor: '#0B1E5A', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4},
  grupoNome:   {flex: 1, fontSize: 14, fontWeight: '700', color: Colors.clareza},
  grupoBadge:  {backgroundColor: '#60A5FA20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2},
  grupoBadgeText:{color: '#60A5FA', fontWeight: '800', fontSize: 12},
  grupoLista:  {gap: 10, marginTop: 8, marginBottom: 4},
  card:        {backgroundColor: '#081544', borderRadius: 12, padding: 16, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#0B1E5A'},
  cardLeft:    {paddingTop: 4},
  pulse:       {width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.pulso},
  info:        {flex: 1},
  cardTop:     {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  id:          {fontSize: 14, fontWeight: '700', color: Colors.clareza},
  detalhes:    {fontSize: 13, color: Colors.gray, marginTop: 2},
  etapaRow2:   {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
  etapa:       {fontSize: 13, color: Colors.pulso},
  destinoRow:  {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
  destino:     {fontSize: 12, color: Colors.gray},
  actions:     {justifyContent: 'center', alignItems: 'center', gap: 14},
  entregarBtn: {backgroundColor: '#081544', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.pulso, flexDirection: 'row', alignItems: 'center', gap: 4},
  entregarText:{color: Colors.pulso, fontWeight: '700', fontSize: 13},
  detalhesBtn: {backgroundColor: '#081544', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#60A5FA', flexDirection: 'row', alignItems: 'center', gap: 4},
  detalhesText:{color: '#60A5FA', fontWeight: '700', fontSize: 13},
  overlay:     {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  sheet:       {backgroundColor: '#081544', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 40, maxHeight: '80%'},
  sheetHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16},
  sheetTitle:  {fontSize: 20, fontWeight: '700', color: Colors.clareza, flex: 1, marginRight: 8},
  closeX:      {width: 32, height: 32, borderRadius: 16, backgroundColor: '#081544', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#0B1E5A'},
  detRow:      {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0B1E5A'},
  detLabel:    {fontSize: 13, color: Colors.gray},
  detValue:    {fontSize: 13, fontWeight: '600', color: Colors.clareza},
  sectionTitle:{fontSize: 14, fontWeight: '700', color: Colors.pulso, marginTop: 20, marginBottom: 12},
  etapaRowDet: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8},
  etapaDot:    {width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#0B1E5A', backgroundColor: '#081544'},
  etapaDotDone:{backgroundColor: Colors.pulso, borderColor: Colors.pulso},
  etapaNome:   {flex: 1, fontSize: 14, color: Colors.gray},
  etapaNomeDone:{color: Colors.clareza, fontWeight: '600'},
  etapaHora:   {fontSize: 12, color: Colors.gray},
});
