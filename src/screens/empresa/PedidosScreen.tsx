import React, {useState, useCallback, useRef} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, RefreshControl, ActivityIndicator, Pressable} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../../theme/colors';
import Toast, {useToast} from '../../components/Toast';
import {useAlert} from '../../components/CustomAlert';
import {useAuth} from '../../context/AuthContext';
import PhotoGallery from '../../components/PhotoGallery';
import Icon from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
import {SkeletonCard} from '../../components/Skeleton';
import {hapticSuccess, hapticLight} from '../../utils/haptics';
import {criarPedido, listarPedidosEmpresa, getCachedPedidosEmpresa, invalidarCachePedidosEmpresa, listarClientesEmpresa, listarDespachantes, listarExcursoes, PedidoData} from '../../services/api';
import {formatHora} from '../../utils/date';

type Status = 'aguardando' | 'em_transito' | 'entregue';

const statusConfig: Record<Status, {label: string; cor: string; icon: string}> = {
  aguardando: {label: 'Aguardando', cor: '#F59E0B', icon: 'clock'},
  em_transito: {label: 'Em trânsito', cor: Colors.pulso, icon: 'navigation'},
  entregue: {label: 'Entregue', cor: '#86EFAC', icon: 'check-circle'},
};

const filtros: {label: string; value: Status | 'todos'}[] = [
  {label: 'Todos', value: 'todos'},
  {label: 'Aguardando', value: 'aguardando'},
  {label: 'Em trânsito', value: 'em_transito'},
  {label: 'Entregue', value: 'entregue'},
];

type PickerItem = {key: string; label: string; data: any};

function PickerModal({visible, title, items, onSelect, onClose, emptyText}: {
  visible: boolean; title: string; items: PickerItem[]; onSelect: (item: PickerItem) => void; onClose: () => void; emptyText: string;
}) {
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  const filtered = items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()));
  return (
    <Pressable style={pk.overlay} onPress={() => {}}>
      <View style={[pk.container, {paddingBottom: 24 + insets.bottom}]}>
        <View style={pk.handle} />
        <View style={pk.header}>
          <Text style={pk.title}>{title}</Text>
          <TouchableOpacity onPress={() => { onClose(); setSearch(''); }} style={pk.closeX} accessibilityRole="button" accessibilityLabel="Fechar">
            <Icon name="x" size={17} color={Colors.gray} />
          </TouchableOpacity>
        </View>
        <View style={pk.searchBox}>
          <Icon name="search" size={15} color={Colors.gray} />
          <TextInput style={pk.searchInput} placeholder="Buscar..." placeholderTextColor={Colors.gray} value={search} onChangeText={setSearch} />
        </View>
        <ScrollView style={pk.list} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <Text style={pk.empty}>{emptyText}</Text>
          ) : filtered.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[pk.item, index < filtered.length - 1 && pk.itemDivider]}
              onPress={() => { onSelect(item); setSearch(''); }}
              activeOpacity={0.6}>
              <Text style={pk.itemText}>{item.label}</Text>
              <Icon name="chevron-right" size={16} color="rgba(234,235,235,0.2)" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Pressable>
  );
}

const pk = StyleSheet.create({
  overlay:    {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, elevation: 20, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  container:  {backgroundColor: '#131F2D', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, maxHeight: '75%'},
  handle:     {width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(234,235,235,0.15)', alignSelf: 'center', marginBottom: 16},
  header:     {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16},
  title:      {fontSize: 19, fontWeight: '700', color: Colors.clareza, letterSpacing: -0.3},
  closeX:     {width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(234,235,235,0.06)', alignItems: 'center', justifyContent: 'center'},
  searchBox:  {flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(234,235,235,0.06)', borderRadius: 12, paddingHorizontal: 14, height: 44, gap: 10, marginBottom: 4},
  searchInput:{flex: 1, color: Colors.clareza, fontSize: 14},
  list:       {maxHeight: 280},
  item:       {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15},
  itemDivider:{borderBottomWidth: 1, borderBottomColor: 'rgba(234,235,235,0.06)'},
  itemText:   {fontSize: 15, color: Colors.clareza, fontWeight: '500'},
  empty:      {padding: 24, color: Colors.gray, fontSize: 14, textAlign: 'center'},
});

export default function PedidosScreen() {
  const {empresa} = useAuth();
  const {showToast} = useToast();
  const {show} = useAlert();
  const [pedidos, setPedidos] = useState<PedidoData[]>([]);
  const [loading, setLoading] = useState(() =>
    empresa?.id ? !getCachedPedidosEmpresa(empresa.id) : true
  );
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Status | 'todos'>('todos');
  const [detalhe, setDetalhe] = useState<PedidoData | null>(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [clientes, setClientes] = useState<any[]>([]);
  const [despachantes, setDespachantes] = useState<any[]>([]);
  const [excursoes, setExcursoes] = useState<any[]>([]);
  const [novoCliente, setNovoCliente] = useState<any>(null);
  const [novoDespachante, setNovoDespachante] = useState<any>(null);
  const [novoExcursao, setNovoExcursao] = useState<any>(null);
  const [novoVolumes, setNovoVolumes] = useState('');
  const [novoDescricao, setNovoDescricao] = useState('');
  const [showPickerCliente, setShowPickerCliente] = useState(false);
  const [showPickerDesp, setShowPickerDesp] = useState(false);
  const [showPickerExc, setShowPickerExc] = useState(false);
  const [criando, setCriando] = useState(false);
  const jaCarregou = useRef(false);

  const carregar = async () => {
    if (!empresa?.id) return;
    const res = await listarPedidosEmpresa(empresa.id);
    if (res.success && res.pedidos) setPedidos(res.pedidos);
  };

  const carregarDadosForm = async () => {
    if (!empresa?.id) return;
    const [resCli, resDesp, resExc] = await Promise.all([
      listarClientesEmpresa(empresa.id),
      listarDespachantes(empresa.id),
      listarExcursoes(empresa.id),
    ]);
    if (resCli.success && resCli.clientes) setClientes(resCli.clientes);
    if (resDesp.success && resDesp.despachantes) setDespachantes(resDesp.despachantes);
    if (resExc.success && resExc.excursoes) setExcursoes(resExc.excursoes);
  };

  useFocusEffect(useCallback(() => {
    if (!jaCarregou.current) {
      const cached = empresa?.id ? getCachedPedidosEmpresa(empresa.id) : null;
      if (cached) {
        setPedidos(cached);
        setLoading(false);
        jaCarregou.current = true;
        carregar();
      } else {
        setLoading(true);
        carregar().finally(() => { setLoading(false); jaCarregou.current = true; });
      }
    } else {
      carregar();
    }
  }, [empresa?.id]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregar().finally(() => setRefreshing(false));
  }, [empresa?.id]);

  const abrirNovo = () => {
    carregarDadosForm();
    setNovoCliente(null); setNovoDespachante(null); setNovoExcursao(null);
    setNovoVolumes(''); setNovoDescricao('');
    setModalNovo(true);
  };

  const handleCriar = async () => {
    if (!novoCliente || !novoDespachante || !novoExcursao || !novoVolumes) {
      show({title: 'Atenção', message: 'Preencha os campos obrigatórios.', type: 'warning'}); return;
    }
    if (parseInt(novoVolumes, 10) < 1) {
      show({title: 'Atenção', message: 'A quantidade de volumes deve ser entre 1 e 100.', type: 'warning'}); return;
    }
    if (!empresa?.id) return;
    setCriando(true);
    const res = await criarPedido(empresa.id, {
      cliente_id: novoCliente.cliente_id || undefined,
      despachante_id: novoDespachante.id || undefined,
      excursao_id: novoExcursao.id || undefined,
      cliente_nome: novoCliente.nome,
      cliente_telefone: novoCliente.telefone || undefined,
      despachante_nome: novoDespachante.nome,
      excursao_nome: `${novoExcursao.nome} (Setor ${novoExcursao.setor}, Vaga ${novoExcursao.vaga})`,
      volumes: parseInt(novoVolumes, 10),
      descricao: novoDescricao || undefined,
    });
    setCriando(false);
    if (res.success) {
      hapticSuccess();
      invalidarCachePedidosEmpresa();
      showToast('Pedido criado com sucesso!', 'success');
      setModalNovo(false);
      carregar();
    } else {
      show({title: 'Erro', message: res.error || 'Falha ao criar pedido.', type: 'error'});
    }
  };

  const pedidosFiltrados = pedidos.filter(p => {
    const q = busca.toLowerCase();
    const matchBusca = !q || p.cliente_nome.toLowerCase().includes(q) || p.despachante_nome.toLowerCase().includes(q) || p.excursao_nome.toLowerCase().includes(q);
    const matchFiltro = filtro === 'todos' || p.status === filtro;
    return matchBusca && matchFiltro;
  });

  return (
    <View style={s.container}>
      <Toast />
      <View style={s.header}>
        <Text style={s.title} accessibilityRole="header">Pedidos</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={abrirNovo}
          accessibilityRole="button"
          accessibilityLabel="Criar novo pedido">
          <Icon name="plus" size={16} color={Colors.matriz} />
          <Text style={s.addBtnText}>Novo</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchBox}>
        <Icon name="search" size={16} color={Colors.gray} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar pedido..."
          placeholderTextColor={Colors.gray}
          value={busca}
          onChangeText={setBusca}
          accessibilityLabel="Buscar pedido"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtrosScroll} contentContainerStyle={s.filtrosRow}>
        {filtros.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[s.filtroChip, filtro === f.value && s.filtroAtivo]}
            onPress={() => { hapticLight(); setFiltro(f.value); }}
            accessibilityRole="button"
            accessibilityState={{selected: filtro === f.value}}
            accessibilityLabel={`Filtrar por ${f.label}`}>
            <Text style={[s.filtroText, filtro === f.value && s.filtroTextAtivo]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{padding: 24, paddingTop: 0, gap: 10}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.pulso} />}
      >
        {loading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : pedidosFiltrados.length === 0 ? (
          <EmptyState icon="package" title="Nenhum pedido encontrado" subtitle="Crie um novo pedido ou ajuste os filtros" />
        ) : pedidosFiltrados.map(p => {
          const cfg = statusConfig[p.status];
          const etapas = p.etapas || [];
          const progresso = etapas.filter(e => e.concluida).length;
          return (
            <TouchableOpacity
              key={p.id}
              style={s.card}
              onPress={() => setDetalhe(p)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Pedido ${p.numero}, ${p.cliente_nome}, ${cfg.label}`}>
              <View style={s.cardHeader}>
                <Text style={s.pedidoId}>#{p.numero}</Text>
                <View style={[s.badge, {backgroundColor: cfg.cor + '20'}]}>
                  <Icon name={cfg.icon} size={12} color={cfg.cor} />
                  <Text style={[s.badgeText, {color: cfg.cor}]}>{cfg.label}</Text>
                </View>
              </View>
              <View style={s.cardRow}>
                <Icon name="user" size={13} color={Colors.clareza} />
                <Text style={s.cardCliente}>{p.cliente_nome}</Text>
              </View>
              <View style={s.cardRow}>
                <Icon name="truck" size={13} color="#60A5FA" />
                <Text style={s.cardDesp}>{p.despachante_nome}</Text>
                <Text style={s.cardVol}> · {p.volumes} vol.</Text>
              </View>
              <View style={s.progressRow}>
                <View style={s.progressBg}>
                  <View style={[s.progressFill, {width: `${(progresso / Math.max(etapas.length, 1)) * 100}%`, backgroundColor: cfg.cor}]} />
                </View>
                <Text style={s.progressLabel}>{progresso}/{etapas.length}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal visible={!!detalhe} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setDetalhe(null)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>#{detalhe?.numero}</Text>
                <View style={s.sheetHeaderRight}>
                  {detalhe && (
                    <View style={[s.badge, {backgroundColor: statusConfig[detalhe.status].cor + '20'}]}>
                      <Icon name={statusConfig[detalhe.status].icon} size={12} color={statusConfig[detalhe.status].cor} />
                      <Text style={[s.badgeText, {color: statusConfig[detalhe.status].cor}]}>{statusConfig[detalhe.status].label}</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => setDetalhe(null)} style={s.closeX} accessibilityRole="button" accessibilityLabel="Fechar">
                    <Icon name="x" size={18} color={Colors.gray} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.detRow}><Text style={s.detLabel}>Cliente</Text><Text style={s.detValue}>{detalhe?.cliente_nome}</Text></View>
              <View style={s.detRow}><Text style={s.detLabel}>Despachante</Text><Text style={[s.detValue, s.detValueDesp]}>{detalhe?.despachante_nome}</Text></View>
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
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={modalNovo} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setModalNovo(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.sheetTitle}>Novo Pedido</Text>

              <Text style={s.label}>Cliente *</Text>
              <TouchableOpacity style={s.selectBtn} onPress={() => setShowPickerCliente(true)} accessibilityRole="button">
                <Text style={novoCliente ? s.selectValue : s.selectPlaceholder}>{novoCliente?.nome || 'Selecionar cliente...'}</Text>
                <Icon name="chevron-down" size={16} color={Colors.gray} />
              </TouchableOpacity>

              <Text style={s.label}>Despachante *</Text>
              <TouchableOpacity style={s.selectBtn} onPress={() => setShowPickerDesp(true)} accessibilityRole="button">
                <Text style={novoDespachante ? s.selectValue : s.selectPlaceholder}>{novoDespachante?.nome || 'Selecionar despachante...'}</Text>
                <Icon name="chevron-down" size={16} color={Colors.gray} />
              </TouchableOpacity>

              <Text style={s.label}>Excursão de destino *</Text>
              <TouchableOpacity style={s.selectBtn} onPress={() => setShowPickerExc(true)} accessibilityRole="button">
                <Text style={novoExcursao ? s.selectValue : s.selectPlaceholder}>{novoExcursao ? `${novoExcursao.nome} (Setor ${novoExcursao.setor}, Vaga ${novoExcursao.vaga})` : 'Selecionar excursão...'}</Text>
                <Icon name="chevron-down" size={16} color={Colors.gray} />
              </TouchableOpacity>

              <Text style={s.label}>Quantidade de volumes *</Text>
              <TextInput style={s.input} placeholder="Ex: 3" placeholderTextColor={Colors.gray} value={novoVolumes} onChangeText={text => {
                const digitos = text.replace(/[^0-9]/g, '');
                if (digitos !== '' && parseInt(digitos, 10) > 100) return;
                setNovoVolumes(digitos);
              }} keyboardType="numeric" accessibilityLabel="Quantidade de volumes" />

              <Text style={s.label}>Descrição</Text>
              <TextInput style={[s.input, {height: 70, textAlignVertical: 'top', paddingTop: 12}]} placeholder="Descreva os itens..." placeholderTextColor={Colors.gray} value={novoDescricao} onChangeText={setNovoDescricao} multiline accessibilityLabel="Descrição do pedido" />

              <View style={s.btnRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setModalNovo(false)} accessibilityRole="button" accessibilityLabel="Cancelar">
                  <Text style={s.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={handleCriar} disabled={criando} accessibilityRole="button" accessibilityLabel="Criar pedido">
                  <Text style={s.saveBtnText}>{criando ? 'Criando...' : 'Criar Pedido'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>

          <PickerModal
            visible={showPickerCliente}
            title="Selecionar Cliente"
            items={clientes.map(c => ({key: c.vinculo_id, label: c.nome, data: c}))}
            onSelect={(item) => { setNovoCliente(item.data); setShowPickerCliente(false); }}
            onClose={() => setShowPickerCliente(false)}
            emptyText="Nenhum cliente vinculado"
          />
          <PickerModal
            visible={showPickerDesp}
            title="Selecionar Despachante"
            items={despachantes.map(d => ({key: d.id, label: d.nome, data: d}))}
            onSelect={(item) => { setNovoDespachante(item.data); setShowPickerDesp(false); }}
            onClose={() => setShowPickerDesp(false)}
            emptyText="Nenhum despachante cadastrado"
          />
          <PickerModal
            visible={showPickerExc}
            title="Selecionar Excursão"
            items={excursoes.map(e => ({key: e.id, label: `${e.nome} (Setor ${e.setor}, Vaga ${e.vaga})`, data: e}))}
            onSelect={(item) => { setNovoExcursao(item.data); setShowPickerExc(false); }}
            onClose={() => setShowPickerExc(false)}
            emptyText="Nenhuma excursão cadastrada"
          />
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:    {flex: 1, backgroundColor: Colors.matriz},
  header:       {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 56, paddingBottom: 12},
  title:        {fontSize: 22, fontWeight: '700', color: Colors.clareza},
  addBtn:       {backgroundColor: Colors.pulso, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6},
  addBtnText:   {color: Colors.matriz, fontWeight: '700', fontSize: 14},
  searchBox:    {flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 10, backgroundColor: '#162433', borderRadius: 10, borderWidth: 1, borderColor: '#1E3448', paddingHorizontal: 14, gap: 8},
  searchInput:  {flex: 1, height: 44, color: Colors.clareza, fontSize: 15},
  filtrosScroll:{height: 62, marginBottom: 14},
  filtrosRow:   {paddingHorizontal: 24, gap: 8, justifyContent: 'center', flexGrow: 1, alignItems: 'center', paddingVertical: 6},
  filtroChip:   {backgroundColor: '#162433', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#1E3448'},
  filtroAtivo:  {backgroundColor: Colors.pulso + '20', borderColor: Colors.pulso},
  filtroText:   {fontSize: 13, color: Colors.gray, fontWeight: '600'},
  filtroTextAtivo:{color: Colors.pulso},
  card:         {backgroundColor: '#162433', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1E3448'},
  cardHeader:   {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  pedidoId:     {fontSize: 16, fontWeight: '700', color: Colors.clareza},
  badge:        {borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4},
  badgeText:    {fontSize: 12, fontWeight: '700'},
  cardRow:      {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4},
  cardCliente:  {fontSize: 13, color: Colors.clareza},
  cardDesp:     {fontSize: 13, color: '#60A5FA', fontWeight: '600'},
  cardVol:      {fontSize: 13, color: Colors.gray},
  progressRow:  {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8},
  progressBg:   {flex: 1, height: 6, backgroundColor: '#1E3448', borderRadius: 3, overflow: 'hidden'},
  progressFill: {height: 6, borderRadius: 3},
  progressLabel:{fontSize: 12, color: Colors.gray, fontWeight: '600'},
  overlay:      {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  sheet:        {backgroundColor: '#0F1F2E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 40, maxHeight: '90%'},
  sheetHeader:  {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20},
  sheetHeaderRight: {flexDirection: 'row', alignItems: 'center', gap: 10},
  sheetTitle:   {fontSize: 20, fontWeight: '700', color: Colors.clareza},
  closeX:       {width: 32, height: 32, borderRadius: 16, backgroundColor: '#162433', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E3448'},
  detRow:       {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E3448'},
  detLabel:     {fontSize: 13, color: Colors.gray},
  detValue:     {fontSize: 13, fontWeight: '600', color: Colors.clareza, flex: 1, textAlign: 'right'},
  detValueDesp: {color: '#60A5FA'},
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
  label:        {fontSize: 13, fontWeight: '600', color: Colors.gray, marginBottom: 6, marginTop: 12},
  input:        {height: 50, backgroundColor: '#162433', borderRadius: 8, borderWidth: 1, borderColor: '#1E3448', paddingHorizontal: 16, color: Colors.clareza, fontSize: 15},
  selectBtn:    {height: 50, backgroundColor: '#162433', borderRadius: 8, borderWidth: 1, borderColor: '#1E3448', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  selectValue:  {fontSize: 15, color: Colors.clareza, flex: 1},
  selectPlaceholder:{fontSize: 15, color: Colors.gray},
  saveBtn:      {flex: 1, height: 52, backgroundColor: Colors.pulso, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  saveBtnText:  {color: Colors.matriz, fontWeight: '700', fontSize: 16},
  btnRow:       {flexDirection: 'row', gap: 12, marginTop: 24},
  cancelBtn:    {flex: 1, height: 52, backgroundColor: '#162433', borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EF4444'},
  cancelBtnText:{color: '#EF4444', fontWeight: '700', fontSize: 16},
});
