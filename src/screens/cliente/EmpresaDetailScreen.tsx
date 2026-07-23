import React, {useState} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Linking, ActivityIndicator, Image} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../../theme/colors';
import StatusBadge from '../../components/StatusBadge';
import {useAuth} from '../../context/AuthContext';
import {desvincularLoja, listarPedidosCliente, PedidoData} from '../../services/api';
import PhotoGallery from '../../components/PhotoGallery';
import {formatHora, formatData} from '../../utils/date';
import Icon from '../../components/Icon';

export default function EmpresaDetailScreen({route, navigation}: any) {
  const {empresa} = route.params;
  const {cliente} = useAuth();
  const nome = empresa.nome_empresa || empresa.nome || '';
  const cor = empresa.cor || Colors.pulso;
  const cidadeEstado = empresa.cidade && empresa.estado ? `${empresa.cidade}, ${empresa.estado}` : empresa.cidade || 'Não informado';
  const horario = empresa.horario_funcionamento || empresa.horario || '';
  const [selecionado, setSelecionado] = useState<PedidoData | null>(null);
  const [modalDesvincular, setModalDesvincular] = useState(false);
  const [pedidos, setPedidos] = useState<PedidoData[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  useFocusEffect(React.useCallback(() => {
    if (cliente?.id) {
      setLoadingPedidos(true);
      listarPedidosCliente(cliente.id).then(res => {
        if (res.success && res.pedidos) {
          setPedidos(res.pedidos.filter(p => p.empresa_id === empresa.id));
        }
        setLoadingPedidos(false);
      });
    } else {
      setLoadingPedidos(false);
    }
  }, [cliente?.id, empresa.id]));

  const stats = [
    {label: 'Total', value: pedidos.length, color: Colors.clareza},
    {label: 'Em trânsito', value: pedidos.filter(p => p.status === 'em_transito').length, color: Colors.pulso},
    {label: 'Aguardando', value: pedidos.filter(p => p.status === 'aguardando').length, color: '#F59E0B'},
    {label: 'Entregues', value: pedidos.filter(p => p.status === 'entregue').length, color: '#86EFAC'},
  ];

  const ligar = () => {
    const num = (empresa.telefone || '').replace(/\D/g, '');
    if (num) Linking.openURL(`tel:${num}`);
  };

  const whatsapp = () => {
    const num = '55' + (empresa.telefone || '').replace(/\D/g, '');
    if (num.length > 2) Linking.openURL(`https://wa.me/${num}`);
  };

  const confirmarDesvincular = async () => {
    if (!cliente?.id) return;
    const res = await desvincularLoja(cliente.id, empresa.id);
    setModalDesvincular(false);
    if (res.success) navigation.goBack();
  };

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Icon name="arrow-left" size={22} color={Colors.clareza} />
          </TouchableOpacity>
        </View>

        <View style={s.hero}>
          <View style={[s.avatar, {backgroundColor: cor + '22'}]}>
            <Text style={[s.avatarText, {color: cor}]}>{nome[0]}</Text>
          </View>
          <Text style={s.nome}>{nome}</Text>
          <Text style={s.cnpj}>{empresa.cnpj || ''}</Text>
          <View style={s.infoPills}>
            <View style={s.pill}>
              <Text style={s.pillIcon}>📍</Text>
              <Text style={s.pillText}>{cidadeEstado}</Text>
            </View>
            {horario ? (
              <View style={s.pill}>
                <Text style={s.pillIcon}>🕐</Text>
                <Text style={s.pillText}>{horario}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={s.contatoRow}>
          <TouchableOpacity style={s.contatoBtn} onPress={whatsapp}>
            <Text style={s.contatoIcon}>💬</Text>
            <Text style={s.contatoText}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.contatoBtn, {backgroundColor: '#60A5FA20', borderColor: '#60A5FA'}]} onPress={ligar}>
            <Text style={s.contatoIcon}>📞</Text>
            <Text style={[s.contatoText, {color: '#60A5FA'}]}>Ligar</Text>
          </TouchableOpacity>
        </View>

        <View style={s.statsRow}>
          {stats.map((st, i) => (
            <View key={i} style={s.statCard}>
              <Text style={[s.statValue, {color: st.color}]}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Pedidos nesta loja</Text>
          {loadingPedidos ? (
            <ActivityIndicator color={Colors.pulso} style={{marginTop: 20}} />
          ) : pedidos.length === 0 ? (
            <Text style={s.emptyText}>Nenhum pedido nesta loja</Text>
          ) : (
            <View style={s.pedidosList}>
              {pedidos.map(p => (
                <TouchableOpacity key={p.id} style={s.pedidoCard} activeOpacity={0.8} onPress={() => setSelecionado(p)}>
                  <View style={s.pedidoLeft}>
                    <View style={s.pedidoIdRow}>
                      <Text style={s.pedidoId}>#{p.numero}</Text>
                      <Text style={s.pedidoData}>{formatData(p.criado_em)}</Text>
                    </View>
                    <Text style={s.pedidoExcursao}>{p.excursao_nome}</Text>
                  </View>
                  <StatusBadge status={p.status} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={s.section}>
          <TouchableOpacity style={s.desvincularBtn} onPress={() => setModalDesvincular(true)}>
            <Text style={s.desvincularText}>Desvincular desta loja</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal desvincular */}
      <Modal visible={modalDesvincular} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.confirmSheet}>
            <View style={s.confirmIconWrap}>
              <Text style={s.confirmIcon}>⚠️</Text>
            </View>
            <Text style={s.confirmTitle}>Desvincular</Text>
            <Text style={s.confirmMsg}>Tem certeza que deseja se desvincular de <Text style={{fontWeight: '700'}}>{nome}</Text>?</Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setModalDesvincular(false)}>
                <Text style={s.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmDangerBtn} onPress={confirmarDesvincular}>
                <Text style={s.confirmDangerText}>Desvincular</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal detalhe pedido */}
      <Modal visible={!!selecionado} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetId}>#{selecionado?.numero}</Text>
                <Text style={s.sheetSub}>{nome} · {selecionado?.excursao_nome}</Text>
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                {selecionado && <StatusBadge status={selecionado.status} />}
                <TouchableOpacity onPress={() => setSelecionado(null)} style={s.closeX} accessibilityRole="button" accessibilityLabel="Fechar">
                  <Icon name="x" size={18} color={Colors.gray} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={s.timelineTitle}>Histórico</Text>
            {selecionado?.etapas?.slice().map((t, i, arr) => (
              <View key={t.id} style={s.timelineItem}>
                <View style={s.timelineLine}>
                  <View style={[s.timelineDot, t.concluida && {backgroundColor: Colors.pulso}]} />
                  {i < arr.length - 1 && <View style={s.timelineBar} />}
                </View>
                <View style={s.timelineText}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    {t.hora && <Text style={s.timelineHora}>{formatHora(t.hora)}</Text>}
                    <Text style={s.timelineEvento}>{t.nome}</Text>
                  </View>
                </View>
              </View>
            ))}

            {selecionado?.fotos && selecionado.fotos.length > 0 && (
              <>
                <Text style={s.timelineTitle}>Fotos ({selecionado.fotos.length})</Text>
                <PhotoGallery fotos={selecionado.fotos} />
              </>
            )}

          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.matriz},
  topBar: {paddingHorizontal: 20, paddingTop: 60},
  backBtn: {width: 48, height: 48, borderRadius: 14, backgroundColor: '#162433', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E3448'},
  hero: {alignItems: 'center', paddingTop: 20, paddingBottom: 20},
  avatar: {width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16},
  avatarText: {fontSize: 36, fontWeight: '800'},
  nome: {fontSize: 24, fontWeight: '800', color: Colors.clareza},
  cnpj: {fontSize: 13, color: Colors.gray, marginTop: 4},
  infoPills: {flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center'},
  pill: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#162433', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: '#1E3448'},
  pillIcon: {fontSize: 14},
  pillText: {fontSize: 12, color: Colors.clareza, fontWeight: '500'},
  contatoRow: {flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 20},
  contatoBtn: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.pulso + '20', borderRadius: 10, paddingVertical: 14, borderWidth: 1, borderColor: Colors.pulso},
  contatoIcon: {fontSize: 18},
  contatoText: {fontSize: 14, fontWeight: '700', color: Colors.pulso},
  statsRow: {flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 28},
  statCard: {flex: 1, backgroundColor: '#162433', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1E3448'},
  statValue: {fontSize: 22, fontWeight: '800'},
  statLabel: {fontSize: 10, color: Colors.gray, marginTop: 4, fontWeight: '600', textTransform: 'uppercase'},
  section: {paddingHorizontal: 20, paddingBottom: 40},
  sectionTitle: {fontSize: 13, color: Colors.gray, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600', marginBottom: 14},
  emptyText: {fontSize: 14, color: Colors.gray, textAlign: 'center', marginTop: 10},
  pedidosList: {gap: 10},
  pedidoCard: {backgroundColor: '#162433', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#1E3448'},
  pedidoLeft: {flex: 1, marginRight: 12},
  pedidoIdRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  pedidoId: {fontSize: 16, fontWeight: '700', color: Colors.clareza},
  pedidoData: {fontSize: 11, color: Colors.gray, backgroundColor: '#1E3448', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6},
  pedidoExcursao: {fontSize: 12, color: '#60A5FA', marginTop: 4},
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end'},
  overlayCenter: {flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center'},
  sheet: {backgroundColor: '#0F1F2E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40},
  sheetHandle: {width: 40, height: 4, backgroundColor: '#1E3448', borderRadius: 2, alignSelf: 'center', marginBottom: 20},
  sheetHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24},
  sheetId: {fontSize: 20, fontWeight: '700', color: Colors.clareza},
  sheetSub: {fontSize: 13, color: Colors.gray, marginTop: 2},
  timelineTitle: {fontSize: 13, color: Colors.gray, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600', marginBottom: 16},
  timelineItem: {flexDirection: 'row', gap: 12, marginBottom: 4},
  timelineLine: {alignItems: 'center', width: 16},
  timelineDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: '#1E3448', marginTop: 3},
  timelineBar: {width: 2, flex: 1, backgroundColor: '#1E3448', marginTop: 4},
  timelineText: {flex: 1, paddingBottom: 16},
  timelineHora: {fontSize: 12, color: Colors.gray, minWidth: 45},
  timelineEvento: {fontSize: 14, color: Colors.clareza, fontWeight: '500'},
  closeX: {width: 32, height: 32, borderRadius: 16, backgroundColor: '#162433', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E3448'},
  fotosRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10},
  foto: {width: 100, height: 100, borderRadius: 10},
  desvincularBtn: {height: 52, backgroundColor: '#162433', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EF4444'},
  desvincularText: {color: '#EF4444', fontWeight: '700', fontSize: 15},
  confirmSheet: {backgroundColor: '#0F1F2E', borderRadius: 20, padding: 28, marginHorizontal: 32, alignItems: 'center'},
  confirmIconWrap: {width: 64, height: 64, borderRadius: 32, backgroundColor: '#EF444420', alignItems: 'center', justifyContent: 'center', marginBottom: 16},
  confirmIcon: {fontSize: 28},
  confirmTitle: {fontSize: 20, fontWeight: '700', color: Colors.clareza, marginBottom: 8},
  confirmMsg: {fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 20, marginBottom: 24},
  confirmBtns: {flexDirection: 'row', gap: 12, width: '100%'},
  confirmCancelBtn: {flex: 1, height: 48, backgroundColor: '#162433', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E3448'},
  confirmCancelText: {color: Colors.clareza, fontWeight: '600', fontSize: 15},
  confirmDangerBtn: {flex: 1, height: 48, backgroundColor: '#EF4444', borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  confirmDangerText: {color: '#FFF', fontWeight: '700', fontSize: 15},
});
