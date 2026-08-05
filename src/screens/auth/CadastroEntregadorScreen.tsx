import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, StatusBar} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {Colors} from '../../theme/colors';
import {cadastrarEntregador} from '../../services/api';
import {useAlert} from '../../components/CustomAlert';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CadastroEntregador'>;
};

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

export default function CadastroEntregadorScreen({navigation}: Props) {
  const {show} = useAlert();

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCadastro = async () => {
    if (!nome || !cpf || !senha) {
      show({title: 'Atenção', message: 'Preencha nome, CPF e senha.', type: 'warning'});
      return;
    }
    if (senha.length < 8 || !/[A-Z]/.test(senha) || !/[0-9]/.test(senha)) {
      show({title: 'Atenção', message: 'A senha deve ter no mínimo 8 caracteres, com 1 letra maiúscula e 1 número.', type: 'warning'});
      return;
    }
    if (senha !== confirmarSenha) {
      show({title: 'Atenção', message: 'As senhas não coincidem.', type: 'warning'});
      return;
    }

    setLoading(true);
    const res = await cadastrarEntregador({
      nome,
      cpf: cpf.replace(/\D/g, ''),
      telefone: telefone.replace(/\D/g, '') || undefined,
      senha,
    });
    setLoading(false);

    if (res.success) {
      show({
        title: 'Conta criada!',
        message: 'Agora informe seu CPF pra empresa que você trabalha, pra ela te vincular. Depois é só fazer login aqui.',
        type: 'success',
        buttons: [{text: 'OK', onPress: () => navigation.replace('Login')}],
      });
    } else {
      show({title: 'Erro', message: res.error || 'Não foi possível criar a conta.', type: 'error'});
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
        <Text style={s.subtitle}>Cadastre-se como entregador/entregador</Text>

        <View style={s.card}>
          <Text style={s.label}>Nome completo *</Text>
          <TextInput style={s.input} value={nome} onChangeText={setNome} placeholder="Seu nome" placeholderTextColor={Colors.gray} />

          <Text style={s.label}>CPF *</Text>
          <TextInput style={s.input} value={cpf} onChangeText={v => setCpf(maskCpf(v))} placeholder="000.000.000-00" placeholderTextColor={Colors.gray} keyboardType="numeric" />
          <Text style={s.hint}>É esse CPF que você vai passar pra empresa te vincular depois.</Text>

          <Text style={s.label}>Telefone</Text>
          <TextInput style={s.input} value={telefone} onChangeText={v => setTelefone(maskTelefone(v))} placeholder="(00) 00000-0000" placeholderTextColor={Colors.gray} keyboardType="phone-pad" />

          <Text style={s.label}>Senha *</Text>
          <TextInput style={s.input} value={senha} onChangeText={setSenha} placeholder="Mínimo 8 caracteres" placeholderTextColor={Colors.gray} secureTextEntry />
          <Text style={s.hint}>Mínimo 8 caracteres, 1 letra maiúscula e 1 número.</Text>

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
  card: {backgroundColor: '#102255', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#1E3A6B', marginBottom: 16},
  label: {fontSize: 13, fontWeight: '600', color: Colors.gray, marginBottom: 6, marginTop: 14},
  hint: {fontSize: 11, color: Colors.gray, marginTop: 4},
  input: {height: 48, backgroundColor: '#081544', borderRadius: 8, borderWidth: 1, borderColor: '#1E3A6B', paddingHorizontal: 14, color: Colors.clareza, fontSize: 15},
  btn: {height: 52, backgroundColor: Colors.pulso, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 8},
  btnText: {color: Colors.matriz, fontWeight: '700', fontSize: 16},
});
