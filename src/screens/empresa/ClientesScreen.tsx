import React, {useState, useCallback, useRef} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, RefreshControl, ActivityIndicator, Pressable} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../../theme/colors';
import Toast, {useToast} from '../../components/Toast';
import {useAuth} from '../../context/AuthContext';
import {listarClientesEmpresa, atualizarVinculoCliente, bloquearVinculoCliente, excluirVinculoCliente, cadastrarClienteManual} from '../../services/api';
import {useAlert} from '../../components/CustomAlert';
import {buscarCep as fetchCep} from '../../utils/cep';
import Icon from '../../components/Icon';
function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function maskData(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2');
}

function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

function maskTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

type ClienteVinculo = {
  vinculo_id: string; cliente_id: string; status: string;
  nome: string; cpf: string; cnpj: string; rg: string;
  telefone: string; email: string; data_nascimento: string;
  cep: string; endereco: string; numero: string; bairro: string; cidade: string; estado: string;
  observacoes: string; data_vinculo: string;
};

export default function ClientesScreen() {
  const {empresa} = useAuth();
  const {showToast} = useToast();
  const {show} = useAlert();
  const [clientes, setClientes] = useState<ClienteVinculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [modalNovo, setModalNovo] = useState(false);
  const [editando, setEditando] = useState<ClienteVinculo | null>(null);
  const [menuAberto, setMenuAberto] = useState<{id: string; y: number; item: ClienteVinculo} | null>(null);

  // Form
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [rg, setRg] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const handleCep = async (value: string) => {
    const masked = maskCep(value);
    setCep(masked);
    const d = await fetchCep(masked);
    if (d) { setEndereco(d.logradouro); setBairro(d.bairro); setCidade(d.cidade); setEstado(d.estado); }
  };

  const jaCarregou = useRef(false);

  const carregar = async () => {
    if (!empresa?.id) return;
    const res = await listarClientesEmpresa(empresa.id);
    if (res.success && res.clientes) setClientes(res.clientes);
  };

  useFocusEffect(useCallback(() => {
    if (!jaCarregou.current) {
      setLoading(true);
      carregar().finally(() => { setLoading(false); jaCarregou.current = true; });
    } else {
      carregar();
    }
  }, [empresa?.id]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregar().finally(() => setRefreshing(false));
  }, [empresa?.id]);

  const abrirEditar = (c: ClienteVinculo) => {
    setEditando(c);
    setNome(c.nome); setCpf(c.cpf); setCnpj(c.cnpj); setRg(c.rg);
    setTelefone(c.telefone); setEmail(c.email); setDataNascimento(c.data_nascimento);
    setCep(c.cep); setEndereco(c.endereco); setNumero(c.numero); setBairro(c.bairro);
    setCidade(c.cidade); setEstado(c.estado); setObservacoes(c.observacoes);
    setModal(true);
  };

  const fecharModal = () => { setModal(false); setEditando(null); };

  const abrirNovo = () => {
    setNome(''); setCpf(''); setCnpj(''); setRg(''); setTelefone(''); setEmail('');
    setDataNascimento(''); setCep(''); setEndereco(''); setNumero(''); setBairro(''); setCidade(''); setEstado(''); setObservacoes('');
    setModalNovo(true);
  };

  const salvarNovo = async () => {
    if (!nome || !telefone) { show({title: 'Atenção', message: 'Preencha o nome e o telefone', type: 'warning'}); return; }
    if (!cpf && !cnpj) { show({title: 'Atenção', message: 'Preencha pelo menos CPF ou CNPJ', type: 'warning'}); return; }
    if (!empresa?.id) return;
    const res = await cadastrarClienteManual(empresa.id, {
      nome, cpf: cpf ? cpf.replace(/\D/g, '') : undefined, cnpj: cnpj ? cnpj.replace(/\D/g, '') : undefined, rg: rg || undefined,
      telefone: telefone.replace(/\D/g, ''), email: email || undefined,
      data_nascimento: dataNascimento || undefined, cep: cep ? cep.replace(/\D/g, '') : undefined,
      endereco: endereco || undefined, numero: numero || undefined, bairro: bairro || undefined,
      cidade: cidade || undefined, estado: estado || undefined, observacoes: observacoes || undefined,
    });
    if (res.success) {
      showToast('Cliente cadastrado!', 'success');
      setModalNovo(false);
      carregar();
    } else {
      show({title: 'Erro', message: res.error || 'Não foi possível cadastrar.', type: 'error'});
    }
  };

  const salvar = async () => {
    if (!nome || !telefone) { show({title: 'Atenção', message: 'Preencha nome e telefone', type: 'warning'}); return; }
    if (!editando) return;
    const res = await atualizarVinculoCliente(editando.vinculo_id, {
      nome, cpf: cpf.replace(/\D/g, ''), cnpj: cnpj.replace(/\D/g, ''), rg, telefone: telefone.replace(/\D/g, ''), email, data_nascimento: dataNascimento,
      cep: cep.replace(/\D/g, ''), endereco, numero, bairro, cidade, estado, observacoes,
    });
    if (res.success) {
      showToast('Cliente atualizado!', 'success');
      fecharModal();
      carregar();
    } else {
      show({title: 'Erro', message: res.error || 'Não foi possível salvar.', type: 'error'});
    }
  };

  const bloquear = (c: ClienteVinculo) => {
    show({title: 'Bloquear cliente', message: `Bloquear ${c.nome}? Ele não poderá se vincular novamente.`, type: 'confirm', buttons: [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Bloquear', style: 'destructive', onPress: async () => {
        const res = await bloquearVinculoCliente(c.vinculo_id);
        if (res.success) { showToast('Cliente bloqueado', 'info'); carregar(); }
        else show({title: 'Erro', message: res.error || 'Falha ao bloquear.', type: 'error'});
      }},
    ]});
  };

  const excluir = (c: ClienteVinculo) => {
    show({title: 'Excluir vínculo', message: `Remover ${c.nome}? Ele poderá se vincular novamente.`, type: 'confirm', buttons: [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Excluir', style: 'destructive', onPress: async () => {
        const res = await excluirVinculoCliente(c.vinculo_id);
        if (res.success) { showToast('Vínculo removido', 'error'); carregar(); }
        else show({title: 'Erro', message: res.error || 'Falha ao excluir.', type: 'error'});
      }},
    ]});
  };

  const filtrados = clientes.filter(c => {
    const q = busca.toLowerCase();
    return !q || c.nome.toLowerCase().includes(q) || c.cpf.includes(q) || c.telefone.includes(q);
  });

  if (loading) {
    return <View style={[s.container, {justifyContent: 'center', alignItems: 'center'}]}><ActivityIndicator size="large" color={Colors.pulso} /></View>;
  }

  return (
    <View style={s.container}>
      <Toast />
      <View style={s.header}>
        <Text style={s.title}>Clientes</Text>
        <TouchableOpacity style={s.addBtn} onPress={abrirNovo}>
          <Text style={s.addBtnText}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchBox}>
        <Icon name="search" size={16} color={Colors.gray} />
        <TextInput style={s.searchInput} placeholder="Buscar cliente..." placeholderTextColor={Colors.gray} value={busca} onChangeText={setBusca} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{padding: 24, paddingTop: 0, gap: 10, paddingBottom: 40}} onScrollBeginDrag={() => setMenuAberto(null)} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.pulso} />}>
        {filtrados.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyText}>Nenhum cliente vinculado</Text></View>
        ) : filtrados.map(c => (
          <View key={c.vinculo_id} style={s.card}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{c.nome[0]}</Text>
            </View>
            <View style={s.info}>
              <Text style={s.nome}>{c.nome}</Text>
              <Text style={s.doc}>{c.cpf ? maskCpf(c.cpf) : ''}{c.cnpj ? ` · ${maskCnpj(c.cnpj)}` : ''}</Text>
              {c.status === 'bloqueado' && <Text style={s.bloqueado}>Bloqueado</Text>}
            </View>
            <View>
              <TouchableOpacity onPress={(e) => setMenuAberto(menuAberto?.id === c.vinculo_id ? null : {id: c.vinculo_id, y: e.nativeEvent.pageY, item: c})} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
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
            {menuAberto.item.status !== 'bloqueado' && (
              <TouchableOpacity style={s.menuItem} onPress={() => { setMenuAberto(null); bloquear(menuAberto.item); }}>
                <Icon name="slash" size={14} color="#F59E0B" />
                <Text style={[s.menuItemText, {color: '#F59E0B'}]}>Bloquear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.menuItem, {borderBottomWidth: 0}]} onPress={() => { setMenuAberto(null); excluir(menuAberto.item); }}>
              <Icon name="trash-2" size={14} color="#EF4444" />
              <Text style={[s.menuItemText, {color: '#EF4444'}]}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Modal visible={modal} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={fecharModal}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.sheetTitle}>Editar Cliente</Text>

              <Text style={s.sectionTitle}>Dados Pessoais</Text>
              <Text style={s.label}>Nome completo / Razão social *</Text>
              <TextInput style={s.input} value={nome} onChangeText={setNome} placeholderTextColor={Colors.gray} />
              <Text style={s.label}>CPF</Text>
              <TextInput style={s.input} value={cpf} onChangeText={v => setCpf(maskCpf(v))} placeholderTextColor={Colors.gray} keyboardType="numeric" />
              <Text style={s.label}>CNPJ</Text>
              <TextInput style={s.input} value={cnpj} onChangeText={v => setCnpj(maskCnpj(v))} placeholderTextColor={Colors.gray} keyboardType="numeric" />
              <Text style={s.label}>RG</Text>
              <TextInput style={s.input} value={rg} onChangeText={setRg} placeholderTextColor={Colors.gray} />
              <Text style={s.label}>Data de Nascimento</Text>
              <TextInput style={s.input} value={dataNascimento} onChangeText={v => setDataNascimento(maskData(v))} placeholderTextColor={Colors.gray} keyboardType="numeric" />

              <Text style={s.sectionTitle}>Contato</Text>
              <Text style={s.label}>Telefone / WhatsApp *</Text>
              <TextInput style={s.input} value={telefone} onChangeText={v => setTelefone(maskTelefone(v))} placeholderTextColor={Colors.gray} keyboardType="phone-pad" />
              <Text style={s.label}>E-mail</Text>
              <TextInput style={s.input} value={email} onChangeText={setEmail} placeholderTextColor={Colors.gray} keyboardType="email-address" autoCapitalize="none" />

              <Text style={s.sectionTitle}>Endereço</Text>
              <Text style={s.label}>CEP</Text>
              <TextInput style={s.input} value={cep} onChangeText={handleCep} placeholderTextColor={Colors.gray} keyboardType="numeric" placeholder="00000-000" />
              <Text style={s.label}>Endereço</Text>
              <TextInput style={s.input} value={endereco} onChangeText={setEndereco} placeholderTextColor={Colors.gray} />
              <View style={s.row}>
                <View style={{flex: 1}}>
                  <Text style={s.label}>Número</Text>
                  <TextInput style={s.input} value={numero} onChangeText={setNumero} placeholderTextColor={Colors.gray} keyboardType="numeric" />
                </View>
                <View style={{flex: 2, marginLeft: 12}}>
                  <Text style={s.label}>Bairro</Text>
                  <TextInput style={s.input} value={bairro} onChangeText={setBairro} placeholderTextColor={Colors.gray} />
                </View>
              </View>
              <View style={s.row}>
                <View style={{flex: 2}}>
                  <Text style={s.label}>Cidade</Text>
                  <TextInput style={s.input} value={cidade} onChangeText={setCidade} placeholderTextColor={Colors.gray} />
                </View>
                <View style={{flex: 1, marginLeft: 12}}>
                  <Text style={s.label}>UF</Text>
                  <TextInput style={s.input} value={estado} onChangeText={setEstado} placeholderTextColor={Colors.gray} maxLength={2} autoCapitalize="characters" />
                </View>
              </View>

              <Text style={s.sectionTitle}>Observações</Text>
              <TextInput style={[s.input, {height: 80, textAlignVertical: 'top', paddingTop: 12}]} value={observacoes} onChangeText={setObservacoes} placeholderTextColor={Colors.gray} placeholder="Anotações sobre o cliente..." multiline />

              <View style={s.btnRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={fecharModal}>
                  <Text style={s.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={salvar}>
                  <Text style={s.saveBtnText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={modalNovo} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setModalNovo(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.sheetTitle}>Novo Cliente</Text>

              <Text style={s.sectionTitle}>Dados Pessoais</Text>
              <Text style={s.label}>Nome completo / Razão social *</Text>
              <TextInput style={s.input} value={nome} onChangeText={setNome} placeholderTextColor={Colors.gray} placeholder="Nome..." />
              <Text style={s.label}>CPF</Text>
              <TextInput style={s.input} value={cpf} onChangeText={v => setCpf(maskCpf(v))} placeholderTextColor={Colors.gray} placeholder="000.000.000-00" keyboardType="numeric" />
              <Text style={s.label}>CNPJ</Text>
              <TextInput style={s.input} value={cnpj} onChangeText={v => setCnpj(maskCnpj(v))} placeholderTextColor={Colors.gray} placeholder="00.000.000/0000-00" keyboardType="numeric" />
              <Text style={s.label}>RG</Text>
              <TextInput style={s.input} value={rg} onChangeText={setRg} placeholderTextColor={Colors.gray} />
              <Text style={s.label}>Data de Nascimento</Text>
              <TextInput style={s.input} value={dataNascimento} onChangeText={v => setDataNascimento(maskData(v))} placeholderTextColor={Colors.gray} placeholder="DD/MM/AAAA" keyboardType="numeric" />

              <Text style={s.sectionTitle}>Contato</Text>
              <Text style={s.label}>Telefone / WhatsApp *</Text>
              <TextInput style={s.input} value={telefone} onChangeText={v => setTelefone(maskTelefone(v))} placeholderTextColor={Colors.gray} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
              <Text style={s.label}>E-mail</Text>
              <TextInput style={s.input} value={email} onChangeText={setEmail} placeholderTextColor={Colors.gray} placeholder="email@exemplo.com" keyboardType="email-address" autoCapitalize="none" />

              <Text style={s.sectionTitle}>Endereço</Text>
              <Text style={s.label}>CEP</Text>
              <TextInput style={s.input} value={cep} onChangeText={handleCep} placeholderTextColor={Colors.gray} placeholder="00000-000" keyboardType="numeric" />
              <Text style={s.label}>Endereço</Text>
              <TextInput style={s.input} value={endereco} onChangeText={setEndereco} placeholderTextColor={Colors.gray} placeholder="Rua / Avenida" />
              <View style={s.row}>
                <View style={{flex: 1}}>
                  <Text style={s.label}>Número</Text>
                  <TextInput style={s.input} value={numero} onChangeText={setNumero} placeholderTextColor={Colors.gray} keyboardType="numeric" />
                </View>
                <View style={{flex: 2, marginLeft: 12}}>
                  <Text style={s.label}>Bairro</Text>
                  <TextInput style={s.input} value={bairro} onChangeText={setBairro} placeholderTextColor={Colors.gray} />
                </View>
              </View>
              <View style={s.row}>
                <View style={{flex: 2}}>
                  <Text style={s.label}>Cidade</Text>
                  <TextInput style={s.input} value={cidade} onChangeText={setCidade} placeholderTextColor={Colors.gray} />
                </View>
                <View style={{flex: 1, marginLeft: 12}}>
                  <Text style={s.label}>UF</Text>
                  <TextInput style={s.input} value={estado} onChangeText={setEstado} placeholderTextColor={Colors.gray} maxLength={2} autoCapitalize="characters" />
                </View>
              </View>

              <Text style={s.sectionTitle}>Observações</Text>
              <TextInput style={[s.input, {height: 80, textAlignVertical: 'top', paddingTop: 12}]} value={observacoes} onChangeText={setObservacoes} placeholderTextColor={Colors.gray} placeholder="Anotações sobre o cliente..." multiline />

              <View style={s.btnRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setModalNovo(false)}>
                  <Text style={s.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={salvarNovo}>
                  <Text style={s.saveBtnText}>Cadastrar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.matriz},
  header:    {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 56, paddingBottom: 20},
  title:     {fontSize: 22, fontWeight: '700', color: Colors.clareza},
  addBtn:    {backgroundColor: Colors.pulso, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8},
  addBtnText:{color: Colors.matriz, fontWeight: '700', fontSize: 14},
  card:      {backgroundColor: '#162433', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#1E3448'},
  avatar:    {width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E3448', alignItems: 'center', justifyContent: 'center'},
  avatarText:{color: Colors.pulso, fontWeight: '700', fontSize: 18},
  info:      {flex: 1},
  nome:      {fontSize: 15, fontWeight: '700', color: Colors.clareza},
  doc:       {fontSize: 13, color: Colors.gray, marginTop: 2},
  bloqueado: {fontSize: 11, color: '#EF4444', marginTop: 2, fontWeight: '600'},
  cardActions:{flexDirection: 'row', gap: 12, alignItems: 'center'},
  iconBtn:   {fontSize: 18},
  menuPopup: {backgroundColor: '#0F1F2E', borderRadius: 10, borderWidth: 1, borderColor: '#1E3448', width: 160, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10},
  menuItem:  {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#1E3448'},
  menuItemText:{fontSize: 14, color: Colors.clareza, fontWeight: '500'},
  searchBox: {flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 14, backgroundColor: '#162433', borderRadius: 10, borderWidth: 1, borderColor: '#1E3448', paddingHorizontal: 14},
  searchIcon:{fontSize: 16, marginRight: 8},
  searchInput:{flex: 1, height: 44, color: Colors.clareza, fontSize: 15},
  empty:     {alignItems: 'center', paddingTop: 60},
  emptyText: {fontSize: 16, color: Colors.gray},
  overlay:   {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  sheet:     {backgroundColor: '#0F1F2E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 40, maxHeight: '90%'},
  sheetTitle:{fontSize: 20, fontWeight: '700', color: Colors.clareza, marginBottom: 8},
  sectionTitle:{fontSize: 15, fontWeight: '700', color: Colors.pulso, marginTop: 20, marginBottom: 4},
  label:     {fontSize: 13, fontWeight: '600', color: Colors.gray, marginBottom: 6, marginTop: 12},
  row:       {flexDirection: 'row'},
  input:     {height: 50, backgroundColor: '#162433', borderRadius: 8, borderWidth: 1, borderColor: '#1E3448', paddingHorizontal: 16, color: Colors.clareza, fontSize: 15},
  saveBtn:   {flex: 1, height: 52, backgroundColor: Colors.pulso, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  saveBtnText:{color: Colors.matriz, fontWeight: '700', fontSize: 16},
  btnRow:    {flexDirection: 'row', gap: 12, marginTop: 24},
  cancelBtn: {flex: 1, height: 52, backgroundColor: '#162433', borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EF4444'},
  cancelBtnText:{color: '#EF4444', fontWeight: '700', fontSize: 16},
  cancel:    {textAlign: 'center', color: Colors.gray, marginTop: 16, fontSize: 14},
});
