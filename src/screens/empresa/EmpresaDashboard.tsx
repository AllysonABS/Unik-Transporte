import React, {useState, useEffect, useCallback, useRef} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated} from 'react-native';
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
    {label: 'Clientes ativos', value: String(totalClientes), icon: 'users', color: Colors.pulso},
    {label: 'Despachantes', value: String(totalDespachantes), icon: 'truck', color: '#60A5FA'},
    {label: 'Excursões', value: String(totalExcursoes), icon: 'map', color: '#F59E0B'},
    {label: 'Pedidos hoje', value: String(pedidosHoje.length), icon: 'package', color: '#C084FC'},
  ];

  const statusPedidos = [
    {label: 'Em trânsito', valor: emTransito, cor: Colors.pulso, icon: 'navigation'},
    {label: 'Aguardando', valor: aguardando, cor: '#F59E0B', icon: 'clock'},
    {label: 'Entregues hoje', valor: entreguesHoje, cor: '#86EFAC', icon: 'check-circle'},
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
              <View key={item.label} style={s.statCard} accessibilityLabel={`${item.label}: ${item.value}`}>
                <View style={s.statTopRow}>
                  <Icon name={item.icon} size={22} color={item.color} />
                  <Text style={[s.statValue, {color: item.color}]}>{item.value}</Text>
                </View>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.section}>Status dos pedidos</Text>
          <View style={s.statusRow}>
            {statusPedidos.map(sp => (
              <View key={sp.label} style={s.statusCard} accessibilityLabel={`${sp.label}: ${sp.valor}`}>
                <View style={s.statusTopRow}>
                  <Icon name={sp.icon} size={18} color={sp.cor} />
                  <Text style={[s.statusValor, {color: sp.cor}]}>{sp.valor}</Text>
                </View>
                <Text style={s.statusLabel}>{sp.label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.section}>Pedidos recentes</Text>
          {recentes.length === 0 ? (
            <View style={s.emptyWrap}>
              <Icon name="inbox" size={32} color={Colors.gray} />
              <Text style={s.emptyText}>Nenhum pedido criado ainda</Text>
            </View>
          ) : recentes.map(p => (
            <View key={p.id} style={s.pedidoCard} accessibilityLabel={`Pedido ${p.numero}, ${p.cliente_nome}, status ${p.status}`}>
              <View style={[s.dot, {backgroundColor: statusCor[p.status] || Colors.gray}]} />
              <View style={s.pedidoInfo}>
                <Text style={s.pedidoId}>#{p.numero} · {p.cliente_nome}</Text>
                <Text style={s.pedidoDest}>{p.excursao_nome}</Text>
              </View>
              <Text style={[s.pedidoStatus, {color: statusCor[p.status] || Colors.gray}]}>
                {p.status === 'aguardando' ? 'Aguardando' : p.status === 'em_transito' ? 'Em trânsito' : 'Entregue'}
              </Text>
            </View>
          ))}
        </>
      )}
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
  statsGrid:   {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24},
  statCard:    {flex: 1, minWidth: '45%', backgroundColor: '#162433', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1E3448', gap: 6},
  statTopRow:  {flexDirection: 'row', alignItems: 'center', gap: 10},
  statValue:   {fontSize: 28, fontWeight: '800'},
  statLabel:   {fontSize: 12, color: Colors.gray, fontWeight: '500'},
  section:     {fontSize: 13, color: Colors.gray, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600', marginBottom: 12, marginTop: 8},
  statusRow:   {flexDirection: 'row', gap: 10, marginBottom: 20},
  statusCard:  {flex: 1, backgroundColor: '#162433', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1E3448', gap: 4},
  statusTopRow:{flexDirection: 'row', alignItems: 'center', gap: 8},
  statusValor: {fontSize: 22, fontWeight: '800'},
  statusLabel: {fontSize: 11, color: Colors.gray, fontWeight: '600', textAlign: 'center'},
  pedidoCard:  {backgroundColor: '#162433', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1E3448'},
  dot:         {width: 10, height: 10, borderRadius: 5},
  pedidoInfo:  {flex: 1},
  pedidoId:    {fontSize: 14, fontWeight: '700', color: Colors.clareza},
  pedidoDest:  {fontSize: 12, color: Colors.gray, marginTop: 2},
  pedidoStatus:{fontSize: 12, fontWeight: '700'},
  emptyWrap:   {alignItems: 'center', paddingVertical: 40, gap: 10},
  emptyText:   {fontSize: 14, color: Colors.gray, textAlign: 'center'},
});
