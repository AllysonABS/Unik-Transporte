import React, {useState, useCallback, useRef} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../../theme/colors';
import {useAuth} from '../../context/AuthContext';
import {listarMinhasLojas, LojaData} from '../../services/api';
import Icon from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
import {SkeletonCard} from '../../components/Skeleton';

export default function EmpresasScreen({navigation}: any) {
  const {cliente} = useAuth();
  const [busca, setBusca] = useState('');
  const [lojas, setLojas] = useState<LojaData[]>([]);
  const [loading, setLoading] = useState(true);
  const jaCarregou = useRef(false);

  const carregar = async () => {
    if (!cliente?.id) return;
    if (!jaCarregou.current) setLoading(true);
    const res = await listarMinhasLojas(cliente.id);
    if (res.success && res.lojas) setLojas(res.lojas);
    setLoading(false);
    jaCarregou.current = true;
  };

  useFocusEffect(useCallback(() => { carregar(); }, [cliente?.id]));

  const filtradas = lojas.filter(e => {
    const q = busca.toLowerCase();
    return !q || e.nome_empresa.toLowerCase().includes(q) || (e.cidade || '').toLowerCase().includes(q);
  });

  const cores = [Colors.pulso, '#60A5FA', '#34D399', '#F472B6', '#FBBF24'];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.title} accessibilityRole="header">Minhas Lojas</Text>
            <Text style={s.sub}>Toque para ver detalhes e pedidos</Text>
          </View>
          <TouchableOpacity
            style={s.buscarBtn}
            onPress={() => navigation.navigate('BuscarLojas')}
            accessibilityRole="button"
            accessibilityLabel="Buscar novas lojas">
            <Icon name="plus" size={14} color={Colors.matriz} />
            <Text style={s.buscarBtnText}>Buscar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.searchBox}>
        <Icon name="search" size={16} color={Colors.gray} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar loja..."
          placeholderTextColor={Colors.gray}
          value={busca}
          onChangeText={setBusca}
          accessibilityLabel="Buscar loja"
        />
      </View>

      {loading ? (
        <View style={s.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : filtradas.length === 0 ? (
        <EmptyState icon="shopping-bag" title="Nenhuma loja vinculada" subtitle='Toque em "+ Buscar" para encontrar lojas' />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
          {filtradas.map((e, i) => {
            const cor = cores[i % cores.length];
            return (
              <TouchableOpacity
                key={e.id}
                style={s.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('EmpresaDetail', {empresa: e})}
                accessibilityRole="button"
                accessibilityLabel={`Loja ${e.nome_empresa}, ${e.cidade || 'sem localização'}`}>
                <View style={[s.accent, {backgroundColor: cor}]} />
                <View style={s.cardContent}>
                  <View style={s.cardTop}>
                    <View style={[s.initial, {backgroundColor: cor + '18'}]}>
                      <Text style={[s.initialText, {color: cor}]}>{e.nome_empresa[0]}</Text>
                    </View>
                    <View style={s.cardInfo}>
                      <Text style={s.nome}>{e.nome_empresa}</Text>
                      <View style={s.cidadeRow}>
                        <Icon name="map-pin" size={11} color={Colors.gray} />
                        <Text style={s.cidade}>{e.cidade && e.estado ? `${e.cidade}, ${e.estado}` : 'Localização não informada'}</Text>
                      </View>
                    </View>
                    <View style={s.arrow}>
                      <Icon name="chevron-right" size={18} color={Colors.clareza} />
                    </View>
                  </View>
                  {e.horario_funcionamento ? (
                    <View style={s.cardBottom}>
                      <Icon name="clock" size={12} color={Colors.gray} />
                      <Text style={s.horarioText}>{e.horario_funcionamento}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.matriz},
  header: {padding: 24, paddingTop: 56, paddingBottom: 12},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  title: {fontSize: 24, fontWeight: '800', color: Colors.clareza},
  sub: {fontSize: 13, color: Colors.gray, marginTop: 4},
  buscarBtn: {backgroundColor: Colors.pulso, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6},
  buscarBtnText: {color: Colors.matriz, fontWeight: '700', fontSize: 13},
  searchBox: {flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 14, backgroundColor: '#102255', borderRadius: 10, borderWidth: 1, borderColor: '#1E3A6B', paddingHorizontal: 14, gap: 8},
  searchInput: {flex: 1, height: 44, color: Colors.clareza, fontSize: 15},
  list: {padding: 20, paddingTop: 0, gap: 16, paddingBottom: 40},
  card: {backgroundColor: '#102255', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#1E3A6B'},
  accent: {height: 3, width: '100%'},
  cardContent: {padding: 18},
  cardTop: {flexDirection: 'row', alignItems: 'center', gap: 14},
  initial: {width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
  initialText: {fontSize: 22, fontWeight: '800'},
  cardInfo: {flex: 1},
  nome: {fontSize: 17, fontWeight: '700', color: Colors.clareza},
  cidadeRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3},
  cidade: {fontSize: 12, color: Colors.gray},
  arrow: {width: 32, height: 32, borderRadius: 10, backgroundColor: '#1E3A6B', alignItems: 'center', justifyContent: 'center'},
  cardBottom: {marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1E3A6B', flexDirection: 'row', alignItems: 'center', gap: 6},
  horarioText: {fontSize: 13, color: Colors.gray},
});
