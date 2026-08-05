import React, {useState, useCallback, useRef} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {Colors} from '../../theme/colors';
import {useAuth} from '../../context/AuthContext';
import {listarPedidosEmpresa, listarDespachantes, PedidoData} from '../../services/api';
import Icon from '../../components/Icon';
import {hapticLight} from '../../utils/haptics';

const periodos = ['Hoje', 'Semana', 'Mês'] as const;
type Periodo = typeof periodos[number];

function isHoje(date: string): boolean {
  const d = new Date(date);
  const hoje = new Date();
  return d.toDateString() === hoje.toDateString();
}

function isSemana(date: string): boolean {
  const d = new Date(date).getTime();
  const agora = Date.now();
  return agora - d < 7 * 24 * 60 * 60 * 1000;
}

function isMes(date: string): boolean {
  const d = new Date(date);
  const hoje = new Date();
  return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
}

export default function RelatoriosScreen() {
  const navigation = useNavigation();
  const {empresa} = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>('Semana');
  const [pedidos, setPedidos] = useState<PedidoData[]>([]);
  const [despachantes, setDespachantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const jaCarregou = useRef(false);

  const carregarDados = useCallback(async (isRefresh = false) => {
    if (!empresa?.id) return;
    if (isRefresh) setRefreshing(true);
    else if (!jaCarregou.current) setLoading(true);
    setErro(null);
    try {
      const [resPed, resDesp] = await Promise.all([
        listarPedidosEmpresa(empresa.id),
        listarDespachantes(empresa.id),
      ]);
      if (!resPed.success || !resDesp.success) {
        setErro('Erro ao carregar dados. Tente novamente.');
      }
      if (resPed.success && resPed.pedidos) setPedidos(resPed.pedidos);
      if (resDesp.success && resDesp.despachantes) setDespachantes(resDesp.despachantes);
    } catch {
      setErro('Erro de conexão. Verifique sua internet.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      jaCarregou.current = true;
    }
  }, [empresa?.id]);

  useFocusEffect(useCallback(() => { carregarDados(); }, [carregarDados]));

  // Filtra pedidos pelo período
  const filtrados = pedidos.filter(p => {
    if (periodo === 'Hoje') return isHoje(p.criado_em);
    if (periodo === 'Semana') return isSemana(p.criado_em);
    return isMes(p.criado_em);
  });

  const totalPedidos = filtrados.length;
  const entregues = filtrados.filter(p => p.status === 'entregue').length;
  const aguardando = filtrados.filter(p => p.status === 'aguardando').length;
  const emTransito = filtrados.filter(p => p.status === 'em_transito').length;
  const cancelados = filtrados.filter(p => (p.status as string) === 'cancelado').length;
  const pedidosValidos = totalPedidos - cancelados;
  const taxaEntrega = pedidosValidos > 0 ? Math.round((entregues / pedidosValidos) * 100 * 10) / 10 : 0;

  // Ranking despachantes por entregas no período
  const despEntregas = despachantes.map(d => {
    const entregas = filtrados.filter(p => p.despachante_id === d.id && p.status === 'entregue').length;
    const pendentes = filtrados.filter(p => p.despachante_id === d.id && p.status !== 'entregue').length;
    return {...d, entregas, pendentes};
  }).sort((a, b) => b.entregas - a.entregas);

  const barMax = Math.max(...despEntregas.map(x => x.entregas), 1);

  if (loading) {
    return <View style={[s.container, {justifyContent: 'center', alignItems: 'center'}]}><ActivityIndicator size="large" color={Colors.pulso} /></View>;
  }

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => carregarDados(true)} tintColor={Colors.pulso} />}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Voltar">
          <Icon name="arrow-left" size={18} color={Colors.pulso} />
          <Text style={s.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title} accessibilityRole="header">Relatórios</Text>

        {erro && (
          <View style={s.erroCard}>
            <Text style={s.erroText}>{erro}</Text>
          </View>
        )}

        <View style={s.periodoRow}>
          {periodos.map(p => (
            <TouchableOpacity key={p} style={[s.periodoBtn, periodo === p && s.periodoBtnAtivo]} onPress={() => { hapticLight(); setPeriodo(p); }} accessibilityRole="button" accessibilityState={{selected: periodo === p}}>
              <Text style={[s.periodoText, periodo === p && s.periodoTextAtivo]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Resumo */}
        <View style={s.resumoGrid}>
          <View style={s.resumoCard}>
            <Text style={s.resumoValor}>{totalPedidos}</Text>
            <Text style={s.resumoLabel}>Total pedidos</Text>
          </View>
          <View style={s.resumoCard}>
            <Text style={[s.resumoValor, {color: '#86EFAC'}]}>{entregues}</Text>
            <Text style={s.resumoLabel}>Entregues</Text>
          </View>
          <View style={s.resumoCard}>
            <Text style={[s.resumoValor, {color: '#F59E0B'}]}>{aguardando}</Text>
            <Text style={s.resumoLabel}>Aguardando</Text>
          </View>
          <View style={s.resumoCard}>
            <Text style={[s.resumoValor, {color: Colors.pulso}]}>{emTransito}</Text>
            <Text style={s.resumoLabel}>Em trânsito</Text>
          </View>
        </View>

        {/* Taxa de entrega */}
        <View style={s.taxaCard}>
          <View style={s.taxaHeader}>
            <Text style={s.taxaTitle}>Taxa de entrega</Text>
            <Text style={[s.taxaValor, {color: taxaEntrega >= 90 ? '#86EFAC' : taxaEntrega >= 50 ? '#F59E0B' : '#EF4444'}]}>{taxaEntrega}%</Text>
          </View>
          <View style={s.taxaBarBg}>
            <View style={[s.taxaBarFill, {width: `${taxaEntrega}%`, backgroundColor: taxaEntrega >= 90 ? '#86EFAC' : taxaEntrega >= 50 ? '#F59E0B' : '#EF4444'}]} />
          </View>
          <Text style={s.taxaSub}>{entregues} de {pedidosValidos} pedidos entregues{cancelados > 0 ? ` (${cancelados} cancelado${cancelados > 1 ? 's' : ''})` : ''}</Text>
        </View>

        {/* Volumes */}
        <View style={s.taxaCard}>
          <View style={s.taxaHeader}>
            <Text style={s.taxaTitle}>Total de volumes</Text>
            <Text style={[s.taxaValor, {color: '#60A5FA'}]}>{filtrados.reduce((a, p) => a + (p.volumes || 0), 0)}</Text>
          </View>
        </View>

        {/* Top despachantes */}
        <Text style={s.section}>Top Despachantes</Text>
        {despEntregas.length === 0 ? (
          <Text style={s.emptyText}>Nenhum despachante cadastrado</Text>
        ) : despEntregas.map((desp, i) => (
          <View key={desp.id} style={s.despRow}>
            <Text style={s.despPos}>#{i + 1}</Text>
            <View style={s.despInfo}>
              <Text style={s.despNome}>{desp.nome}</Text>
              <View style={s.despBarBg}>
                <View style={[s.despBarFill, {width: `${(desp.entregas / barMax) * 100}%`}]} />
              </View>
            </View>
            <View style={s.despNumbers}>
              <Text style={s.despEntregas}>{desp.entregas}</Text>
              {desp.pendentes > 0 && <Text style={s.despPendentes}>{desp.pendentes} pend.</Text>}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:      {flex: 1, backgroundColor: Colors.matriz},
  content:        {padding: 24, paddingTop: 56, paddingBottom: 40},
  title:          {fontSize: 18, fontWeight: '700', color: Colors.clareza, marginBottom: 20},
  backBtn:        {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12},
  backText:       {color: Colors.pulso, fontSize: 14, fontWeight: '600'},
  periodoRow:     {flexDirection: 'row', backgroundColor: '#102255', borderRadius: 8, padding: 4, marginBottom: 20},
  periodoBtn:     {flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6},
  periodoBtnAtivo:{backgroundColor: Colors.pulso},
  periodoText:    {fontSize: 14, fontWeight: '600', color: Colors.gray},
  periodoTextAtivo:{color: Colors.matriz},
  resumoGrid:     {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20},
  resumoCard:     {flex: 1, minWidth: '45%', backgroundColor: '#102255', borderRadius: 10, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1E3A6B'},
  resumoValor:    {fontSize: 24, fontWeight: '800', color: Colors.clareza},
  resumoLabel:    {fontSize: 11, color: Colors.gray, marginTop: 4, fontWeight: '600'},
  taxaCard:       {backgroundColor: '#102255', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#1E3A6B', marginBottom: 20},
  taxaHeader:     {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  taxaTitle:      {fontSize: 14, fontWeight: '600', color: Colors.clareza},
  taxaValor:      {fontSize: 20, fontWeight: '800'},
  taxaBarBg:      {height: 8, backgroundColor: '#1E3A6B', borderRadius: 4, overflow: 'hidden', marginBottom: 8},
  taxaBarFill:    {height: 8, borderRadius: 4},
  taxaSub:        {fontSize: 12, color: Colors.gray},
  section:        {fontSize: 13, color: Colors.gray, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600', marginBottom: 12, marginTop: 8},
  emptyText:      {fontSize: 14, color: Colors.gray, textAlign: 'center', marginTop: 10},
  erroCard:       {backgroundColor: '#2D1B1B', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#EF4444'},
  erroText:       {fontSize: 13, color: '#EF4444', fontWeight: '600', textAlign: 'center'},
  despRow:        {backgroundColor: '#102255', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1E3A6B'},
  despPos:        {fontSize: 14, fontWeight: '800', color: Colors.pulso, width: 28},
  despInfo:       {flex: 1},
  despNome:       {fontSize: 14, fontWeight: '600', color: Colors.clareza, marginBottom: 6},
  despBarBg:      {height: 6, backgroundColor: '#1E3A6B', borderRadius: 3, overflow: 'hidden'},
  despBarFill:    {height: 6, backgroundColor: Colors.pulso, borderRadius: 3},
  despNumbers:    {alignItems: 'flex-end'},
  despEntregas:   {fontSize: 14, fontWeight: '700', color: Colors.clareza},
  despPendentes:  {fontSize: 11, color: '#F59E0B', marginTop: 2},
});
