import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '../../theme/colors';
import Toast, {useToast} from '../../components/Toast';
import {useAuth} from '../../context/AuthContext';
import {buscarEmpresa, atualizarEmpresa} from '../../services/api';
import {useAlert} from '../../components/CustomAlert';
import {buscarCep as fetchCep} from '../../utils/cep';
import Icon from '../../components/Icon';
import {hapticSuccess} from '../../utils/haptics';

function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function maskTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

export default function ConfiguracoesScreen() {
  const navigation = useNavigation();
  const {showToast} = useToast();
  const {empresa, setEmpresa} = useAuth();
  const {show} = useAlert();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');
  const [horario, setHorario] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    if (!empresa?.id) { setLoading(false); return; }
    setLoading(true);
    const res = await buscarEmpresa(empresa.id);
    if (res.success && res.empresa) {
      const e = res.empresa;
      setNomeEmpresa(e.nome_empresa || '');
      setCnpj(e.cnpj || '');
      setNomeResponsavel(e.nome_responsavel || '');
      setTelefone(e.telefone || '');
      setEmail(e.email || '');
      setEndereco(e.endereco || '');
      setNumero(e.numero || '');
      setBairro(e.bairro || '');
      setCidade(e.cidade || '');
      setEstado(e.estado || '');
      setCep(e.cep || '');
      setHorario(e.horario_funcionamento || '');
    }
    setLoading(false);
  };

  const salvar = async () => {
    if (!nomeEmpresa) { show({title: 'Atenção', message: 'Preencha o nome da empresa', type: 'warning'}); return; }
    if (!empresa?.id) return;

    setSalvando(true);
    const res = await atualizarEmpresa(empresa.id, {
      nome_empresa: nomeEmpresa, telefone, email, endereco, numero, bairro, cidade, estado, cep, horario_funcionamento: horario,
    });
    setSalvando(false);

    if (res.success) {
      hapticSuccess();
      setEmpresa({...empresa, nome_empresa: nomeEmpresa, telefone, email, endereco, numero, bairro, cidade, estado, cep, horario_funcionamento: horario});
      showToast('Configurações salvas!', 'success');
    } else {
      show({title: 'Erro', message: res.error || 'Não foi possível salvar.', type: 'error'});
    }
  };

  if (loading) {
    return (
      <View style={[s.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={Colors.pulso} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Toast />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12}} accessibilityRole="button" accessibilityLabel="Voltar">
          <Icon name="arrow-left" size={18} color={Colors.pulso} />
          <Text style={s.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title} accessibilityRole="header">Configurações</Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Dados da Empresa</Text>
          <Text style={s.label}>Nome / Razão Social *</Text>
          <TextInput style={s.input} value={nomeEmpresa} onChangeText={setNomeEmpresa} placeholderTextColor={Colors.gray} />
          <Text style={s.label}>CNPJ</Text>
          <TextInput style={[s.input, s.inputDisabled]} value={maskCnpj(cnpj)} editable={false} />
          <Text style={s.label}>Responsável</Text>
          <TextInput style={[s.input, s.inputDisabled]} value={nomeResponsavel} editable={false} />
          <Text style={s.label}>Telefone</Text>
          <TextInput style={s.input} value={telefone} onChangeText={v => setTelefone(maskTelefone(v))} placeholderTextColor={Colors.gray} keyboardType="phone-pad" />
          <Text style={s.label}>E-mail</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholderTextColor={Colors.gray} keyboardType="email-address" autoCapitalize="none" />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Endereço</Text>
          <Text style={s.label}>CEP</Text>
          <TextInput style={s.input} value={cep} onChangeText={async v => { const masked = maskCep(v); setCep(masked); const d = await fetchCep(masked); if (d) { setEndereco(d.logradouro); setBairro(d.bairro); setCidade(d.cidade); setEstado(d.estado); } }} placeholderTextColor={Colors.gray} keyboardType="numeric" placeholder="00000-000" />
          <Text style={s.label}>Endereço</Text>
          <TextInput style={s.input} value={endereco} onChangeText={setEndereco} placeholderTextColor={Colors.gray} placeholder="Rua / Avenida" />
          <View style={s.row}>
            <View style={{flex: 1}}>
              <Text style={s.label}>Número</Text>
              <TextInput style={s.input} value={numero} onChangeText={setNumero} placeholderTextColor={Colors.gray} keyboardType="number-pad" />
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
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Funcionamento</Text>
          <Text style={s.label}>Horário de Funcionamento</Text>
          <TextInput style={s.input} value={horario} onChangeText={setHorario} placeholderTextColor={Colors.gray} placeholder="Ex: Seg-Sex: 07:00-18:00 | Sáb: 07:00-12:00" />
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={salvar} disabled={salvando}>
          {salvando ? (
            <ActivityIndicator color={Colors.matriz} />
          ) : (
            <Text style={s.saveBtnText}>Salvar Alterações</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    {flex: 1, backgroundColor: Colors.matriz},
  content:      {padding: 24, paddingTop: 56, paddingBottom: 100},
  title:        {fontSize: 18, fontWeight: '700', color: Colors.clareza, marginBottom: 24},
  backText:     {color: Colors.pulso, fontSize: 14, fontWeight: '600', marginBottom: 12},
  section:      {backgroundColor: '#162433', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#1E3448', marginBottom: 20},
  sectionTitle: {fontSize: 15, fontWeight: '700', color: Colors.pulso, marginBottom: 8},
  label:        {fontSize: 13, fontWeight: '600', color: Colors.gray, marginBottom: 6, marginTop: 14},
  input:        {height: 48, backgroundColor: '#0F1F2E', borderRadius: 8, borderWidth: 1, borderColor: '#1E3448', paddingHorizontal: 14, color: Colors.clareza, fontSize: 15},
  inputDisabled:{opacity: 0.5},
  row:          {flexDirection: 'row'},
  saveBtn:      {height: 52, backgroundColor: Colors.pulso, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  saveBtnText:  {color: Colors.matriz, fontWeight: '700', fontSize: 16},
});
