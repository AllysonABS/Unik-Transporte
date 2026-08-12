import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {Colors} from '../../theme/colors';
import {loginEntregador} from '../../services/api';
import {useAuth} from '../../context/AuthContext';
import {useAlert} from '../../components/CustomAlert';
import Icon from '../../components/Icon';
import {hapticSuccess, hapticError} from '../../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

function LogoMark() {
  return (
    <Image
      source={require('../../assets/Logo.png')}
      style={logo.image}
      accessibilityLabel="Logo Unik Logística"
    />
  );
}

const logo = StyleSheet.create({
  image: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
});

function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export default function LoginScreen({navigation}: Props) {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lembrar, setLembrar] = useState(false);
  const [loading, setLoading] = useState(false);
  const {setEntregador, saveToken} = useAuth();
  const {show} = useAlert();

  useEffect(() => {
    AsyncStorage.getItem('lembrar_doc').then(doc => {
      if (doc) {
        setCpf(doc);
        setLembrar(true);
      }
    });
  }, []);

  const handleLogin = async () => {
    if (!cpf || !password) {
      show({title: 'Atenção', message: 'Preencha CPF e senha.', type: 'warning'});
      return;
    }
    setLoading(true);
    const doc = cpf.replace(/\D/g, '');

    try {
      const res = await loginEntregador(doc, password);

      if (lembrar) {
        await AsyncStorage.setItem('lembrar_doc', cpf);
      } else {
        await AsyncStorage.removeItem('lembrar_doc');
      }

      if (res.success && res.token) {
        await saveToken(res.token);
      }

      if (res.success && res.entregador) {
        hapticSuccess();
        setEntregador(res.entregador);
        navigation.replace('Entregador');
      } else {
        hapticError();
        show({title: 'Erro', message: res.error || 'Credenciais inválidas.', type: 'error'});
      }
    } catch {
      hapticError();
      show({title: 'Erro', message: 'Falha na conexão com o servidor.', type: 'error'});
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.matriz} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}>

        <View style={styles.header}>
          <LogoMark />
          <Text style={styles.appName}>Unik Logística</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entrar na sua conta</Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>CPF</Text>
            <TextInput
              style={styles.input}
              placeholder="000.000.000-00"
              placeholderTextColor={Colors.gray}
              value={cpf}
              onChangeText={v => setCpf(maskCpf(v))}
              keyboardType="numeric"
              autoCorrect={false}
              accessibilityLabel="Campo de CPF"
              accessibilityHint="Digite seu CPF para login"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={Colors.gray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                accessibilityLabel="Campo de senha"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                accessibilityRole="button">
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={Colors.gray} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.lembrarRow}
              onPress={() => setLembrar(!lembrar)}
              accessibilityRole="checkbox"
              accessibilityState={{checked: lembrar}}
              accessibilityLabel="Lembrar credenciais">
              <View style={[styles.checkbox, lembrar && styles.checkboxOn]}>
                {lembrar && <Icon name="check" size={14} color={Colors.clareza} />}
              </View>
              <Text style={styles.lembrarText}>Lembrar-se</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('EsqueceuSenha')}
              accessibilityRole="link"
              accessibilityLabel="Esqueceu a senha">
              <Text style={styles.forgotText}>Esqueceu a senha?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Entrar"
            accessibilityState={{disabled: loading}}>
            {loading ? (
              <ActivityIndicator color={Colors.clareza} />
            ) : (
              <Text style={styles.loginButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem uma conta? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CadastroEntregador')}
            accessibilityRole="link"
            accessibilityLabel="Ir para cadastro">
            <Text style={styles.footerLink}>Cadastre-se</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.matriz},
  inner: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {alignItems: 'center', paddingTop: 32, gap: 10},
  appName: {fontSize: 30, fontWeight: '700', color: Colors.clareza, letterSpacing: 0.5},
  tagline: {
    fontSize: 13,
    color: Colors.pulso,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
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
  cardTitle: {fontSize: 18, fontWeight: '700', color: Colors.clareza, marginBottom: 24},
  inputWrapper: {marginBottom: 16},
  label: {fontSize: 13, fontWeight: '600', color: Colors.clareza, marginBottom: 6},
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.clareza,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    height: 50,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.clareza,
  },
  eyeBtn: {paddingHorizontal: 14},
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  lembrarRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {backgroundColor: Colors.pulso, borderColor: Colors.pulso},
  lembrarText: {fontSize: 13, color: Colors.clareza, fontWeight: '500'},
  forgotText: {fontSize: 13, color: Colors.pulso, fontWeight: '600'},
  loginButton: {
    height: 52,
    backgroundColor: Colors.pulso,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.pulso,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  loginButtonDisabled: {opacity: 0.7},
  loginButtonText: {
    color: Colors.clareza,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 8,
  },
  footerText: {fontSize: 14, color: Colors.clareza},
  footerLink: {fontSize: 14, color: Colors.pulso, fontWeight: '700'},
});
