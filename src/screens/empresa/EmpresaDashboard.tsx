import React, {useState, useEffect, useCallback, useRef} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {Colors} from '../../theme/colors';
import {useAuth} from '../../context/AuthContext';
import {contarNotificacoesNaoLidas, buscarDashboardEmpresa, PedidoData} from '../../services/api';
import {requestNotificationPermission, getFCMToken, registrarTokenEmpresa, onForegroundMessage} from '../../services/notifications';
import {formatHora} from '../../utils/date';
import Icon from '../../components/Icon';
import {SkeletonCard} from '../../components/Skeleton';
import PhotoGallery from '../../components/PhotoGallery';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const statusCor: Record<string, string> = {
  aguardando: '#F59E0B',
  em_transito: Colors.pulso,
  entregue: '#86EFAC',
};

export default function EmpresaDashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {empresa} = useAuth();
  const [naoLidas, setNaoLidas] = useState(0);
  const [pedidos, setPedidos] = useState<PedidoData[]>([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [totalDespachantes, setTotalDespachantes] = useState(0);
  const [totalExcursoes, setTotalExcursoes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detalhe, setDetalhe] = useState<PedidoData | null>(null);
  const jaCarregou = useRef(false);

  useEffect(() => {
    (async () => {
      if (!empresa?.id) return;
      const permitido = await requestNotificationPermission();
      if (!permitido) return;
      const token = await getFCMToken();
      if (token) await registrarTokenEmpresa(empresa.id, token);
    })();
  }, [empresa?.id]);

  useFocusEffect(useCallback(() => {
    if (!empresa?.id) return;
    const carregar = async () => {
      const r = await buscarDashboardEmpresa(empresa.id);
      if (r.success) {
        if (r.pedidos) setPedidos(r.pedidos);
        if (r.stats) {
          setNaoLidas(r.stats.notificacoes_nao_lidas);
          setTotalClientes(r.stats.total_clientes);
          setTotalDespachantes(r.stats.total_despachantes);
          setTotalExcursoes(r.stats.total_excursoes);
        }
      }
    };
    if (!jaCarregou.current) {
      setLoading(true);
      carregar().finally(() => { setLoading(false); jaCarregou.current = true; });
    } else {
      carregar();
    }
  }, [empresa?.id]));

  useFocusEffect(useCallback(() => {
    if (!empresa?.id) return;
    const interval = setInterval(() => {
      contarNotificacoesNaoLidas(empresa.id).then(r => { if (r.success) setNaoLidas(r.total || 0); });
    }, 60000);
    return () => clearInterval(interval);
  }, [empresa?.id]));

  useEffect(() => {
    const unsub = onForegroundMessage(() => {
      if (empresa?.id) contarNotificacoesNaoLidas(empresa.id).then(r => { if (r.success) setNaoLidas(r.total || 0); });
    });
    return unsub;
  }, [empresa?.id]);

  const hoje = new Date().toDateString();
  const pedidosHoje = pedidos.filter(p => new Date(p.criado_em).toDateString() === hoje);
  const emTransito = pedidos.filter(p => p.status === 'em_transito').length;
  const aguardando = pedidos.filter(p => p.status === 'aguardando').length;
  const entreguesHoje = pedidosHoje.filter(p => p.status === 'entregue').length;
  const recentes = pedidos.slice(0, 5);

  const stats = [
    {label: 'Clientes ativos', value: String(totalClientes), icon: 'users', color: Colors.pulso, route: 'Clientes'},
    {label: 'Despachantes', value: String(totalDespachantes), icon: 'truck', color: '#60A5FA', route: 'Despachantes'},
    {label: 'Excursões', value: String(totalExcursoes), icon: 'map', color: '#F59E0B', route: 'Excursões'},
    {label: 'Pedidos hoje', value: String(pedidosHoje.length), icon: 'package', color: '#C084FC', route: 'Pedidos'},
  ];

  const statusPedidos = [
    {label: 'Em trânsito', valor: emTransito, cor: Colors.pulso, icon: 'navigation', route: 'Pedidos'},
    {label: 'Aguardando', valor: aguardando, cor: '#F59E0B', icon: 'clock', route: 'Pedidos'},
    {label: 'Entregues hoje', valor: entreguesHoje, cor: '#86EFAC', icon: 'check-circle', route: 'Pedidos'},
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting} accessibilityRole="text">{getGreeting()}</Text>
          <Text style={s.company} accessibilityRole="header">{empresa?.nome_empresa || 'Na Rota Transportes'}</Text>
        </View>
        <TouchableOpacity
          style={s.notifBtn}
          onPress={() => (navigation as any).navigate('Notificações')}
          accessibilityRole="button"
          accessibilityLabel={`Notificações, ${naoLidas} não lidas`}>
          <Icon name="bell" size={22} color={Colors.clareza} />
          {naoLidas > 0 && <View style={s.badgeNotif}><Text style={s.badgeNotifText}>{naoLidas > 9 ? '9+' : naoLidas}</Text></View>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : (
        <>
          <View style={s.statsGrid}>
            {stats.map(item => (
              <TouchableOpacity key={item.label} style={s.statCard} activeOpacity={0.75} onPress={() => (navigation as any).navigate(item.route)} accessibilityRole="button" accessibilityLabel={`${item.label}: ${item.value}`}>
                <View style={[s.statIconBadge, {backgroundColor: item.color + '1A'}]}>
                  <Icon name={item.icon} size={21} color={item.color} />
                </View>
                <Text style={s.statValue}>{item.value}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.section}>Status dos pedidos</Text>
          <View style={s.statusRow}>
            {statusPedidos.map(sp => (
              <TouchableOpacity key={sp.label} style={s.statusCard} activeOpacity={0.7} onPress={() => (navigation as any).navigate(sp.route)} accessibilityRole="button" accessibilityLabel={`${sp.label}: ${sp.valor}`}>
                <View style={s.statusTopRow}>
                  <Icon name={sp.icon} size={18} color={sp.cor} />
                  <Text style={[s.statusValor, {color: sp.cor}]}>{sp.valor}</Text>
                </View>
                <Text style={sp.label === 'Entregues hoje' ? s.statusLabelSm : s.statusLabel}>{sp.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.section}>Pedidos recentes</Text>
          {recentes.length === 0 ? (
            <View style={s.emptyWrap}>
              <Icon name="inbox" size={32} color={Colors.gray} />
              <Text style={s.emptyText}>Nenhum pedido criado ainda</Text>
            </View>
          ) : recentes.map(p => (
            <TouchableOpacity key={p.id} style={s.pedidoCard} activeOpacity={0.7} onPress={() => setDetalhe(p)} accessibilityRole="button" accessibilityLabel={`Pedido ${p.numero}, ${p.cliente_nome}, status ${p.status}`}>
              <View style={[s.dot, {backgroundColor: statusCor[p.status] || Colors.gray}]} />
              <View style={s.pedidoInfo}>
                <Text style={s.pedidoId}>#{p.numero} · {p.cliente_nome}</Text>
                <Text style={s.pedidoDest}>{p.excursao_nome}</Text>
              </View>
              <Text style={[s.pedidoStatus, {color: statusCor[p.status] || Colors.gray}]}>
                {p.status === 'aguardando' ? 'Aguardando' : p.status === 'em_transito' ? 'Em trânsito' : 'Entregue'}
              </Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      <Modal visible={!!detalhe} transparent animationType="slide">
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetalhe(null)} />
          <View style={s.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>#{detalhe?.numero}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                  {detalhe && (
                    <View style={[s.badge, {backgroundColor: statusCor[detalhe.status] + '20'}]}>
                      <Text style={[s.badgeText, {color: statusCor[detalhe.status]}]}>
                        {detalhe.status === 'aguardando' ? 'Aguardando' : detalhe.status === 'em_transito' ? 'Em trânsito' : 'Entregue'}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => setDetalhe(null)} style={s.closeX} accessibilityRole="button" accessibilityLabel="Fechar">
                    <Icon name="x" size={18} color={Colors.gray} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.detRow}><Text style={s.detLabel}>Cliente</Text><Text style={s.detValue}>{detalhe?.cliente_nome}</Text></View>
              <View style={s.detRow}><Text style={s.detLabel}>Despachante</Text><Text style={s.detValue}>{detalhe?.despachante_nome}</Text></View>
              <View style={s.detRow}><Text style={s.detLabel}>Excursão</Text><Text style={s.detValue}>{detalhe?.excursao_nome}</Text></View>
              <View style={s.detRow}><Text style={s.detLabel}>Volumes</Text><Text style={s.detValue}>{detalhe?.volumes}</Text></View>
              <View style={s.detRow}><Text style={s.detLabel}>Descrição</Text><Text style={s.detValue}>{detalhe?.descricao || '—'}</Text></View>

              <Text style={s.sectionTitle}>Progresso</Text>
              {detalhe?.etapas?.slice().map((etapa, i, arr) => (
                <View key={etapa.id} style={s.etapaRow}>
                  <View style={[s.etapaDot, etapa.concluida && s.etapaDotDone]} />
                  {i < arr.length - 1 && <View style={[s.etapaLine, etapa.concluida && s.etapaLineDone]} />}
                  {etapa.hora && <Text style={s.etapaHora}>{formatHora(etapa.hora)}</Text>}
                  <Text style={[s.etapaNome, etapa.concluida && s.etapaNomeDone]}>{etapa.nome}</Text>
                </View>
              ))}

              {detalhe?.fotos && detalhe.fotos.length > 0 && (
                <>
                  <Text style={s.sectionTitle}>Fotos ({detalhe.fotos.length})</Text>
                  <PhotoGallery fotos={detalhe.fotos} />
                </>
              )}

              {detalhe?.observacao ? (
                <>
                  <Text style={s.sectionTitle}>Observação</Text>
                  <Text style={s.obsText}>{detalhe.observacao}</Text>
                </>
              ) : null}

            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:   {flex: 1, backgroundColor: Colors.matriz},
  content:     {padding: 24, paddingTop: 56, paddingBottom: 40},
  header:      {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20},
  greeting:    {fontSize: 14, color: Colors.gray, marginBottom: 2},
  company:     {fontSize: 20, fontWeight: '700', color: Colors.clareza},
  notifBtn:    {position: 'relative', padding: 8},
  badgeNotif:  {position: 'absolute', top: 2, right: 2, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4},
  badgeNotifText:{color: '#FFF', fontSize: 10, fontWeight: '800'},
  statsGrid:   {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28},
  statCard:    {flex: 1, minWidth: '46%', backgroundColor: '#131F2D', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(234,235,235,0.05)', gap: 10},
  statIconBadge: {width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  statValue:   {fontSize: 26, fontWeight: '700', color: Colors.clareza},
  statLabel:   {fontSize: 12, color: Colors.gray, fontWeight: '500'},
  section:     {fontSize: 13, color: Colors.gray, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600', marginBottom: 12, marginTop: 8},
  statusRow:   {flexDirection: 'row', gap: 10, marginBottom: 20},
  statusCard:  {flex: 1, backgroundColor: '#162433', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1E3448', gap: 4},
  statusTopRow:{flexDirection: 'row', alignItems: 'center', gap: 8},
  statusValor: {fontSize: 22, fontWeight: '800'},
  statusLabel:   {fontSize: 11, color: Colors.gray, fontWeight: '600', textAlign: 'center'},
  statusLabelSm: {fontSize: 10, color: Colors.gray, fontWeight: '600', textAlign: 'center'},
  pedidoCard:  {backgroundColor: '#162433', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1E3448'},
  dot:         {width: 10, height: 10, borderRadius: 5},
  pedidoInfo:  {flex: 1},
  pedidoId:    {fontSize: 14, fontWeight: '700', color: Colors.clareza},
  pedidoDest:  {fontSize: 12, color: Colors.gray, marginTop: 2},
  pedidoStatus:{fontSize: 12, fontWeight: '700'},
  emptyWrap:    {alignItems: 'center', paddingVertical: 40, gap: 10},
  emptyText:    {fontSize: 14, color: Colors.gray, textAlign: 'center'},
  overlay:      {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  sheet:        {backgroundColor: '#0F1F2E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 40, maxHeight: '90%'},
  sheetHeader:  {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20},
  sheetTitle:   {fontSize: 20, fontWeight: '700', color: Colors.clareza},
  closeX:       {width: 32, height: 32, borderRadius: 16, backgroundColor: '#162433', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E3448'},
  badge:        {borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4},
  badgeText:    {fontSize: 12, fontWeight: '700'},
  detRow:       {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E3448'},
  detLabel:     {fontSize: 13, color: Colors.gray},
  detValue:     {fontSize: 13, fontWeight: '600', color: Colors.clareza, flex: 1, textAlign: 'right'},
  sectionTitle: {fontSize: 14, fontWeight: '700', color: Colors.pulso, marginTop: 20, marginBottom: 12},
  etapaRow:     {flexDirection: 'row', alignItems: 'center', marginBottom: 16, position: 'relative'},
  etapaDot:     {width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#1E3448', backgroundColor: '#0F1F2E', marginRight: 10},
  etapaDotDone: {backgroundColor: Colors.pulso, borderColor: Colors.pulso},
  etapaLine:    {position: 'absolute', left: 6, top: 16, width: 2, height: 20, backgroundColor: '#1E3448'},
  etapaLineDone:{backgroundColor: Colors.pulso},
  etapaNome:    {fontSize: 14, color: Colors.gray},
  etapaNomeDone:{color: Colors.clareza, fontWeight: '600'},
  etapaHora:    {fontSize: 12, color: Colors.gray, marginRight: 10, minWidth: 45},
  obsText:      {fontSize: 14, color: Colors.clareza, lineHeight: 20},
});
