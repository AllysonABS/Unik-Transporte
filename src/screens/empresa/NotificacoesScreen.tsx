import React, {useState, useCallback, useRef} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../../theme/colors';
import {useAuth} from '../../context/AuthContext';
import {listarNotificacoes, marcarNotificacoesLidas, NotificacaoData} from '../../services/api';
import {tempoAtras} from '../../utils/date';
import Icon from '../../components/Icon';

const icones: Record<string, {name: string; color: string}> = {
  novo_vinculo: {name: 'link', color: '#60A5FA'},
  novo_pedido: {name: 'package', color: Colors.pulso},
  alerta: {name: 'alert-triangle', color: '#F59E0B'},
};

export default function NotificacoesScreen() {
  const navigation = useNavigation();
  const {empresa} = useAuth();
  const [notificacoes, setNotificacoes] = useState<NotificacaoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const jaCarregou = useRef(false);

  const carregar = async () => {
    if (!empresa?.id) return;
    const res = await listarNotificacoes(empresa.id);
    if (res.success && res.notificacoes) setNotificacoes(res.notificacoes);
  };

  useFocusEffect(useCallback(() => {
    if (!jaCarregou.current) {
      setLoading(true);
      carregar().finally(() => { setLoading(false); jaCarregou.current = true; });
    } else {
      carregar();
    }
    if (empresa?.id) marcarNotificacoesLidas(empresa.id);
  }, [empresa?.id]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregar().finally(() => setRefreshing(false));
  }, [empresa?.id]);

  if (loading) {
    return <View style={[s.container, s.center]}><ActivityIndicator size="large" color={Colors.pulso} /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12}}>
          <Icon name="arrow-left" size={18} color={Colors.pulso} />
          <Text style={s.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title}>Notificações</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.pulso} />}
      >
        {notificacoes.length === 0 ? (
          <View style={s.center}>
            <Icon name="bell" size={48} color={Colors.gray} />
            <Text style={s.emptyText}>Nenhuma notificação</Text>
          </View>
        ) : notificacoes.map(n => {
          const ic = icones[n.tipo] || {name: 'bell', color: Colors.gray};
          return (
          <View key={n.id} style={[s.card, !n.lida && s.cardNaoLida]}>
            <View style={s.iconWrap}>
              <Icon name={ic.name} size={20} color={ic.color} />
            </View>
            <View style={s.info}>
              <Text style={s.titulo}>{n.titulo}</Text>
              <Text style={s.mensagem}>{n.mensagem}</Text>
              <Text style={s.tempo}>{tempoAtras(n.criado_em)}</Text>
            </View>
            {!n.lida && <View style={s.dot} />}
          </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.matriz},
  center:    {flex: 1, alignItems: 'center', justifyContent: 'center'},
  header:    {padding: 24, paddingTop: 56, paddingBottom: 12},
  backText:  {color: Colors.pulso, fontSize: 14, fontWeight: '600'},
  title:     {fontSize: 22, fontWeight: '700', color: Colors.clareza},
  list:      {padding: 24, paddingTop: 0, gap: 10, paddingBottom: 40},
  card:      {backgroundColor: '#102255', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#1E3A6B'},
  cardNaoLida:{borderColor: Colors.pulso + '40', backgroundColor: '#102255'},
  iconWrap:  {width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E3A6B', alignItems: 'center', justifyContent: 'center'},
  info:      {flex: 1},
  titulo:    {fontSize: 15, fontWeight: '700', color: Colors.clareza},
  mensagem:  {fontSize: 13, color: Colors.gray, marginTop: 3},
  tempo:     {fontSize: 11, color: Colors.gray, marginTop: 6},
  dot:       {width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.pulso},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyText: {fontSize: 16, color: Colors.gray},
});
