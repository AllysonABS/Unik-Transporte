import React, {useState, useCallback} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Pressable} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {Colors} from '../../theme/colors';
import Toast, {useToast} from '../../components/Toast';
import {useAuth} from '../../context/AuthContext';
import {atualizarCliente, listarMinhasLojas, alterarSenhaCliente, listarPedidosCliente} from '../../services/api';
import {useAlert} from '../../components/CustomAlert';
import {buscarCep as fetchCep} from '../../utils/cep';
import {formatDataMesAno} from '../../utils/date';
import Icon from '../../components/Icon';
import {useLogout} from '../../hooks/useLogout';

function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskTelefone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

function maskData(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2');
}

export default function PerfilScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {showToast} = useToast();
  const {cliente, setCliente} = useAuth();
  const {show} = useAlert();
  const logout = useLogout();
  const [modalEditar, setModalEditar] = useState(false);
  const [modalSenha, setModalSenha] = useState(false);
  const [totalLojas, setTotalLojas] = useState(0);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const buscarCep = async (cepValue: string) => {
    const dados = await fetchCep(cepValue);
    if (dados) {
      setFormEndereco(dados.logradouro);
      setFormBairro(dados.bairro);
      setFormCidade(dados.cidade);
      setFormEstado(dados.estado);
      setFormComplemento(dados.complemento);
    }
  };

  useFocusEffect(useCallback(() => {
    if (cliente?.id) {
      listarMinhasLojas(cliente.id).then(res => {
        if (res.success && res.lojas) setTotalLojas(res.lojas.length);
      });
      listarPedidosCliente(cliente.id).then(res => {
        if (res.success && res.pedidos) setTotalPedidos(res.pedidos.length);
      });
    }
  }, [cliente?.id]));

  // Form temporário para edição
  const [formNome, setFormNome] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNascimento, setFormNascimento] = useState('');
  const [formEndereco, setFormEndereco] = useState('');
  const [formNumero, setFormNumero] = useState('');
  const [formBairro, setFormBairro] = useState('');
  const [formComplemento, setFormComplemento] = useState('');
  const [formCidade, setFormCidade] = useState('');
  const [formEstado, setFormEstado] = useState('');
  const [formCep, setFormCep] = useState('');

  const nome = cliente?.nome || '';
  const cpf = cliente?.cpf || '';
  const telefone = cliente?.telefone || '';
  const email = cliente?.email || '';
  const dataNascimento = cliente?.data_nascimento || '';
  const endereco = cliente?.endereco || '';
  const numero = cliente?.numero || '';
  const bairro = cliente?.bairro || '';
  const complemento = cliente?.complemento || '';
  const cidade = cliente?.cidade || '';
  const estado = cliente?.estado || '';
  const cep = cliente?.cep || '';

  const enderecoCompleto = endereco ? `${endereco}${numero ? ', ' + numero : ''}${bairro ? ' - ' + bairro : ''}${complemento ? ' (' + complemento + ')' : ''}` : 'Não informado';

  const salvarSenha = async () => {
    if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
      show({title: 'Atenção', message: 'Preencha todos os campos.', type: 'warning'}); return;
    }
    if (novaSenha.length < 6) {
      show({title: 'Atenção', message: 'A nova senha deve ter no mínimo 6 caracteres.', type: 'warning'}); return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      show({title: 'Atenção', message: 'As senhas não coincidem.', type: 'warning'}); return;
    }
    if (!cliente?.id) return;
    setSalvandoSenha(true);
    const res = await alterarSenhaCliente(cliente.id, senhaAtual, novaSenha);
    setSalvandoSenha(false);
    if (res.success) {
      setModalSenha(false);
      setSenhaAtual(''); setNovaSenha(''); setConfirmarNovaSenha('');
      showToast('Senha alterada com sucesso!', 'success');
    } else {
      show({title: 'Erro', message: res.error || 'Não foi possível alterar a senha.', type: 'error'});
    }
  };

  const abrirEditar = () => {
    setFormNome(nome); setFormTelefone(telefone); setFormEmail(email);
    setFormNascimento(dataNascimento); setFormEndereco(endereco);
    setFormNumero(numero); setFormBairro(bairro); setFormComplemento(complemento);
    setFormCidade(cidade); setFormEstado(estado); setFormCep(cep);
    setModalEditar(true);
  };

  const salvar = async () => {
    if (!formNome || !formTelefone) { show({title: 'Atenção', message: 'Preencha nome e telefone', type: 'warning'}); return; }
    if (!cliente?.id) return;

    const res = await atualizarCliente(cliente.id, {
      nome: formNome, telefone: formTelefone, email: formEmail,
      data_nascimento: formNascimento, endereco: formEndereco,
      numero: formNumero, bairro: formBairro, complemento: formComplemento,
      cidade: formCidade, estado: formEstado, cep: formCep,
    });

    if (res.success) {
      setCliente({...cliente, nome: formNome, telefone: formTelefone, email: formEmail,
        data_nascimento: formNascimento, endereco: formEndereco,
        numero: formNumero, bairro: formBairro, complemento: formComplemento,
        cidade: formCidade, estado: formEstado, cep: formCep});
      setModalEditar(false);
      showToast('Perfil atualizado!', 'success');
    } else {
      show({title: 'Erro', message: res.error || 'Não foi possível salvar.', type: 'error'});
    }
  };

  return (
    <View style={s.wrapper}>
      <Toast />
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        <View style={s.avatarWrap}>
          <View style={s.avatar}><Text style={s.avatarText}>{nome ? nome[0].toUpperCase() : '?'}</Text></View>
          <Text style={s.nome}>{nome || 'Cliente'}</Text>
          <Text style={s.cpf}>{cpf ? maskCpf(cpf) : ''}</Text>
        </View>

        {/* Resumo de atividade */}
        <View style={s.resumoRow}>
          <View style={s.resumoCard}>
            <Text style={s.resumoValor}>{totalPedidos}</Text>
            <Text style={s.resumoLabel}>Pedidos</Text>
          </View>
          <View style={s.resumoCard}>
            <Text style={s.resumoValor}>{totalLojas}</Text>
            <Text style={s.resumoLabel}>Lojas</Text>
          </View>
          <View style={s.resumoCard}>
            <Text style={s.resumoValor}>{cliente?.data_cadastro ? formatDataMesAno(cliente.data_cadastro) : '—'}</Text>
            <Text style={s.resumoLabel}>Cliente desde</Text>
          </View>
        </View>

        {/* Dados pessoais */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Dados Pessoais</Text>
            <TouchableOpacity onPress={abrirEditar}>
              <Text style={s.editBtn}>Editar</Text>
            </TouchableOpacity>
          </View>
          <View style={s.row}><Text style={s.rowLabel}>Telefone</Text><Text style={s.rowValue}>{telefone ? maskTelefone(telefone) : '—'}</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>E-mail</Text><Text style={s.rowValue}>{email || '—'}</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>Nascimento</Text><Text style={s.rowValue}>{dataNascimento || '—'}</Text></View>
        </View>

        {/* Endereço */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Endereço</Text>
          <View style={s.row}><Text style={s.rowLabel}>CEP</Text><Text style={s.rowValue}>{cep || '—'}</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>Endereço</Text><Text style={s.rowValue}>{enderecoCompleto}</Text></View>
          <View style={[s.row, {borderBottomWidth: 0}]}><Text style={s.rowLabel}>Cidade/UF</Text><Text style={s.rowValue}>{cidade && estado ? `${cidade}/${estado}` : '—'}</Text></View>
        </View>

        {/* Opções */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Opções</Text>
          <TouchableOpacity style={[s.row, {borderBottomWidth: 0}]} onPress={() => setModalSenha(true)}>
            <Text style={s.rowLabel}>🔒 Alterar senha</Text>
            <Text style={s.rowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.exitBtn} onPress={logout}>
          <Text style={s.exitText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal editar */}
      <Modal visible={modalEditar} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setModalEditar(false)}>
          <View style={s.sheet} {...({onStartShouldSetResponder: () => true} as any)}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.sheetTitle}>Editar Perfil</Text>

              <Text style={s.label}>Nome *</Text>
              <TextInput style={s.input} value={formNome} onChangeText={setFormNome} placeholderTextColor={Colors.gray} />
              <Text style={s.label}>Telefone *</Text>
              <TextInput style={s.input} value={formTelefone} onChangeText={setFormTelefone} placeholderTextColor={Colors.gray} keyboardType="phone-pad" />
              <Text style={s.label}>E-mail</Text>
              <TextInput style={s.input} value={formEmail} onChangeText={setFormEmail} placeholderTextColor={Colors.gray} keyboardType="email-address" autoCapitalize="none" />
              <Text style={s.label}>Data de Nascimento</Text>
              <TextInput style={s.input} value={formNascimento} onChangeText={v => setFormNascimento(maskData(v))} placeholderTextColor={Colors.gray} placeholder="DD/MM/AAAA" keyboardType="numeric" />

              <Text style={s.labelSection}>Endereço</Text>
              <Text style={s.label}>CEP</Text>
              <TextInput style={s.input} value={formCep} onChangeText={v => { const masked = maskCep(v); setFormCep(masked); buscarCep(masked); }} placeholderTextColor={Colors.gray} placeholder="00000-000" keyboardType="numeric" />
              <Text style={s.label}>Rua / Avenida</Text>
              <TextInput style={s.input} value={formEndereco} onChangeText={setFormEndereco} placeholderTextColor={Colors.gray} />
              <View style={s.formRow}>
                <View style={{flex: 1}}>
                  <Text style={s.label}>Número</Text>
                  <TextInput style={s.input} value={formNumero} onChangeText={setFormNumero} placeholderTextColor={Colors.gray} keyboardType="numeric" />
                </View>
                <View style={{flex: 2, marginLeft: 12}}>
                  <Text style={s.label}>Bairro</Text>
                  <TextInput style={s.input} value={formBairro} onChangeText={setFormBairro} placeholderTextColor={Colors.gray} />
                </View>
              </View>
              <Text style={s.label}>Complemento</Text>
              <TextInput style={s.input} value={formComplemento} onChangeText={setFormComplemento} placeholderTextColor={Colors.gray} placeholder="Apt, bloco, etc." />
              <View style={s.formRow}>
                <View style={{flex: 2}}>
                  <Text style={s.label}>Cidade</Text>
                  <TextInput style={s.input} value={formCidade} onChangeText={setFormCidade} placeholderTextColor={Colors.gray} />
                </View>
                <View style={{flex: 1, marginLeft: 12}}>
                  <Text style={s.label}>UF</Text>
                  <TextInput style={s.input} value={formEstado} onChangeText={setFormEstado} placeholderTextColor={Colors.gray} maxLength={2} autoCapitalize="characters" />
                </View>
              </View>

              <View style={s.btnRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setModalEditar(false)}>
                  <Text style={s.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={salvar}>
                  <Text style={s.saveBtnText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Modal alterar senha */}
      <Modal visible={modalSenha} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => { setModalSenha(false); setSenhaAtual(''); setNovaSenha(''); setConfirmarNovaSenha(''); }}>
          <View style={s.sheet} {...({onStartShouldSetResponder: () => true} as any)}>
            <Text style={s.sheetTitle}>Alterar Senha</Text>

            <Text style={s.label}>Senha atual</Text>
            <TextInput style={s.input} value={senhaAtual} onChangeText={setSenhaAtual} placeholderTextColor={Colors.gray} placeholder="Sua senha atual" secureTextEntry />
            <Text style={s.label}>Nova senha</Text>
            <TextInput style={s.input} value={novaSenha} onChangeText={setNovaSenha} placeholderTextColor={Colors.gray} placeholder="Mínimo 6 caracteres" secureTextEntry />
            <Text style={s.label}>Confirmar nova senha</Text>
            <TextInput style={s.input} value={confirmarNovaSenha} onChangeText={setConfirmarNovaSenha} placeholderTextColor={Colors.gray} placeholder="Repita a nova senha" secureTextEntry />

            <View style={s.btnRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setModalSenha(false); setSenhaAtual(''); setNovaSenha(''); setConfirmarNovaSenha(''); }}>
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={salvarSenha} disabled={salvandoSenha}>
                <Text style={s.saveBtnText}>{salvandoSenha ? 'Salvando...' : 'Alterar Senha'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper:    {flex: 1, backgroundColor: Colors.matriz},
  container:  {flex: 1},
  content:    {padding: 24, paddingTop: 56, paddingBottom: 40},
  avatarWrap: {alignItems: 'center', marginBottom: 24},
  avatar:     {width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.pulso + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderColor: Colors.pulso},
  avatarText: {fontSize: 32, fontWeight: '700', color: Colors.pulso},
  nome:       {fontSize: 20, fontWeight: '700', color: Colors.clareza},
  cpf:        {fontSize: 14, color: Colors.gray, marginTop: 4},

  resumoRow:  {flexDirection: 'row', gap: 8, marginBottom: 20},
  resumoCard: {flex: 1, backgroundColor: '#162433', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1E3448'},
  resumoValor:{fontSize: 18, fontWeight: '800', color: Colors.clareza},
  resumoLabel:{fontSize: 10, color: Colors.gray, marginTop: 2, fontWeight: '600'},

  section:      {backgroundColor: '#162433', borderRadius: 12, borderWidth: 1, borderColor: '#1E3448', overflow: 'hidden', marginBottom: 16},
  sectionHeader:{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0},
  sectionTitle: {fontSize: 13, fontWeight: '700', color: Colors.pulso, padding: 16, paddingBottom: 8},
  editBtn:      {fontSize: 13, color: Colors.pulso, fontWeight: '600'},
  row:          {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E3448'},
  rowLabel:     {fontSize: 14, color: Colors.gray},
  rowValue:     {fontSize: 14, fontWeight: '600', color: Colors.clareza, flex: 1, textAlign: 'right'},
  rowArrow:     {fontSize: 20, color: Colors.gray},

  exitBtn:    {height: 52, backgroundColor: '#162433', borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EF4444'},
  exitText:   {color: '#EF4444', fontWeight: '700', fontSize: 15},

  overlay:    {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  sheet:      {backgroundColor: '#0F1F2E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 40, maxHeight: '90%'},
  sheetTitle: {fontSize: 20, fontWeight: '700', color: Colors.clareza, marginBottom: 8},
  label:      {fontSize: 13, fontWeight: '600', color: Colors.gray, marginBottom: 6, marginTop: 12},
  labelSection:{fontSize: 15, fontWeight: '700', color: Colors.pulso, marginTop: 20, marginBottom: 4},
  input:      {height: 48, backgroundColor: '#162433', borderRadius: 8, borderWidth: 1, borderColor: '#1E3448', paddingHorizontal: 14, color: Colors.clareza, fontSize: 15},
  formRow:    {flexDirection: 'row'},
  saveBtn:    {flex: 1, height: 52, backgroundColor: Colors.pulso, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  saveBtnText:{color: Colors.matriz, fontWeight: '700', fontSize: 16},
  btnRow:     {flexDirection: 'row', gap: 12, marginTop: 24},
  cancelBtn:  {flex: 1, height: 52, backgroundColor: '#162433', borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EF4444'},
  cancelBtnText:{color: '#EF4444', fontWeight: '700', fontSize: 16},
  cancel:     {textAlign: 'center', color: Colors.gray, marginTop: 16, fontSize: 14},
});
