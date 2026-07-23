import React, {useState, useCallback, useEffect, useRef} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, RefreshControl, ActivityIndicator, Image, Pressable} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../../theme/colors';
import StatusBadge from '../../components/StatusBadge';
import {useAuth} from '../../context/AuthContext';
import {listarPedidosCliente, PedidoData} from '../../services/api';
import {requestNotificationPermission, getFCMToken, registrarTokenCliente} from '../../services/notifications';
import PhotoGallery from '../../components/PhotoGallery';
import {formatHora} from '../../utils/date';
import Icon from '../../components/Icon';

type Status = 'aguardando' | 'em_transito' | 'entregue';

const filtros: {label: string; value: Status | 'todos'}[] = [
  {label: 'Todos', value: 'todos'},
  {label: 'Aguardando', value: 'aguardando'},
  {label: 'Em trânsito', value: 'em_transito'},
  {label: 'Entregue', value: 'entregue'},
];

export default function PedidosScreen() {
  const {cliente} = useAuth();
  const [pedidos, setPedidos] = useState<PedidoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Status | 'todos'>('todos');
  const [selecionado, setSelecionado] = useState<PedidoData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Registra token FCM do cliente
  useEffect(() => {
    (async () => {
      if (!cliente?.id) return;
      const permitido = await requestNotificationPermission();
      if (!permitido) return;
      const token = await getFCMToken();
      if (token) await registrarTokenCliente(cliente.id, token);
    })();
  }, [cliente?.id]);

  // Recarrega quando recebe push em foreground
  useEffect(() => {
    const unsub = require('@react-native-firebase/messaging').default().onMessage(() => {
      carregar();
    });
    return unsub;
  }, [cliente?.id]);

  const jaCarregou = useRef(false);

  const carregar = async () => {
    if (!cliente?.id) return;
    const res = await listarPedidosCliente(cliente.id);
    if (res.success && res.pedidos) setPedidos(res.pedidos);
  };

  useFocusEffect(useCallback(() => {
    if (!jaCarregou.current) {
      setLoading(true);
      carregar().finally(() => { setLoading(false); jaCarregou.current = true; });
    } else {
      carregar();
    }
  }, [cliente?.id]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregar().finally(() => setRefreshing(false));
  }, [cliente?.id]);

  const filtrados = pedidos.filter(p => {
    const matchFiltro = filtro === 'todos' || p.status === filtro;
    return matchFiltro;
  });

  const emAndamento = pedidos.filter(p => p.status === 'em_transito').length;
  const aguardando = pedidos.filter(p => p.status === 'aguardando').length;
  const entregues = pedidos.filter(p => p.status === 'entregue').length;

  if (loading) {
    return <View style={[s.container, {justifyContent: 'center', alignItems: 'center'}]}><ActivityIndicator size="large" color={Colors.pulso} /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Meus Pedidos</Text>
      </View>

      <View style={s.resumoRow}>
        <View style={s.resumoCard}>
          <View style={s.resumoTopRow}>
            <Icon name="navigation" size={16} color={Colors.pulso} />
            <Text style={[s.resumoValor, {color: Colors.pulso}]}>{emAndamento}</Text>
          </View>
          <Text style={s.resumoLabel}>Em trânsito</Text>
        </View>
        <View style={s.resumoCard}>
          <View style={s.resumoTopRow}>
            <Icon name="clock" size={16} color="#F59E0B" />
            <Text style={[s.resumoValor, {color: '#F59E0B'}]}>{aguardando}</Text>
          </View>
          <Text style={s.resumoLabel}>Aguardando</Text>
        </View>
        <View style={s.resumoCard}>
          <View style={s.resumoTopRow}>
            <Icon name="check-circle" size={16} color="#86EFAC" />
            <Text style={[s.resumoValor, {color: '#86EFAC'}]}>{entregues}</Text>
          </View>
          <Text style={s.resumoLabel}>Entregues</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtrosScroll} contentContainerStyle={s.filtrosRow}>
        {filtros.map(f => (
          <TouchableOpacity key={f.value} style={[s.filtroChip, filtro === f.value && s.filtroAtivo]} onPress={() => setFiltro(f.value)}>
            <Text style={[s.filtroText, filtro === f.value && s.filtroTextAtivo]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{padding: 24, paddingTop: 0, gap: 10}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.pulso} />}
      >
        {filtrados.length === 0 && <Text style={s.empty}>Nenhum pedido encontrado</Text>}
        {filtrados.map(p => (
          <TouchableOpacity key={p.id} style={s.card} onPress={() => setSelecionado(p)} activeOpacity={0.8}>
            <View style={s.cardLeft}>
              <Text style={s.pedidoId}>#{p.numero}</Text>
              <Text style={s.empresa}>{p.nome_empresa || ''}</Text>
              <Text style={s.excursao}>{p.excursao_nome} · {p.volumes} vol.</Text>
            </View>
            <StatusBadge status={p.status} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={!!selecionado} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setSelecionado(null)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.sheetHeader}>
                <View>
                  <Text style={s.sheetId}>#{selecionado?.numero}</Text>
                  <Text style={s.sheetEmpresa}>{selecionado?.nome_empresa} · {selecionado?.excursao_nome}</Text>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                  {selecionado && <StatusBadge status={selecionado.status} />}
                  <TouchableOpacity onPress={() => setSelecionado(null)} style={s.closeX} accessibilityRole="button" accessibilityLabel="Fechar">
                    <Icon name="x" size={18} color={Colors.gray} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.detRow}><Text style={s.detLabel}>Volumes</Text><Text style={s.detValue}>{selecionado?.volumes}</Text></View>
              <View style={s.detRow}><Text style={s.detLabel}>Descrição</Text><Text style={s.detValue}>{selecionado?.descricao || '—'}</Text></View>

              <Text style={s.sectionTitle}>Histórico</Text>
              {selecionado?.etapas?.slice().map((t, i, arr) => (
                <View key={t.id} style={s.timelineItem}>
                  <View style={s.timelineLine}>
                    <View style={[s.timelineDot, t.concluida && {backgroundColor: Colors.pulso}]} />
                    {i < arr.length - 1 && <View style={s.timelineBar} />}
                  </View>
                  <View style={s.timelineText}>
                    <View style={s.timelineRow}>
                      {t.hora && <Text style={s.timelineHora}>{formatHora(t.hora)}</Text>}
                      <Text style={s.timelineEvento}>{t.nome}</Text>
                    </View>
                  </View>
                </View>
              ))}

              {selecionado?.fotos && selecionado.fotos.length > 0 && (
                <>
                  <Text style={s.sectionTitle}>Fotos ({selecionado.fotos.length})</Text>
                  <PhotoGallery fotos={selecionado.fotos} />
                </>
              )}

            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:      {flex: 1, backgroundColor: Colors.matriz},
  header:         {padding: 24, paddingTop: 56, paddingBottom: 12},
  title:          {fontSize: 22, fontWeight: '700', color: Colors.clareza},
  resumoRow:      {flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginBottom: 14},
  resumoCard:     {flex: 1, backgroundColor: '#162433', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1E3448'},
  resumoTopRow:   {flexDirection: 'row', alignItems: 'center', gap: 6},
  resumoValor:    {fontSize: 20, fontWeight: '800'},
  resumoLabel:    {fontSize: 10, color: Colors.gray, marginTop: 2, fontWeight: '600'},
  filtrosScroll:  {maxHeight: 44, marginBottom: 10},
  filtrosRow:     {paddingHorizontal: 24, gap: 8, justifyContent: 'center', flexGrow: 1, alignItems: 'center'},
  filtroChip:     {backgroundColor: '#162433', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#1E3448'},
  filtroAtivo:    {backgroundColor: Colors.pulso + '20', borderColor: Colors.pulso},
  filtroText:     {fontSize: 13, color: Colors.gray, fontWeight: '600'},
  filtroTextAtivo:{color: Colors.pulso},
  empty:          {textAlign: 'center', color: Colors.gray, marginTop: 40, fontSize: 15},
  card:           {backgroundColor: '#162433', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#1E3448'},
  cardLeft:       {flex: 1, marginRight: 12},
  pedidoId:       {fontSize: 16, fontWeight: '700', color: Colors.clareza},
  empresa:        {fontSize: 13, color: Colors.gray, marginTop: 2},
  excursao:       {fontSize: 12, color: '#60A5FA', marginTop: 2},
  overlay:        {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  sheet:          {backgroundColor: '#0F1F2E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 40, maxHeight: '85%'},
  sheetHeader:    {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20},
  sheetId:        {fontSize: 20, fontWeight: '700', color: Colors.clareza},
  sheetEmpresa:   {fontSize: 13, color: Colors.gray, marginTop: 2},
  detRow:         {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E3448'},
  detLabel:       {fontSize: 13, color: Colors.gray},
  detValue:       {fontSize: 13, fontWeight: '600', color: Colors.clareza, flex: 1, textAlign: 'right'},
  sectionTitle:   {fontSize: 13, color: Colors.gray, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600', marginBottom: 16, marginTop: 20},
  timelineItem:   {flexDirection: 'row', gap: 12, marginBottom: 4},
  timelineLine:   {alignItems: 'center', width: 16},
  timelineDot:    {width: 10, height: 10, borderRadius: 5, backgroundColor: '#1E3448', marginTop: 3},
  timelineBar:    {width: 2, flex: 1, backgroundColor: '#1E3448', marginTop: 4},
  timelineText:   {flex: 1, paddingBottom: 16},
  timelineRow:    {flexDirection: 'row', alignItems: 'center', gap: 8},
  timelineHora:   {fontSize: 12, color: Colors.gray, minWidth: 45},
  timelineEvento: {fontSize: 14, color: Colors.clareza, fontWeight: '500'},
  closeX:       {width: 32, height: 32, borderRadius: 16, backgroundColor: '#162433', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E3448'},
  fotosRow:       {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  foto:           {width: 100, height: 100, borderRadius: 10},
});
