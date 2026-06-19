import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, StatusBar} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {Colors} from '../../theme/colors';
import {cadastrarCliente} from '../../services/api';
import {useAlert} from '../../components/CustomAlert';
import {buscarCep} from '../../utils/cep';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CadastroCliente'>;
};

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

function maskTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

function maskData(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2');
}

function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

export default function CadastroClienteScreen({navigation}: Props) {
  const {show} = useAlert();

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCep = async (cepValue: string) => {
    const dados = await buscarCep(cepValue);
    if (dados) {
      setEndereco(dados.logradouro);
      setBairro(dados.bairro);
      setCidade(dados.cidade);
      setEstado(dados.estado);
    }
  };

  const handleCadastro = async () => {
    if (!nome || !cpf || !email || !telefone || !senha) {
      show({title: 'Atenção', message: 'Preencha todos os campos obrigatórios.', type: 'warning'});
      return;
    }
    if (senha.length < 6) {
      show({title: 'Atenção', message: 'A senha deve ter no mínimo 6 caracteres.', type: 'warning'});
      return;
    }
    if (senha !== confirmarSenha) {
      show({title: 'Atenção', message: 'As senhas não coincidem.', type: 'warning'});
      return;
    }

    setLoading(true);
    const res = await cadastrarCliente({
      nome,
      cpf: cpf.replace(/\D/g, ''),
      cnpj: cnpj.replace(/\D/g, '') || undefined,
      email,
      telefone: telefone.replace(/\D/g, ''),
      data_nascimento: dataNascimento || undefined,
      endereco: endereco || undefined,
      numero: numero || undefined,
      bairro: bairro || undefined,
      cidade: cidade || undefined,
      estado: estado || undefined,
      cep: cep.replace(/\D/g, '') || undefined,
      senha,
    });
    setLoading(false);

    if (res.success) {
      show({title: 'Sucesso', message: 'Cadastro realizado! Faça login para continuar.', type: 'success', buttons: [
        {text: 'OK', onPress: () => navigation.replace('Login')},
      ]});
    } else {
      show({title: 'Erro', message: res.error || 'Não foi possível realizar o cadastro.', type: 'error'});
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.matriz} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={s.title}>Criar Conta</Text>
        <Text style={s.subtitle}>Cadastre-se como cliente</Text>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Dados Pessoais</Text>

          <Text style={s.label}>Nome completo *</Text>
          <TextInput style={s.input} value={nome} onChangeText={setNome} placeholder="Seu nome" placeholderTextColor={Colors.gray} />

          <Text style={s.label}>CPF *</Text>
          <TextInput style={s.input} value={cpf} onChangeText={v => setCpf(maskCpf(v))} placeholder="000.000.000-00" placeholderTextColor={Colors.gray} keyboardType="numeric" />

          <Text style={s.label}>CNPJ (opcional)</Text>
          <TextInput style={s.input} value={cnpj} onChangeText={v => setCnpj(maskCnpj(v))} placeholder="00.000.000/0000-00" placeholderTextColor={Colors.gray} keyboardType="numeric" />

          <Text style={s.label}>E-mail *</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="seu@email.com" placeholderTextColor={Colors.gray} keyboardType="email-address" autoCapitalize="none" />

          <Text style={s.label}>Telefone *</Text>
          <TextInput style={s.input} value={telefone} onChangeText={v => setTelefone(maskTelefone(v))} placeholder="(00) 00000-0000" placeholderTextColor={Colors.gray} keyboardType="phone-pad" />

          <Text style={s.label}>Data de Nascimento</Text>
          <TextInput style={s.input} value={dataNascimento} onChangeText={v => setDataNascimento(maskData(v))} placeholder="DD/MM/AAAA" placeholderTextColor={Colors.gray} keyboardType="numeric" />
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Endereço</Text>

          <Text style={s.label}>CEP</Text>
          <TextInput style={s.input} value={cep} onChangeText={v => { const masked = maskCep(v); setCep(masked); handleCep(masked); }} placeholder="00000-000" placeholderTextColor={Colors.gray} keyboardType="numeric" />

          <Text style={s.label}>Endereço</Text>
          <TextInput style={s.input} value={endereco} onChangeText={setEndereco} placeholder="Rua / Avenida" placeholderTextColor={Colors.gray} />

          <View style={s.row}>
            <View style={{flex: 1}}>
              <Text style={s.label}>Número</Text>
              <TextInput style={s.input} value={numero} onChangeText={setNumero} placeholder="Nº" placeholderTextColor={Colors.gray} keyboardType="number-pad" />
            </View>
            <View style={{flex: 2, marginLeft: 12}}>
              <Text style={s.label}>Bairro</Text>
              <TextInput style={s.input} value={bairro} onChangeText={setBairro} placeholder="Bairro" placeholderTextColor={Colors.gray} />
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

        <View style={s.card}>
          <Text style={s.sectionTitle}>Segurança</Text>

          <Text style={s.label}>Senha *</Text>
          <TextInput style={s.input} value={senha} onChangeText={setSenha} placeholder="Mínimo 6 caracteres" placeholderTextColor={Colors.gray} secureTextEntry />

          <Text style={s.label}>Confirmar Senha *</Text>
          <TextInput style={s.input} value={confirmarSenha} onChangeText={setConfirmarSenha} placeholder="Repita a senha" placeholderTextColor={Colors.gray} secureTextEntry />
        </View>

        <TouchableOpacity style={s.btn} onPress={handleCadastro} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.matriz} />
          ) : (
            <Text style={s.btnText}>Cadastrar</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.matriz},
  content: {padding: 24, paddingBottom: 40},
  backText: {color: Colors.pulso, fontSize: 14, fontWeight: '600', marginBottom: 12},
  title: {fontSize: 24, fontWeight: '700', color: Colors.clareza},
  subtitle: {fontSize: 14, color: Colors.gray, marginBottom: 24},
  card: {backgroundColor: '#162433', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#1E3448', marginBottom: 16},
  sectionTitle: {fontSize: 15, fontWeight: '700', color: Colors.pulso, marginBottom: 8},
  label: {fontSize: 13, fontWeight: '600', color: Colors.gray, marginBottom: 6, marginTop: 14},
  input: {height: 48, backgroundColor: '#0F1F2E', borderRadius: 8, borderWidth: 1, borderColor: '#1E3448', paddingHorizontal: 14, color: Colors.clareza, fontSize: 15},
  row: {flexDirection: 'row'},
  btn: {height: 52, backgroundColor: Colors.pulso, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 8},
  btnText: {color: Colors.matriz, fontWeight: '700', fontSize: 16},
});
