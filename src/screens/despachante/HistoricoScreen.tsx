import React, {useState, useCallback, useRef} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, RefreshControl, ActivityIndicator, Pressable} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../../theme/colors';
import {useAuth} from '../../context/AuthContext';
import {listarPedidosDespachante, PedidoData} from '../../services/api';
import {formatHora, formatData} from '../../utils/date';
import Icon from '../../components/Icon';

export default function HistoricoScreen() {
  const {despachante} = useAuth();
  const [pedidos, setPedidos] = useState<PedidoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [detalhe, setDetalhe] = useState<PedidoData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const jaCarregou = useRef(false);

  const carregar = async () => {
    if (!despachante?.id) return;
    const res = await listarPedidosDespachante(despachante.id);
    if (res.success && res.pedidos) setPedidos(res.pedidos.filter(p => p.status === 'entregue'));
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

  const filtrados = pedidos.filter(p => {
    const q = busca.toLowerCase();
    return !q || p.cliente_nome.toLowerCase().includes(q) || p.excursao_nome.toLowerCase().includes(q);
  });

  const totalVolumes = pedidos.reduce((a, p) => a + p.volumes, 0);

  if (loading) {
    return <View style={[s.container, {justifyContent: 'center', alignItems: 'center'}]}><ActivityIndicator size="large" color={Colors.pulso} /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Histórico</Text>
        <Text style={s.sub}>Entregas realizadas</Text>
      </View>

      <View style={s.resumoRow}>
        <View style={s.resumoCard}>
          <View style={s.resumoTopRow}>
            <Icon name="check-circle" size={16} color="#86EFAC" />
            <Text style={[s.resumoValor, {color: '#86EFAC'}]}>{pedidos.length}</Text>
          </View>
          <Text style={s.resumoLabel}>Entregas</Text>
        </View>
        <View style={s.resumoCard}>
          <View style={s.resumoTopRow}>
            <Icon name="package" size={16} color="#60A5FA" />
            <Text style={[s.resumoValor, {color: '#60A5FA'}]}>{totalVolumes}</Text>
          </View>
          <Text style={s.resumoLabel}>Volumes</Text>
        </View>
      </View>

      <View style={s.searchBox}>
        <Icon name="search" size={16} color={Colors.gray} />
        <TextInput style={s.searchInput} placeholder="Buscar entrega..." placeholderTextColor={Colors.gray} value={busca} onChangeText={setBusca} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{padding: 24, paddingTop: 0, gap: 10}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.pulso} />}
      >
        {filtrados.map(p => (
          <TouchableOpacity key={p.id} style={s.card} onPress={() => setDetalhe(p)} activeOpacity={0.8}>
            <View style={s.checkIcon}>
              <Text style={s.checkText}>✓</Text>
            </View>
            <View style={s.info}>
              <Text style={s.id}>#{p.numero} · {p.cliente_nome}</Text>
              <Text style={s.empresa}>{p.volumes} vol.</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2}}>
                <Icon name="map-pin" size={11} color={Colors.gray} />
                <Text style={s.destino}>{p.excursao_nome}</Text>
              </View>
            </View>
            <View style={s.right}>
              <Text style={s.data}>{formatData(p.atualizado_em)}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {filtrados.length === 0 && <Text style={s.empty}>Nenhuma entrega encontrada</Text>}
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
                <View key={etapa.id} style={s.etapaRow}>
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
  container:    {flex: 1, backgroundColor: Colors.matriz},
  header:       {padding: 24, paddingTop: 56, paddingBottom: 12},
  title:        {fontSize: 22, fontWeight: '700', color: Colors.clareza},
  sub:          {fontSize: 13, color: Colors.gray, marginTop: 4},
  resumoRow:    {flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginBottom: 12},
  resumoCard:   {flex: 1, backgroundColor: '#162433', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1E3448'},
  resumoTopRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  resumoValor:  {fontSize: 20, fontWeight: '800'},
  resumoLabel:  {fontSize: 10, color: Colors.gray, marginTop: 2, fontWeight: '600'},
  searchBox:    {flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 10, backgroundColor: '#162433', borderRadius: 10, borderWidth: 1, borderColor: '#1E3448', paddingHorizontal: 14},
  searchIcon:   {fontSize: 16, marginRight: 8},
  searchInput:  {flex: 1, height: 44, color: Colors.clareza, fontSize: 15},
  card:         {backgroundColor: '#162433', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#1E3448'},
  checkIcon:    {width: 32, height: 32, borderRadius: 16, backgroundColor: '#052E16', alignItems: 'center', justifyContent: 'center'},
  checkText:    {color: Colors.pulso, fontWeight: '800', fontSize: 14},
  info:         {flex: 1},
  id:           {fontSize: 14, fontWeight: '700', color: Colors.clareza},
  empresa:      {fontSize: 12, color: '#60A5FA', marginTop: 2},
  destino:      {fontSize: 12, color: Colors.gray, marginTop: 2},
  right:        {alignItems: 'flex-end'},
  data:         {fontSize: 12, color: Colors.gray},
  empty:        {textAlign: 'center', color: Colors.gray, marginTop: 40, fontSize: 15},
  overlay:      {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  sheet:        {backgroundColor: '#0F1F2E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 40, maxHeight: '85%'},
  sheetHeader:  {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16},
  sheetTitle:   {fontSize: 20, fontWeight: '700', color: Colors.clareza},
  closeX:       {width: 32, height: 32, borderRadius: 16, backgroundColor: '#162433', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E3448'},
  detRow:       {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E3448'},
  detLabel:     {fontSize: 13, color: Colors.gray},
  detValue:     {fontSize: 13, fontWeight: '600', color: Colors.clareza},
  sectionTitle: {fontSize: 14, fontWeight: '700', color: Colors.pulso, marginTop: 20, marginBottom: 12},
  etapaRow:     {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8},
  etapaDot:     {width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#1E3448', backgroundColor: '#0F1F2E'},
  etapaDotDone: {backgroundColor: Colors.pulso, borderColor: Colors.pulso},
  etapaNome:    {flex: 1, fontSize: 14, color: Colors.gray},
  etapaNomeDone:{color: Colors.clareza, fontWeight: '600'},
  etapaHora:    {fontSize: 12, color: Colors.gray},
});
