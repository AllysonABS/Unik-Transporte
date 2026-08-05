import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {Colors} from '../../theme/colors';
import {useAlert} from '../../components/CustomAlert';
import {solicitarRecuperacao, verificarCodigoRecuperacao, redefinirSenha} from '../../services/api';

function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EsqueceuSenha'>;
};

export default function EsqueceuSenhaScreen({navigation}: Props) {
  const {show} = useAlert();
  const [etapa, setEtapa] = useState<'email' | 'codigo' | 'novaSenha'>('email');
  const [cpf, setCpf] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [codigo, setCodigo] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const doc = cpf.replace(/\D/g, '');

  const enviarCodigo = async () => {
    if (!doc) {
      show({title: 'Atenção', message: 'Informe seu CPF.', type: 'warning'});
      return;
    }
    setLoading(true);
    const res = await solicitarRecuperacao(doc);
    setLoading(false);
    if (res.success) {
      if (res.email_hint) setEmailHint(res.email_hint);
      setEtapa('codigo');
    } else {
      show({title: 'Erro', message: res.error || 'Não foi possível enviar o código.', type: 'error'});
    }
  };

  const verificarCodigo = async () => {
    if (!codigo || codigo.length < 6) {
      show({title: 'Atenção', message: 'Digite o código de 6 dígitos.', type: 'warning'});
      return;
    }
    setLoading(true);
    const res = await verificarCodigoRecuperacao(doc, codigo);
    setLoading(false);
    if (res.success && res.reset_token) {
      setResetToken(res.reset_token);
      setEtapa('novaSenha');
    } else {
      show({title: 'Erro', message: res.error || 'Código inválido.', type: 'error'});
    }
  };

  const handleRedefinir = async () => {
    if (!novaSenha || novaSenha.length < 6) {
      show({title: 'Atenção', message: 'A senha deve ter no mínimo 6 caracteres.', type: 'warning'});
      return;
    }
    if (novaSenha !== confirmarSenha) {
      show({title: 'Atenção', message: 'As senhas não coincidem.', type: 'warning'});
      return;
    }
    setLoading(true);
    const res = await redefinirSenha(resetToken, novaSenha);
    setLoading(false);
    if (res.success) {
      show({title: 'Sucesso', message: 'Senha redefinida! Faça login com a nova senha.', type: 'success', buttons: [
        {text: 'OK', onPress: () => navigation.replace('Login')},
      ]});
    } else {
      show({title: 'Erro', message: res.error || 'Não foi possível redefinir a senha.', type: 'error'});
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.matriz} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.inner}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Voltar</Text>
        </TouchableOpacity>

        <View style={s.header}>
          <Text style={s.icon}>{etapa === 'email' ? '🔑' : etapa === 'codigo' ? '📩' : '🔒'}</Text>
          <Text style={s.title}>
            {etapa === 'email' && 'Recuperar senha'}
            {etapa === 'codigo' && 'Verificar código'}
            {etapa === 'novaSenha' && 'Nova senha'}
          </Text>
          <Text style={s.subtitle}>
            {etapa === 'email' && 'Informe seu CPF para receber o código de recuperação por e-mail.'}
            {etapa === 'codigo' && `Digite o código de 6 dígitos enviado para ${emailHint || 'seu e-mail'}.`}
            {etapa === 'novaSenha' && 'Crie uma nova senha para sua conta.'}
          </Text>
        </View>

        <View style={s.card}>
          {etapa === 'email' && (
            <>
              <Text style={s.label}>CPF</Text>
              <TextInput style={s.input} placeholder="000.000.000-00" placeholderTextColor={Colors.gray} value={cpf} onChangeText={v => setCpf(maskCpf(v))} keyboardType="numeric" />
              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={enviarCodigo} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color={Colors.clareza} /> : <Text style={s.btnText}>Enviar código</Text>}
              </TouchableOpacity>
            </>
          )}

          {etapa === 'codigo' && (
            <>
              <Text style={s.label}>Código de verificação</Text>
              <TextInput style={[s.input, s.inputCodigo]} placeholder="000000" placeholderTextColor={Colors.gray} value={codigo} onChangeText={setCodigo} keyboardType="numeric" maxLength={6} />
              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={verificarCodigo} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color={Colors.clareza} /> : <Text style={s.btnText}>Verificar</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setCodigo(''); enviarCodigo(); }} style={s.reenviar}>
                <Text style={s.reenviarText}>Reenviar código</Text>
              </TouchableOpacity>
            </>
          )}

          {etapa === 'novaSenha' && (
            <>
              <Text style={s.label}>Nova senha</Text>
              <TextInput style={s.input} placeholder="••••••••" placeholderTextColor={Colors.gray} value={novaSenha} onChangeText={setNovaSenha} secureTextEntry />
              <Text style={s.label}>Confirmar senha</Text>
              <TextInput style={s.input} placeholder="••••••••" placeholderTextColor={Colors.gray} value={confirmarSenha} onChangeText={setConfirmarSenha} secureTextEntry />
              {novaSenha && confirmarSenha && novaSenha !== confirmarSenha && (
                <Text style={s.erro}>As senhas não coincidem</Text>
              )}
              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleRedefinir} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color={Colors.clareza} /> : <Text style={s.btnText}>Redefinir senha</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={s.steps}>
          {['email', 'codigo', 'novaSenha'].map((e, i) => (
            <View key={e} style={[s.stepDot, etapa === e && s.stepDotAtivo, (['codigo', 'novaSenha'].indexOf(etapa) >= i) && s.stepDotDone]} />
          ))}
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:  {flex: 1, backgroundColor: Colors.matriz},
  inner:      {flex: 1, paddingHorizontal: 24, paddingVertical: 20, justifyContent: 'center'},
  backBtn:    {position: 'absolute', top: 20, left: 0},
  backText:   {color: Colors.pulso, fontSize: 15, fontWeight: '600'},
  header:     {alignItems: 'center', marginBottom: 32},
  icon:       {fontSize: 40, marginBottom: 16},
  title:      {fontSize: 24, fontWeight: '700', color: Colors.clareza, marginBottom: 8},
  subtitle:   {fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 20},
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  label:      {fontSize: 13, fontWeight: '600', color: Colors.clareza, marginBottom: 6, marginTop: 12},
  input:      {
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.clareza,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  inputCodigo:{textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: '700'},
  btn:        {height: 52, backgroundColor: Colors.pulso, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 24, shadowColor: Colors.pulso, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6},
  btnDisabled:{opacity: 0.7},
  btnText:    {color: Colors.clareza, fontSize: 16, fontWeight: '700'},
  reenviar:   {alignSelf: 'center', marginTop: 16},
  reenviarText:{color: Colors.pulso, fontSize: 13, fontWeight: '600'},
  erro:       {color: '#EF4444', fontSize: 12, marginTop: 6},
  steps:      {flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 32},
  stepDot:    {width: 8, height: 8, borderRadius: 4, backgroundColor: '#0B1E5A'},
  stepDotAtivo:{width: 24, backgroundColor: Colors.pulso},
  stepDotDone:{backgroundColor: Colors.pulso},
});
