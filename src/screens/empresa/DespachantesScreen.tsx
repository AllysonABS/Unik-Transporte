import React, {useState, useCallback, useRef} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, RefreshControl, ActivityIndicator, Pressable} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../../theme/colors';
import Toast, {useToast} from '../../components/Toast';
import {useAuth} from '../../context/AuthContext';
import {listarDespachantes, cadastrarDespachante, atualizarDespachante, toggleDespachante, excluirDespachante, DespachanteData} from '../../services/api';
import {useAlert} from '../../components/CustomAlert';
import Icon from '../../components/Icon';

function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

export default function DespachantesScreen() {
  const navigation = useNavigation();
  const {empresa} = useAuth();
  const [lista, setLista] = useState<DespachanteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const {showToast} = useToast();
  const {show} = useAlert();
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [menuAberto, setMenuAberto] = useState<{id: string; y: number; item: DespachanteData} | null>(null);

  const jaCarregou = useRef(false);

  const carregar = async () => {
    if (!empresa?.id) return;
    const res = await listarDespachantes(empresa.id);
    if (res.success && res.despachantes) setLista(res.despachantes);
  };

  useFocusEffect(useCallback(() => {
    if (!jaCarregou.current) {
      setLoading(true);
      carregar().finally(() => { setLoading(false); jaCarregou.current = true; });
    } else {
      carregar();
    }
  }, [empresa?.id]));

  const limpar = () => { setNome(''); setCpf(''); setTelefone(''); setSenha(''); setEditandoId(null); };

  const abrirEditar = (d: DespachanteData) => {
    setEditandoId(d.id); setNome(d.nome); setCpf(d.cpf); setTelefone(d.telefone || '');
    setSenha(''); setModal(true);
  };

  const handleToggle = async (d: DespachanteData) => {
    if (!empresa?.id) return;
    const res = await toggleDespachante(d.id, empresa.id);
    if (res.success) {
      showToast(d.ativo ? 'Despachante desativado' : 'Despachante ativado', 'info');
      carregar();
    } else show({title: 'Erro', message: res.error || 'Falha.', type: 'error'});
  };

  const handleExcluir = (d: DespachanteData) => {
    show({title: 'Excluir despachante', message: 'Tem certeza que deseja excluir?', type: 'confirm', buttons: [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Excluir', style: 'destructive', onPress: async () => {
        if (!empresa?.id) return;
        const res = await excluirDespachante(d.id, empresa.id);
        if (res.success) { showToast('Despachante excluído', 'error'); carregar(); }
        else show({title: 'Erro', message: res.error || 'Falha ao excluir.', type: 'error'});
      }},
    ]});
  };

  const senhaTemTamanho = senha.length >= 8;
  const senhaTemMaiuscula = /[A-Z]/.test(senha);
  const senhaTemNumero = /[0-9]/.test(senha);
  const senhaValida = senhaTemTamanho && senhaTemMaiuscula && senhaTemNumero;

  const salvar = async () => {
    if (!nome || !cpf) { show({title: 'Atenção', message: 'Preencha nome e CPF', type: 'warning'}); return; }
    if (!editandoId && !senha) { show({title: 'Atenção', message: 'Preencha a senha de acesso', type: 'warning'}); return; }
    if (senha && !senhaValida) { show({title: 'Atenção', message: 'A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula e 1 número.', type: 'warning'}); return; }
    if (!empresa?.id) return;

    if (editandoId) {
      const res = await atualizarDespachante(editandoId, {nome, cpf, telefone: telefone || undefined, senha: senha || undefined});
      if (res.success) { showToast('Despachante atualizado!', 'success'); carregar(); }
      else show({title: 'Erro', message: res.error || 'Falha ao atualizar.', type: 'error'});
    } else {
      const res = await cadastrarDespachante(empresa.id, {nome, cpf, telefone: telefone || undefined, senha});
      if (res.success) { showToast('Despachante cadastrado!', 'success'); carregar(); }
      else show({title: 'Erro', message: res.error || 'Falha ao cadastrar.', type: 'error'});
    }
    limpar(); setModal(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregar().finally(() => setRefreshing(false));
  }, [empresa?.id]);

  if (loading) {
    return <View style={[s.container, {justifyContent: 'center', alignItems: 'center'}]}><ActivityIndicator size="large" color={Colors.pulso} /></View>;
  }

  return (
    <View style={s.container}>
      <Toast />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
          <Icon name="arrow-left" size={18} color={Colors.pulso} />
          <Text style={s.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title}>Despachantes</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
          <Icon name="plus" size={14} color={Colors.matriz} />
          <Text style={s.addBtnText}>Novo</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchBox}>
        <Icon name="search" size={16} color={Colors.gray} />
        <TextInput style={s.searchInput} placeholder="Buscar despachante..." placeholderTextColor={Colors.gray} value={busca} onChangeText={setBusca} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{padding: 24, paddingTop: 0, gap: 10}} onScrollBeginDrag={() => setMenuAberto(null)} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.pulso} />}>
        {lista
          .filter(d => {
            const q = busca.toLowerCase();
            return !q || d.nome.toLowerCase().includes(q) || d.cpf.includes(q) || (d.telefone || '').includes(q);
          })
          .map(d => (
          <View key={d.id} style={s.card}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{d.nome[0]}</Text>
            </View>
            <View style={s.info}>
              <Text style={s.nome}>{d.nome}</Text>
              <Text style={s.doc}>{d.cpf}</Text>
              {d.telefone ? <Text style={s.tel}>{d.telefone}</Text> : null}
              {!d.ativo && <Text style={s.inativo}>Desativado</Text>}
            </View>
            <View>
              <TouchableOpacity onPress={(e) => setMenuAberto(menuAberto?.id === d.id ? null : {id: d.id, y: e.nativeEvent.pageY, item: d})} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Icon name="more-vertical" size={20} color={Colors.gray} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {menuAberto && (
        <>
          <Pressable style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50}} onPress={() => setMenuAberto(null)} />
          <View style={[s.menuPopup, {position: 'absolute', top: menuAberto.y - 10, right: 24, zIndex: 100}]}>
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAberto(null); abrirEditar(menuAberto.item); }}>
              <Icon name="edit-2" size={14} color={Colors.clareza} />
              <Text style={s.menuItemText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAberto(null); handleToggle(menuAberto.item); }}>
              <Icon name={menuAberto.item.ativo ? 'slash' : 'check-circle'} size={14} color={menuAberto.item.ativo ? '#F59E0B' : '#86EFAC'} />
              <Text style={[s.menuItemText, {color: menuAberto.item.ativo ? '#F59E0B' : '#86EFAC'}]}>{menuAberto.item.ativo ? 'Desativar' : 'Ativar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.menuItem, {borderBottomWidth: 0}]} onPress={() => { setMenuAberto(null); handleExcluir(menuAberto.item); }}>
              <Icon name="trash-2" size={14} color="#EF4444" />
              <Text style={[s.menuItemText, {color: '#EF4444'}]}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Modal visible={modal} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => {limpar(); setModal(false);}}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetTitle}>{editandoId ? 'Editar Despachante' : 'Novo Despachante'}</Text>
            <Text style={s.label}>Nome completo *</Text>
            <TextInput style={s.input} placeholder="Nome..." placeholderTextColor={Colors.gray} value={nome} onChangeText={setNome} />
            <Text style={s.label}>CPF *</Text>
            <TextInput style={s.input} placeholder="000.000.000-00" placeholderTextColor={Colors.gray} value={cpf} onChangeText={v => setCpf(maskCpf(v))} keyboardType="numeric" />
            <Text style={s.label}>Telefone</Text>
            <TextInput style={s.input} placeholder="(00) 00000-0000" placeholderTextColor={Colors.gray} value={telefone} onChangeText={v => setTelefone(maskTelefone(v))} keyboardType="phone-pad" />
            <Text style={s.label}>{editandoId ? 'Nova senha (deixe vazio para manter)' : 'Senha de acesso *'}</Text>
            <TextInput style={s.input} placeholder="Min 8 caracteres, 1 maiúscula, 1 número" placeholderTextColor={Colors.gray} value={senha} onChangeText={setSenha} secureTextEntry />
            {senha.length > 0 && (
              <View style={s.senhaChecklist}>
                <View style={s.senhaCheckItem}>
                  <Icon name={senhaTemTamanho ? 'check-circle' : 'circle'} size={13} color={senhaTemTamanho ? Colors.pulso : Colors.gray} />
                  <Text style={[s.senhaCheckText, senhaTemTamanho && s.senhaCheckTextOk]}>Mínimo de 8 caracteres</Text>
                </View>
                <View style={s.senhaCheckItem}>
                  <Icon name={senhaTemMaiuscula ? 'check-circle' : 'circle'} size={13} color={senhaTemMaiuscula ? Colors.pulso : Colors.gray} />
                  <Text style={[s.senhaCheckText, senhaTemMaiuscula && s.senhaCheckTextOk]}>1 letra maiúscula</Text>
                </View>
                <View style={s.senhaCheckItem}>
                  <Icon name={senhaTemNumero ? 'check-circle' : 'circle'} size={13} color={senhaTemNumero ? Colors.pulso : Colors.gray} />
                  <Text style={[s.senhaCheckText, senhaTemNumero && s.senhaCheckTextOk]}>1 número</Text>
                </View>
              </View>
            )}
            <View style={s.btnRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => {limpar(); setModal(false);}}>
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={salvar}>
                <Text style={s.saveBtnText}>{editandoId ? 'Salvar' : 'Cadastrar'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.matriz},
  header:    {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 56, paddingBottom: 20},
  backText:  {color: Colors.pulso, fontSize: 14, fontWeight: '600'},
  title:     {fontSize: 18, fontWeight: '700', color: Colors.clareza},
  addBtn:    {backgroundColor: Colors.pulso, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6},
  addBtnText:{color: Colors.matriz, fontWeight: '700', fontSize: 14},
  card:      {backgroundColor: '#162433', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#1E3448'},
  avatar:    {width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E3448', alignItems: 'center', justifyContent: 'center'},
  avatarText:{color: '#60A5FA', fontWeight: '700', fontSize: 18},
  info:      {flex: 1},
  nome:      {fontSize: 15, fontWeight: '700', color: Colors.clareza},
  doc:       {fontSize: 13, color: Colors.gray, marginTop: 2},
  tel:       {fontSize: 12, color: '#60A5FA', marginTop: 2},
  inativo:   {fontSize: 11, color: '#EF4444', marginTop: 2, fontWeight: '600'},
  cardActions:{flexDirection: 'row', gap: 12, alignItems: 'center'},
  iconBtn:   {fontSize: 18},
  menuPopup: {backgroundColor: '#0F1F2E', borderRadius: 10, borderWidth: 1, borderColor: '#1E3448', width: 160, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10},
  menuItem:  {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#1E3448'},
  menuItemText:{fontSize: 14, color: Colors.clareza, fontWeight: '500'},
  searchBox: {flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 14, backgroundColor: '#162433', borderRadius: 10, borderWidth: 1, borderColor: '#1E3448', paddingHorizontal: 14},
  searchIcon:{fontSize: 16, marginRight: 8},
  searchInput:{flex: 1, height: 44, color: Colors.clareza, fontSize: 15},
  overlay:   {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  sheet:     {backgroundColor: '#0F1F2E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 40},
  sheetTitle:{fontSize: 20, fontWeight: '700', color: Colors.clareza, marginBottom: 24},
  label:     {fontSize: 13, fontWeight: '600', color: Colors.gray, marginBottom: 6, marginTop: 12},
  input:     {height: 50, backgroundColor: '#162433', borderRadius: 8, borderWidth: 1, borderColor: '#1E3448', paddingHorizontal: 16, color: Colors.clareza, fontSize: 15},
  senhaChecklist: {marginTop: 8, gap: 5},
  senhaCheckItem: {flexDirection: 'row', alignItems: 'center', gap: 7},
  senhaCheckText: {fontSize: 12, color: Colors.gray, fontWeight: '500'},
  senhaCheckTextOk: {color: Colors.pulso},
  saveBtn:   {flex: 1, height: 52, backgroundColor: Colors.pulso, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  saveBtnText:{color: Colors.matriz, fontWeight: '700', fontSize: 16},
  btnRow:    {flexDirection: 'row', gap: 12, marginTop: 24},
  cancelBtn: {flex: 1, height: 52, backgroundColor: '#162433', borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EF4444'},
  cancelBtnText:{color: '#EF4444', fontWeight: '700', fontSize: 16},
  cancel:    {textAlign: 'center', color: Colors.gray, marginTop: 16, fontSize: 14},
});
