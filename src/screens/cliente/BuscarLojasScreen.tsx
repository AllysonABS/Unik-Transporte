import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '../../theme/colors';
import {useAuth} from '../../context/AuthContext';
import {listarTodasLojas, vincularLoja, listarMinhasLojas, LojaData} from '../../services/api';
import {useAlert} from '../../components/CustomAlert';
import Icon from '../../components/Icon';

export default function BuscarLojasScreen() {
  const navigation = useNavigation();
  const {cliente} = useAuth();
  const {show} = useAlert();
  const [busca, setBusca] = useState('');
  const [lojas, setLojas] = useState<LojaData[]>([]);
  const [vinculadas, setVinculadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [vinculando, setVinculando] = useState<string | null>(null);

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    if (!cliente?.id) return;
    setLoading(true);
    const [resTodas, resMinhas] = await Promise.all([
      listarTodasLojas(),
      listarMinhasLojas(cliente.id),
    ]);
    if (resTodas.success && resTodas.lojas) setLojas(resTodas.lojas);
    if (resMinhas.success && resMinhas.lojas) setVinculadas(resMinhas.lojas.map(l => l.id));
    setLoading(false);
  };

  const handleVincular = async (empresaId: string) => {
    if (!cliente?.id) return;
    setVinculando(empresaId);
    const res = await vincularLoja(cliente.id, empresaId);
    setVinculando(null);
    if (res.success) {
      setVinculadas([...vinculadas, empresaId]);
      show({title: 'Sucesso', message: 'Você foi vinculado a esta loja!', type: 'success'});
    } else {
      show({title: 'Erro', message: res.error || 'Não foi possível vincular.', type: 'error'});
    }
  };

  const filtradas = lojas.filter(e => {
    const q = busca.toLowerCase();
    return !q || e.nome_empresa.toLowerCase().includes(q) || (e.cidade || '').toLowerCase().includes(q);
  });

  const cores = [Colors.pulso, '#60A5FA', '#34D399', '#F472B6', '#FBBF24'];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12}}>
          <Icon name="arrow-left" size={18} color={Colors.pulso} />
          <Text style={s.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title}>Buscar Lojas</Text>
        <Text style={s.sub}>Encontre e vincule-se a lojas disponíveis</Text>
      </View>

      <View style={s.searchBox}>
        <Icon name="search" size={16} color={Colors.gray} />
        <TextInput style={s.searchInput} placeholder="Buscar por nome ou cidade..." placeholderTextColor={Colors.gray} value={busca} onChangeText={setBusca} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.pulso} /></View>
      ) : filtradas.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyText}>Nenhuma loja encontrada</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
          {filtradas.map((e, i) => {
            const cor = cores[i % cores.length];
            const jaVinculada = vinculadas.includes(e.id);
            return (
              <View key={e.id} style={s.card}>
                <View style={[s.accent, {backgroundColor: cor}]} />
                <View style={s.cardContent}>
                  <View style={s.cardTop}>
                    <View style={[s.initial, {backgroundColor: cor + '18'}]}>
                      <Text style={[s.initialText, {color: cor}]}>{e.nome_empresa[0]}</Text>
                    </View>
                    <View style={s.cardInfo}>
                      <Text style={s.nome}>{e.nome_empresa}</Text>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3}}>
                        <Icon name="map-pin" size={11} color={Colors.gray} />
                        <Text style={s.cidade}>{e.cidade && e.estado ? `${e.cidade}, ${e.estado}` : 'Localização não informada'}</Text>
                      </View>
                      {e.horario_funcionamento ? (
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2}}>
                          <Icon name="clock" size={11} color={Colors.gray} />
                          <Text style={s.horario}>{e.horario_funcionamento}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[s.vincularBtn, jaVinculada && s.vincularBtnDisabled]}
                    onPress={() => !jaVinculada && handleVincular(e.id)}
                    disabled={jaVinculada || vinculando === e.id}>
                    {vinculando === e.id ? (
                      <ActivityIndicator color={Colors.matriz} size="small" />
                    ) : (
                      <Text style={[s.vincularBtnText, jaVinculada && s.vincularBtnTextDisabled]}>
                        {jaVinculada ? '✓ Vinculado' : 'Vincular'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
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
  backText: {color: Colors.pulso, fontSize: 14, fontWeight: '600'},
  title: {fontSize: 24, fontWeight: '800', color: Colors.clareza},
  sub: {fontSize: 13, color: Colors.gray, marginTop: 4},
  searchBox: {flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 14, backgroundColor: '#102255', borderRadius: 10, borderWidth: 1, borderColor: '#1E3A6B', paddingHorizontal: 14},
  searchIcon: {fontSize: 16, marginRight: 8},
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
  cidade: {fontSize: 12, color: Colors.gray, marginTop: 3},
  horario: {fontSize: 11, color: Colors.gray, marginTop: 2},
  vincularBtn: {marginTop: 14, height: 42, backgroundColor: Colors.pulso, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  vincularBtnDisabled: {backgroundColor: '#1E3A6B'},
  vincularBtnText: {color: Colors.matriz, fontWeight: '700', fontSize: 14},
  vincularBtnTextDisabled: {color: Colors.gray},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyText: {fontSize: 16, color: Colors.clareza, fontWeight: '600'},
});
